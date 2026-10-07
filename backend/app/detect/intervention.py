"""Intervention Impact Bottleneck Detection vs Utilization (Ref: Proposal §8, Hypothesis H2).

Instead of assuming the busiest stage (highest utilization) is the bottleneck, this module runs
fast marginal interventions (+1 helper or +30m resource in simulation) and measures the actual
reduction in total downstream operational loss.
"""
from __future__ import annotations

from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd

from ..domain import FactoryConfig, default_config
from ..sim.engine import SimInput, run_simulation, compute_kpis
from ..sim.schedule import build_specs, Adjustments
from ..data.synthetic import std_times


def compute_intervention_impact(
    cfg: FactoryConfig,
    base_requests: pd.DataFrame,
    calendar: pd.DataFrame,
    disruptions: pd.DataFrame,
    t0: pd.Timestamp,
    horizon_min: float = 480.0,
    seed: int = 42,
) -> Dict[str, Any]:
    """Compare bottleneck identification by Utilization vs by Marginal Intervention Impact."""
    # Prepare simulation input
    sim_req = pd.concat([
        base_requests[["request_id", "line_id", "item_group", "n_lines"]],
        std_times(cfg, base_requests)
    ], axis=1)
    sim_req["arrival_min"] = (base_requests["created_at"] - t0).dt.total_seconds() / 60.0
    sim_req["due_min"] = (base_requests["due_at"] - t0).dt.total_seconds() / 60.0
    sim_req["start_stage"] = base_requests.get("stage", "picking")

    # 1. Run Base Simulation
    workers_base, tuggers_base, params_base, _ = build_specs(
        cfg=cfg, calendar=calendar, disruptions=disruptions, t0=t0, horizon_min=horizon_min
    )
    res_base = run_simulation(SimInput(horizon_min, sim_req, workers_base, tuggers_base, params_base, seed=seed))
    kpi_base = compute_kpis(res_base, 0.0, horizon_min)
    base_late_min = kpi_base["late_minutes"]
    base_loss_vnd = base_late_min * cfg.cost.late_minute_vnd

    # Base utilizations
    util_pick = kpi_base["utilization"].get("picking") or 0.0
    util_load = kpi_base["utilization"].get("loading") or 0.0
    util_trans = kpi_base["utilization"].get("transport") or 0.0

    # 2. Test marginal intervention at each stage
    # Intervention window: middle 4 hours of the shift (min 120 to min 360)
    int_start = t0 + pd.Timedelta(minutes=120)
    int_end = t0 + pd.Timedelta(minutes=360)
    int_duration_hours = 4.0

    stages_test = [
        {
            "stage": "picking",
            "name": "Chuẩn bị hàng (Picking)",
            "action": Adjustments(temps=[{"stage": "picking", "start": int_start, "end": int_end, "n": 1}]),
            "cost_vnd": int_duration_hours * cfg.cost.temp_worker_hour_vnd,
            "utilization": util_pick,
        },
        {
            "stage": "loading",
            "name": "Bốc hàng lên dock (Loading)",
            "action": Adjustments(temps=[{"stage": "loading", "start": int_start, "end": int_end, "n": 1}]),
            "cost_vnd": int_duration_hours * cfg.cost.temp_worker_hour_vnd,
            "utilization": util_load,
        },
        {
            "stage": "transport",
            "name": "Tugger vận chuyển (Transport)",
            "action": Adjustments(extra_tuggers=[{"start": int_start, "end": int_end}]),
            "cost_vnd": int_duration_hours * cfg.cost.spare_tugger_hour_vnd,
            "utilization": util_trans,
        },
    ]

    results = []
    for test in stages_test:
        w_test, t_test, p_test, _ = build_specs(
            cfg=cfg, calendar=calendar, disruptions=disruptions, t0=t0, horizon_min=horizon_min, adj=test["action"]
        )
        res_test = run_simulation(SimInput(horizon_min, sim_req, w_test, t_test, p_test, seed=seed))
        kpi_test = compute_kpis(res_test, 0.0, horizon_min)
        
        late_min_reduced = max(0.0, base_late_min - kpi_test["late_minutes"])
        loss_saved_vnd = late_min_reduced * cfg.cost.late_minute_vnd
        net_saving_vnd = loss_saved_vnd - test["cost_vnd"]
        roi_ratio = round(loss_saved_vnd / max(1.0, test["cost_vnd"]), 2)

        results.append({
            "stage": test["stage"],
            "stage_name": test["name"],
            "utilization": round(test["utilization"] * 100.0, 1),
            "late_min_reduced": round(late_min_reduced, 1),
            "loss_saved_vnd": round(loss_saved_vnd),
            "intervention_cost_vnd": round(test["cost_vnd"]),
            "net_saving_vnd": round(net_saving_vnd),
            "roi_ratio": roi_ratio,
        })

    # Sort ranks
    df_res = pd.DataFrame(results)
    df_res["utilization_rank"] = df_res["utilization"].rank(ascending=False, method="min").astype(int)
    df_res["impact_rank"] = df_res["roi_ratio"].rank(ascending=False, method="min").astype(int)

    # Detect if ranking disagrees
    rank_conflict = (df_res["utilization_rank"] != df_res["impact_rank"]).any()

    # Formulate executive takeaway
    best_impact = df_res.sort_values("roi_ratio", ascending=False).iloc[0]
    highest_util = df_res.sort_values("utilization", ascending=False).iloc[0]

    if rank_conflict:
        insight = (
            f"Phát hiện quan trọng (Hypothesis H2): Công đoạn có mức sử dụng cao nhất là "
            f"'{highest_util['stage_name']}' ({highest_util['utilization']}%), tuy nhiên việc can thiệp vào "
            f"'{best_impact['stage_name']}' mới đem lại hiệu quả thực tế cao nhất (giảm {best_impact['late_min_reduced']} phút trễ, "
            f"ROI={best_impact['roi_ratio']}x). Điều này chứng minh việc chỉ nhìn vào chỉ số bận (utilization) "
            f"dễ dẫn tới quyết định sai lầm trong điều phối."
        )
    else:
        insight = (
            f"Công đoạn nghẽn cốt lõi là '{best_impact['stage_name']}', vừa có mức sử dụng cao "
            f"({best_impact['utilization']}%), vừa cho hiệu quả giảm trễ vượt trội khi bổ sung nguồn lực "
            f"(tiết kiệm {best_impact['loss_saved_vnd']:,.0f} đ, ROI={best_impact['roi_ratio']}x)."
        )

    return {
        "base_kpi": {
            "late_minutes": round(base_late_min, 1),
            "late_rate": round(kpi_base["late_rate"] * 100.0, 1),
            "throughput": kpi_base["throughput"],
            "lead_p50": kpi_base["lead_p50"],
            "lead_p90": kpi_base["lead_p90"],
        },
        "stages": df_res.to_dict(orient="records"),
        "rank_conflict": bool(rank_conflict),
        "insight": insight,
    }
