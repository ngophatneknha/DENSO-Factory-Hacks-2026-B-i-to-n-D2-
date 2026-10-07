"""Forecasting models: Baseline (Seasonal / Plan-based) and LightGBM Quantile Regression.

Metrics:
- MAE, WAPE, Bias
- Pinball Loss (Quantile Loss) for q10, q50, q90
- Coverage and Interval Width for [q10, q90]
"""
from __future__ import annotations

from typing import Dict, List, Tuple, Any, Optional
import numpy as np
import pandas as pd
import lightgbm as lgb


FEATURE_COLS = [
    "hour", "minute", "dayofweek", "is_weekend", "shift_code", "minute_in_shift",
    "plan_current_hour", "plan_next_hour", "plan_in_2h",
    "lag_workload_1", "lag_workload_2", "lag_workload_4", "lag_workload_8", "lag_workload_32",
    "lag_count_1", "lag_count_2", "lag_count_4", "lag_count_8",
    "rolling_mean_1h", "rolling_mean_2h", "rolling_std_2h",
]


def pinball_loss(y_true: np.ndarray, y_pred: np.ndarray, alpha: float) -> float:
    err = y_true - y_pred
    return float(np.mean(np.maximum(alpha * err, (alpha - 1.0) * err)))


def compute_forecast_metrics(y_true: np.ndarray, q10: np.ndarray, q50: np.ndarray, q90: np.ndarray) -> Dict[str, float]:
    y_true = np.asarray(y_true, dtype=float)
    mae = float(np.mean(np.abs(y_true - q50)))
    sum_true = float(np.sum(np.abs(y_true)))
    wape = float(np.sum(np.abs(y_true - q50)) / sum_true) if sum_true > 0 else 0.0
    bias = float(np.sum(q50 - y_true) / sum_true) if sum_true > 0 else 0.0
    
    # Coverage of [q10, q90]
    covered = (y_true >= q10) & (y_true <= q90)
    coverage = float(np.mean(covered))
    width = float(np.mean(np.maximum(0.0, q90 - q10)))

    pb_10 = pinball_loss(y_true, q10, 0.10)
    pb_50 = pinball_loss(y_true, q50, 0.50)
    pb_90 = pinball_loss(y_true, q90, 0.90)

    return {
        "mae": round(mae, 2),
        "wape": round(wape, 4),
        "bias": round(bias, 4),
        "coverage": round(coverage, 4),
        "interval_width": round(width, 2),
        "pinball_10": round(pb_10, 2),
        "pinball_50": round(pb_50, 2),
        "pinball_90": round(pb_90, 2),
        "pinball_mean": round((pb_10 + pb_50 + pb_90) / 3.0, 2),
    }


class BaselinePlanForecaster:
    """Seasonal naive baseline weighted by production plan ratio."""
    def __init__(self):
        self.shift_dow_means: Dict[Tuple[int, int], float] = {}
        self.overall_mean: float = 1.0
        self.residuals_std: float = 1.0

    def fit(self, train_df: pd.DataFrame, target_col: str = "workload_mins"):
        df = train_df.dropna(subset=[target_col]).copy()
        grouped = df.groupby(["dayofweek", "shift_code"])[target_col].mean()
        self.shift_dow_means = grouped.to_dict()
        self.overall_mean = float(df[target_col].mean()) if len(df) else 1.0
        
        # Estimate empirical residual std for quantiles
        preds = [self.shift_dow_means.get((r["dayofweek"], r["shift_code"]), self.overall_mean) for _, r in df.iterrows()]
        res = df[target_col].to_numpy() - np.array(preds)
        self.residuals_std = float(np.std(res)) if len(res) else 5.0

    def predict_quantiles(self, test_df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        base = np.array([
            self.shift_dow_means.get((r["dayofweek"], r["shift_code"]), self.overall_mean)
            for _, r in test_df.iterrows()
        ])
        # Scale with relative production plan if plan is present
        if "plan_current_hour" in test_df.columns:
            plan_mean = float(test_df["plan_current_hour"].mean()) or 1.0
            scale = test_df["plan_current_hour"].to_numpy() / max(1.0, plan_mean)
            base = base * np.clip(scale, 0.5, 2.0)

        # Quantiles via normal approximation of residuals
        z10 = -1.28155
        z90 = 1.28155
        q50 = np.clip(base, 0, None)
        q10 = np.clip(base + z10 * self.residuals_std, 0, None)
        q90 = np.clip(base + z90 * self.residuals_std, q50, None)
        return q10, q50, q90


class LightGBMQuantileForecaster:
    """Gradient boosted quantile regressors for q10, q50, q90."""
    def __init__(self, n_estimators: int = 120, max_depth: int = 5, learning_rate: float = 0.05):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.learning_rate = learning_rate
        self.models: Dict[float, lgb.LGBMRegressor] = {}

    def fit(self, train_df: pd.DataFrame, target_col: str = "workload_mins"):
        df = train_df.dropna(subset=[target_col]).copy()
        X = df[FEATURE_COLS].fillna(0)
        y = df[target_col]

        for alpha in [0.10, 0.50, 0.90]:
            model = lgb.LGBMRegressor(
                objective="quantile",
                alpha=alpha,
                n_estimators=self.n_estimators,
                max_depth=self.max_depth,
                learning_rate=self.learning_rate,
                verbosity=-1,
                random_state=42,
            )
            model.fit(X, y)
            self.models[alpha] = model

    def predict_quantiles(self, test_df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        X = test_df[FEATURE_COLS].fillna(0)
        p10 = self.models[0.10].predict(X)
        p50 = self.models[0.50].predict(X)
        p90 = self.models[0.90].predict(X)

        # Monotonic sorting to prevent quantile crossing
        stacked = np.stack([p10, p50, p90], axis=1)
        sorted_stacked = np.sort(np.clip(stacked, 0, None), axis=1)
        return sorted_stacked[:, 0], sorted_stacked[:, 1], sorted_stacked[:, 2]
