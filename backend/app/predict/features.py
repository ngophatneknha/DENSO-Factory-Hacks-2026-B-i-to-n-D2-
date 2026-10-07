"""Feature engineering for workload forecasting without data leakage.

Time granularity: 15-minute buckets.
Targets:
- workload_mins: total standard work minutes created in this bucket
- req_count: number of material supply requests created in this bucket
"""
from __future__ import annotations

from typing import Tuple, Optional
import numpy as np
import pandas as pd

from ..domain import FactoryConfig, BUCKET_MIN, shift_of_hour
from ..data.synthetic import plan_as_of, std_times


def aggregate_buckets(
    cfg: FactoryConfig,
    requests: pd.DataFrame,
    t_start: pd.Timestamp,
    t_end: pd.Timestamp,
) -> pd.DataFrame:
    """Bucket requests into 15-min intervals and calculate total standard workload minutes."""
    buckets = pd.date_range(t_start, t_end - pd.Timedelta(minutes=BUCKET_MIN), freq=f"{BUCKET_MIN}min")
    df = pd.DataFrame({"bucket_start": buckets})

    if len(requests) == 0:
        df["req_count"] = 0
        df["workload_mins"] = 0.0
        return df

    # Compute standard times for all requests
    stds = std_times(cfg, requests)
    req = requests.copy()
    req["std_mins"] = stds["pick_std"] + stds["load_std"] + (cfg.avg_trip_min() / cfg.tugger_capacity)
    req["bucket"] = req["created_at"].dt.floor(f"{BUCKET_MIN}min")

    agg = req.groupby("bucket").agg(
        req_count=("request_id", "count"),
        workload_mins=("std_mins", "sum")
    ).reset_index()

    df = df.merge(agg, left_on="bucket_start", right_on="bucket", how="left").drop(columns=["bucket"])
    df["req_count"] = df["req_count"].fillna(0).astype(int)
    df["workload_mins"] = df["workload_mins"].fillna(0.0)
    return df


def build_features(
    cfg: FactoryConfig,
    bucket_df: pd.DataFrame,
    plan: pd.DataFrame,
    as_of: pd.Timestamp,
) -> pd.DataFrame:
    """Build features for each bucket using strictly information known at `as_of`."""
    df = bucket_df.copy()
    
    # 1. Temporal features
    b_starts = pd.to_datetime(df["bucket_start"])
    df["hour"] = b_starts.dt.hour
    df["minute"] = b_starts.dt.minute
    df["dayofweek"] = b_starts.dt.dayofweek
    df["is_weekend"] = (df["dayofweek"] >= 5).astype(int)
    df["shift_id"] = [shift_of_hour(h) for h in df["hour"]]
    shift_start_h = np.select(
        [(df["hour"] >= 6) & (df["hour"] < 14), (df["hour"] >= 14) & (df["hour"] < 22)],
        [6, 14], 22
    )
    df["minute_in_shift"] = (df["hour"] - shift_start_h) % 24 * 60 + df["minute"]

    # 2. Production plan features as of `as_of` (no future revision leakage)
    current_plan = plan_as_of(plan, as_of)
    hourly_plan = current_plan.groupby("hour_start")["planned_qty"].sum().to_dict()

    hour_floors = b_starts.dt.floor("h")
    df["plan_current_hour"] = [hourly_plan.get(h, 0.0) for h in hour_floors]
    df["plan_next_hour"] = [hourly_plan.get(h + pd.Timedelta(hours=1), 0.0) for h in hour_floors]
    df["plan_in_2h"] = [hourly_plan.get(h + pd.Timedelta(hours=2), 0.0) for h in hour_floors]

    # 3. Lags and rolling metrics (only meaningful on historical sequences)
    # Lags of workload_mins
    for lag_steps in [1, 2, 4, 8, 32]:  # 15m, 30m, 1h, 2h, 8h (1 shift)
        df[f"lag_workload_{lag_steps}"] = df["workload_mins"].shift(lag_steps)
        df[f"lag_count_{lag_steps}"] = df["req_count"].shift(lag_steps)

    df["rolling_mean_1h"] = df["workload_mins"].shift(1).rolling(4, min_periods=1).mean()
    df["rolling_mean_2h"] = df["workload_mins"].shift(1).rolling(8, min_periods=1).mean()
    df["rolling_std_2h"] = df["workload_mins"].shift(1).rolling(8, min_periods=1).std().fillna(0)

    # Encode categorical shift_id
    shift_map = {"S1": 0, "S2": 1, "S3": 2}
    df["shift_code"] = df["shift_id"].map(shift_map)

    return df
