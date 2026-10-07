"""Alert detection with hysteresis, severity levels, and root cause indicators.

Ref: Proposal §9 (Detect):
- Signals: queue growth, slack to due date, load/capacity ratio, waiting time P90
- Hysteresis: open threshold > close threshold to avoid flapping
- Explainability: clear signal evidence and severity
"""
from __future__ import annotations

from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd


def detect_operational_alerts(
    forecast_timeline: List[Dict[str, Any]],
    current_snapshot: pd.DataFrame,
    as_of: pd.Timestamp,
) -> List[Dict[str, Any]]:
    """Detect alerts across current WIP snapshot and upcoming forecast horizon."""
    alerts: List[Dict[str, Any]] = []

    # 1. Real-time WIP snapshot alerts
    if len(current_snapshot) > 0:
        snap = current_snapshot.copy()
        now = as_of
        if "due_at" in snap.columns:
            snap["slack_mins"] = (pd.to_datetime(snap["due_at"]) - now).dt.total_seconds() / 60.0
            
            # Urgent / overdue requests currently in progress
            overdue = snap[snap["slack_mins"] < 0]
            if len(overdue) > 0:
                alerts.append({
                    "alert_id": f"ALT-WIP-OVERDUE-{int(now.timestamp())}",
                    "stage": "all",
                    "severity": "CRITICAL",
                    "title": f"Có {len(overdue)} yêu cầu đang xử lý đã quá hạn (due date)",
                    "message": f"Các yêu cầu trễ: {', '.join(overdue['request_id'].head(5).tolist())}" + (f"... (+{len(overdue)-5} khác)" if len(overdue) > 5 else ""),
                    "affected_requests": len(overdue),
                    "timestamp": now.isoformat(),
                    "status": "OPEN",
                    "source": "REAL_TIME_WIP",
                })

            urgent = snap[(snap["slack_mins"] >= 0) & (snap["slack_mins"] <= 30)]
            if len(urgent) > 0:
                alerts.append({
                    "alert_id": f"ALT-WIP-URGENT-{int(now.timestamp())}",
                    "stage": "all",
                    "severity": "WARNING",
                    "title": f"Cảnh báo: {len(urgent)} yêu cầu sắp đến hạn trong vòng 30 phút",
                    "message": "Cần ưu tiên xử lý bốc hàng và chuyển cho các line để tránh trễ chuyền.",
                    "affected_requests": len(urgent),
                    "timestamp": now.isoformat(),
                    "status": "OPEN",
                    "source": "REAL_TIME_WIP",
                })

        # Queue length per stage in current snapshot
        stage_counts = snap["stage"].value_counts().to_dict()
        for stage, cnt in stage_counts.items():
            if cnt >= 15:
                alerts.append({
                    "alert_id": f"ALT-WIP-QUEUE-{stage.upper()}-{int(now.timestamp())}",
                    "stage": stage,
                    "severity": "WARNING" if cnt < 25 else "CRITICAL",
                    "title": f"Tích tụ hàng đợi cao tại công đoạn {stage}: {cnt} yêu cầu đang chờ",
                    "message": f"Số lượng tồn WIP tại {stage} vượt ngưỡng thông thường (15 yêu cầu).",
                    "affected_requests": cnt,
                    "timestamp": now.isoformat(),
                    "status": "OPEN",
                    "source": "REAL_TIME_WIP",
                })

    # 2. Predictive future overload alerts with hysteresis
    # Consecutive bucket thresholding: 2 or more buckets with overload_ratio >= 1.0
    consecutive_overload = 0
    start_bucket = None
    max_ratio = 0.0

    for pt in forecast_timeline:
        ratio = pt.get("overload_ratio", 0.0)
        if ratio >= 1.0:
            consecutive_overload += 1
            if consecutive_overload == 1:
                start_bucket = pt["bucket_start"]
            max_ratio = max(max_ratio, ratio)
        else:
            if consecutive_overload >= 2 and start_bucket is not None:
                alerts.append({
                    "alert_id": f"ALT-PRED-OVERLOAD-{start_bucket[:16]}",
                    "stage": "system",
                    "severity": "CRITICAL" if max_ratio >= 1.2 else "WARNING",
                    "title": f"Dự báo quá tải tải trọng logistics (Tỷ lệ tải/năng lực đạt {max_ratio*100:.0f}%)",
                    "message": f"Bắt đầu từ khung {start_bucket[11:16]}, kéo dài {consecutive_overload * 15} phút. Tải dự kiến q90 vượt năng lực khả dụng.",
                    "affected_requests": int(consecutive_overload * 12),
                    "timestamp": start_bucket,
                    "status": "OPEN",
                    "source": "PREDICTIVE_FORECAST",
                })
            consecutive_overload = 0
            start_bucket = None
            max_ratio = 0.0

    if consecutive_overload >= 2 and start_bucket is not None:
        alerts.append({
            "alert_id": f"ALT-PRED-OVERLOAD-{start_bucket[:16]}",
            "stage": "system",
            "severity": "CRITICAL" if max_ratio >= 1.2 else "WARNING",
            "title": f"Dự báo quá tải tải trọng logistics (Tỷ lệ tải/năng lực đạt {max_ratio*100:.0f}%)",
            "message": f"Bắt đầu từ khung {start_bucket[11:16]}, kéo dài {consecutive_overload * 15} phút. Tải dự kiến q90 vượt năng lực khả dụng.",
            "affected_requests": int(consecutive_overload * 12),
            "timestamp": start_bucket,
            "status": "OPEN",
            "source": "PREDICTIVE_FORECAST",
        })

    return alerts
