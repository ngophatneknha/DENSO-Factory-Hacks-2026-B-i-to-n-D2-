"""Conformal quantile calibration (CQR / ACI) according to proposal §7 (R06, R07).

Calibrates nominal 80% intervals [q10, q90] to achieve exact empirical finite-sample coverage
on validation/calibration slices.
"""
from __future__ import annotations

from typing import Tuple, Dict
import numpy as np


class ConformalCalibrator:
    def __init__(self, target_coverage: float = 0.80):
        self.target_coverage = target_coverage
        self.calibrated_offset: float = 0.0
        self.cal_coverage: float = 0.80

    def fit(self, y_cal: np.ndarray, q10_cal: np.ndarray, q90_cal: np.ndarray):
        y = np.asarray(y_cal, dtype=float)
        q10 = np.asarray(q10_cal, dtype=float)
        q90 = np.asarray(q90_cal, dtype=float)
        n = len(y)
        if n == 0:
            return

        # Non-conformity scores: distance outside the interval (negative if inside)
        scores = np.maximum(q10 - y, y - q90)
        
        # Conformal quantile level
        level = np.clip(np.ceil((n + 1) * self.target_coverage) / n, 0.0, 1.0)
        self.calibrated_offset = float(np.quantile(scores, level, method="higher"))

        # Measure empirical coverage on calibration set with offset
        cal_cov = np.mean((y >= (q10 - self.calibrated_offset)) & (y <= (q90 + self.calibrated_offset)))
        self.cal_coverage = float(cal_cov)

    def calibrate(self, q10: np.ndarray, q90: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        cal_q10 = np.clip(q10 - self.calibrated_offset, 0, None)
        cal_q90 = np.clip(q90 + self.calibrated_offset, cal_q10, None)
        return cal_q10, cal_q90

    def summary(self) -> Dict[str, float]:
        return {
            "target_coverage": self.target_coverage,
            "calibrated_offset": round(self.calibrated_offset, 2),
            "cal_coverage": round(self.cal_coverage, 4),
        }
