"""Effective capacity computation per 15-minute bucket per stage.

Considers:
- Resource calendar (scheduled shifts, breaks)
- Cross-skilling (workers available for multiple stages)
- Efficiency factor (e.g. 0.9 usable work time)
- Known disruptions (e.g. planned maintenance, recorded absences)
- Docks limit and tugger availability
"""
from __future__ import annotations

from typing import Dict, List, Optional
import numpy as np
import pandas as pd

from ..domain import FactoryConfig, BUCKET_MIN, STAGES
from ..sim.schedule import build_specs, to_min, Adjustments


def compute_effective_capacity(
    cfg: FactoryConfig,
    calendar: pd.DataFrame,
    disruptions: pd.DataFrame,
    t0: pd.Timestamp,
    horizon_min: float,
    adj: Optional[Adjustments] = None,
    resources: Optional[pd.DataFrame] = None,
) -> pd.DataFrame:
    """Return DataFrame indexed by 15-minute buckets with available capacity (in standard minutes)."""
    workers, tuggers, params, _ = build_specs(
        cfg=cfg,
        calendar=calendar,
        disruptions=disruptions,
        t0=t0,
        horizon_min=horizon_min,
        adj=adj,
        resources=resources
    )

    n_buckets = int(horizon_min // BUCKET_MIN)
    bucket_starts = [t0 + pd.Timedelta(minutes=i * BUCKET_MIN) for i in range(n_buckets)]
    
    # Store capacities per stage
    cap_pick = np.zeros(n_buckets)
    cap_load = np.zeros(n_buckets)
    cap_trans = np.zeros(n_buckets)
    
    # Calculate worker capacities
    for b_idx in range(n_buckets):
        b_s = b_idx * BUCKET_MIN
        b_e = (b_idx + 1) * BUCKET_MIN
        
        # Workers (picking, loading)
        for w in workers:
            for s, e, st in w.segments:
                overlap = max(0.0, min(e, b_e) - max(s, b_s))
                if overlap > 0:
                    effective_mins = overlap * cfg.efficiency
                    if st == "picking":
                        cap_pick[b_idx] += effective_mins
                    elif st == "loading":
                        cap_load[b_idx] += effective_mins
        
        # Docks constraint on loading: at most docks * BUCKET_MIN minutes of loading capacity
        max_dock_mins = cfg.docks * BUCKET_MIN
        cap_load[b_idx] = min(cap_load[b_idx], max_dock_mins)

        # Tuggers (transport capacity in equivalent request-handling minutes)
        for tg in tuggers:
            for s, e in tg.windows:
                overlap = max(0.0, min(e, b_e) - max(s, b_s))
                if overlap > 0:
                    # Tugger cycle time & capacity -> equivalent work minutes
                    cap_trans[b_idx] += overlap * cfg.efficiency

    df = pd.DataFrame({
        "bucket_start": bucket_starts,
        "bucket_index": range(n_buckets),
        "capacity_picking": cap_pick,
        "capacity_loading": cap_load,
        "capacity_transport": cap_trans,
        "total_capacity": cap_pick + cap_load + cap_trans,
    })
    return df
