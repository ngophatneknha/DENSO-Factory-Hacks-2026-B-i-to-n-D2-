"""Scenario trajectory generator via block bootstrap of empirical residuals.

Ref: Proposal §7:
'Simulator cần cả chuỗi nhu cầu và mối liên hệ giữa các khu vực...
Lấy mẫu các khối sai số liên tiếp (block bootstrap) trên tập hiệu chỉnh,
cộng vào dự báo theo ngữ cảnh, rồi áp dụng ràng buộc không âm.'
"""
from __future__ import annotations

from typing import List, Dict, Any
import numpy as np
import pandas as pd


def generate_scenarios(
    q50_forecast: np.ndarray,
    residuals_pool: np.ndarray,
    n_scenarios: int = 20,
    block_size: int = 4,  # 4 buckets = 1 hour contiguous block
    seed: int = 42,
) -> np.ndarray:
    """Generate M trajectory scenarios of shape (n_scenarios, horizon_steps)."""
    horizon_steps = len(q50_forecast)
    res = np.asarray(residuals_pool, dtype=float)
    if len(res) < block_size:
        res = np.zeros(block_size * 2)

    rng = np.random.default_rng(seed)
    max_start = len(res) - block_size
    n_blocks_needed = int(np.ceil(horizon_steps / block_size))

    scenarios = np.zeros((n_scenarios, horizon_steps))

    for m in range(n_scenarios):
        # Sample consecutive blocks of residuals
        starts = rng.integers(0, max_start + 1, size=n_blocks_needed)
        blocks = [res[s:s + block_size] for s in starts]
        sampled_res = np.concatenate(blocks)[:horizon_steps]
        
        # Scenario trajectory = median forecast + sampled residual block
        trajectory = np.clip(q50_forecast + sampled_res, 0.0, None)
        scenarios[m, :] = trajectory

    return scenarios
