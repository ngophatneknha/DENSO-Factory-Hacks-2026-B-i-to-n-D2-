"""Helper to construct the request pool for what-if simulation horizons."""
from __future__ import annotations

import numpy as np
import pandas as pd

from ..domain import FactoryConfig, default_config
from ..data.synthetic import generate_requests, final_plan, std_times


def prepare_horizon_requests(
    cfg: FactoryConfig,
    plan: pd.DataFrame,
    snapshot: pd.DataFrame,
    t_start: pd.Timestamp,
    t_end: pd.Timestamp,
    seed: int = 42,
    existing_requests: pd.DataFrame | None = None,
) -> pd.DataFrame:
    """Combine WIP snapshot with upcoming requests generated from the production plan."""
    # 1. Open work from snapshot that is already in progress at t_start
    snap_rows = []
    if snapshot is not None and len(snapshot) > 0:
        s = snapshot.copy()
        s["start_stage"] = s.get("stage", "picking")
        snap_rows.append(s)

    # 2. Upcoming requests: if existing_requests contains future records, use them;
    # otherwise generate future arrivals from production plan for [t_start, t_end]
    future_req = pd.DataFrame()
    if existing_requests is not None and len(existing_requests) > 0:
        future_req = existing_requests[
            (existing_requests["created_at"] >= t_start) & (existing_requests["created_at"] < t_end)
        ].copy()

    if len(future_req) == 0:
        pf = final_plan(plan)
        rng = np.random.default_rng(seed)
        future_req = generate_requests(cfg, pf, t_start, t_end, rng, id_prefix="FUT")

    future_req["start_stage"] = "picking"

    if snap_rows:
        snap_df = pd.concat(snap_rows, ignore_index=True)
        # Ensure compatible columns
        common_cols = ["request_id", "line_id", "item_group", "n_lines", "quantity", "unit", "created_at", "due_at", "start_stage"]
        all_req = pd.concat([snap_df[common_cols], future_req[common_cols]], ignore_index=True)
    else:
        all_req = future_req

    return all_req
