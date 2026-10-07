"""Predict engine orchestrator: trains models, runs backtest, and predicts upcoming shift/day."""
from __future__ import annotations

from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd

from ..domain import FactoryConfig, default_config, BUCKET_MIN
from .features import aggregate_buckets, build_features
from .capacity import compute_effective_capacity
from .models import (
    BaselinePlanForecaster,
    LightGBMQuantileForecaster,
    compute_forecast_metrics,
)
from .conformal import ConformalCalibrator
from .scenarios import generate_scenarios


class PredictEngine:
    def __init__(self, cfg: Optional[FactoryConfig] = None):
        self.cfg = cfg or default_config()
        self.baseline_model = BaselinePlanForecaster()
        self.lgb_model = LightGBMQuantileForecaster()
        self.calibrator = ConformalCalibrator(target_coverage=0.80)
        self.residuals_pool: np.ndarray = np.array([])
        self.backtest_results: Dict[str, Any] = {}
        self.is_trained: bool = False

    def train_and_backtest(
        self,
        requests: pd.DataFrame,
        plan: pd.DataFrame,
        as_of: pd.Timestamp,
        n_test_days: int = 14,
        n_cal_days: int = 14,
    ) -> Dict[str, Any]:
        """Split historical data up to as_of into train, calibration, and test slices."""
        t_min = requests["created_at"].min().floor("h")
        t_max = as_of

        # 1. Bucket and extract features
        buckets = aggregate_buckets(self.cfg, requests, t_min, t_max)
        feat_df = build_features(self.cfg, buckets, plan, as_of)

        # 2. Split strictly chronologically: train -> calibration -> test
        t_test_start = t_max - pd.Timedelta(days=n_test_days)
        t_cal_start = t_test_start - pd.Timedelta(days=n_cal_days)

        train_mask = feat_df["bucket_start"] < t_cal_start
        cal_mask = (feat_df["bucket_start"] >= t_cal_start) & (feat_df["bucket_start"] < t_test_start)
        test_mask = feat_df["bucket_start"] >= t_test_start

        train_df = feat_df[train_mask]
        cal_df = feat_df[cal_mask]
        test_df = feat_df[test_mask]

        if len(train_df) < 100 or len(test_df) < 32:
            raise ValueError("Không đủ dữ liệu lịch sử để huấn luyện và backtest.")

        # 3. Fit Baseline & LightGBM
        self.baseline_model.fit(train_df)
        self.lgb_model.fit(train_df)

        # 4. Calibration step on cal_df
        q10_cal, q50_cal, q90_cal = self.lgb_model.predict_quantiles(cal_df)
        y_cal = cal_df["workload_mins"].to_numpy()
        self.calibrator.fit(y_cal, q10_cal, q90_cal)
        
        # Save residuals for scenario generation
        self.residuals_pool = y_cal - q50_cal

        # 5. Evaluate Backtest on unseen test_df
        y_test = test_df["workload_mins"].to_numpy()
        
        # Baseline metrics
        b_q10, b_q50, b_q90 = self.baseline_model.predict_quantiles(test_df)
        baseline_metrics = compute_forecast_metrics(y_test, b_q10, b_q50, b_q90)

        # LightGBM Raw metrics
        l_q10, l_q50, l_q90 = self.lgb_model.predict_quantiles(test_df)
        lgb_raw_metrics = compute_forecast_metrics(y_test, l_q10, l_q50, l_q90)

        # LightGBM Calibrated metrics
        c_q10, c_q90 = self.calibrator.calibrate(l_q10, l_q90)
        lgb_cal_metrics = compute_forecast_metrics(y_test, c_q10, l_q50, c_q90)

        self.backtest_results = {
            "test_period": f"{t_test_start.date()} -> {t_max.date()}",
            "n_test_buckets": len(test_df),
            "baseline": baseline_metrics,
            "lightgbm_raw": lgb_raw_metrics,
            "lightgbm_calibrated": lgb_cal_metrics,
            "conformal_summary": self.calibrator.summary(),
            "wape_improvement_pct": round(
                (baseline_metrics["wape"] - lgb_raw_metrics["wape"]) / max(1e-4, baseline_metrics["wape"]) * 100.0, 1
            ),
        }
        self.is_trained = True
        return self.backtest_results

    def forecast_upcoming(
        self,
        requests: pd.DataFrame,
        plan: pd.DataFrame,
        calendar: pd.DataFrame,
        disruptions: pd.DataFrame,
        as_of: pd.Timestamp,
        horizon_hours: int = 8,  # 8 hours = 1 shift, 24 hours = 1 day
        n_scenarios: int = 20,
    ) -> Dict[str, Any]:
        """Generate forecasts and capacity match for the upcoming horizon from as_of."""
        if not self.is_trained:
            self.train_and_backtest(requests, plan, as_of)

        horizon_min = horizon_hours * 60
        t_end = as_of + pd.Timedelta(minutes=horizon_min)
        
        # 1. Generate future buckets and features
        future_buckets = pd.DataFrame({
            "bucket_start": pd.date_range(as_of, t_end - pd.Timedelta(minutes=BUCKET_MIN), freq=f"{BUCKET_MIN}min"),
            "workload_mins": 0.0,
            "req_count": 0,
        })
        
        # Use recent history to seed lag features
        recent_requests = requests[requests["created_at"] >= (as_of - pd.Timedelta(hours=12))]
        hist_buckets = aggregate_buckets(self.cfg, recent_requests, as_of - pd.Timedelta(hours=12), as_of)
        
        combined = pd.concat([hist_buckets, future_buckets], ignore_index=True)
        feat_df = build_features(self.cfg, combined, plan, as_of)
        
        # Slice only the future part
        future_feat = feat_df[feat_df["bucket_start"] >= as_of].reset_index(drop=True)

        # 2. Predict quantiles
        raw_q10, raw_q50, raw_q90 = self.lgb_model.predict_quantiles(future_feat)
        cal_q10, cal_q90 = self.calibrator.calibrate(raw_q10, raw_q90)

        # 3. Compute effective capacity
        cap_df = compute_effective_capacity(self.cfg, calendar, disruptions, as_of, horizon_min)

        # 4. Generate M future scenarios
        scenarios = generate_scenarios(raw_q50, self.residuals_pool, n_scenarios=n_scenarios, seed=42)

        # 5. Format results
        timeline: List[Dict[str, Any]] = []
        for i, row in future_feat.iterrows():
            c_row = cap_df.iloc[i]
            tot_cap = float(c_row["total_capacity"])
            q50_val = float(raw_q50[i])
            q10_val = float(cal_q10[i])
            q90_val = float(cal_q90[i])
            load_ratio = round(q50_val / max(1.0, tot_cap), 2)

            timeline.append({
                "bucket_start": row["bucket_start"].isoformat(),
                "hour": int(row["hour"]),
                "minute": int(row["minute"]),
                "shift_id": row["shift_id"],
                "q10": round(q10_val, 1),
                "q50": round(q50_val, 1),
                "q90": round(q90_val, 1),
                "capacity": round(tot_cap, 1),
                "capacity_picking": round(float(c_row["capacity_picking"]), 1),
                "capacity_loading": round(float(c_row["capacity_loading"]), 1),
                "capacity_transport": round(float(c_row["capacity_transport"]), 1),
                "overload_ratio": load_ratio,
                "is_risk": bool(load_ratio >= 1.0 or q90_val > tot_cap),
            })

        return {
            "as_of": as_of.isoformat(),
            "horizon_hours": horizon_hours,
            "timeline": timeline,
            "scenarios": scenarios.round(1).tolist(),
            "backtest": self.backtest_results,
        }
