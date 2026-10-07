"""Risk-aware decision optimizer evaluating candidate actions with CVaR and Pareto frontiers.

Ref: Proposal §10 & Khảo sát R10 (Rockafellar & Uryasev 2000):
- Objective: E[L] + lambda * CVaR90[L]
- Lambda parameter allows operators to balance expected operational loss vs extreme tail risk.
- Returns Pareto-optimal choices so managers clearly see the trade-offs.
"""
from __future__ import annotations

from typing import Dict, List, Any, Optional, Tuple
import numpy as np
import pandas as pd

from ..domain import FactoryConfig, default_config
from ..sim.engine import SimInput, run_simulation, compute_kpis
from ..sim.schedule import build_specs
from ..data.synthetic import std_times
from .actions import ActionCandidate, generate_action_catalog


def compute_cvar(losses: np.ndarray, alpha: float = 0.90) -> float:
    """Compute CVaR at alpha level via Rockafellar & Uryasev definition."""
    arr = np.asarray(losses, dtype=float)
    m = len(arr)
    if m == 0:
        return 0.0
    
    # Sort losses ascending
    sorted_losses = np.sort(arr)
    var_idx = int(np.ceil(alpha * m)) - 1
    var = sorted_losses[max(0, min(m - 1, var_idx))]
    
    tail = arr[arr >= var]
    if len(tail) == 0:
        return float(var)
    return float(np.mean(tail))


def evaluate_actions_on_scenarios(
    cfg: FactoryConfig,
    base_requests: pd.DataFrame,
    calendar: pd.DataFrame,
    disruptions: pd.DataFrame,
    t0: pd.Timestamp,
    horizon_min: float = 480.0,
    n_scenarios: int = 15,
    lambda_risk: float = 0.25,
    seed_base: int = 42,
) -> Dict[str, Any]:
    """Evaluate all candidate actions across multiple future scenarios and rank by risk-aware score."""
    actions = generate_action_catalog(cfg, t0, horizon_min, calendar)
    
    # Base simulation input requests
    sim_req = pd.concat([
        base_requests[["request_id", "line_id", "item_group", "n_lines"]],
        std_times(cfg, base_requests)
    ], axis=1)
    sim_req["arrival_min"] = (base_requests["created_at"] - t0).dt.total_seconds() / 60.0
    sim_req["due_min"] = (base_requests["due_at"] - t0).dt.total_seconds() / 60.0
    sim_req["start_stage"] = base_requests.get("stage", "picking")

    evaluations: List[Dict[str, Any]] = []

    for act in actions:
        if not act.is_feasible:
            evaluations.append({
                "action_id": act.action_id,
                "name": act.name,
                "action_type": act.action_type,
                "is_feasible": False,
                "infeasibility_reason": act.infeasibility_reason,
                "cost_vnd": act.cost_vnd,
                "expected_loss_vnd": None,
                "cvar90_loss_vnd": None,
                "risk_score": None,
                "avg_late_minutes": None,
                "avg_late_rate": None,
                "avg_throughput": None,
                "is_pareto": False,
            })
            continue

        # Evaluate on each scenario with Common Random Numbers (CRN)
        scenario_losses = []
        late_mins_list = []
        late_rates_list = []
        throughputs = []

        # Build specs for this action
        workers, tuggers, params, _ = build_specs(
            cfg=cfg, calendar=calendar, disruptions=disruptions, t0=t0, horizon_min=horizon_min, adj=act.adjustments
        )

        for s_idx in range(n_scenarios):
            sim_seed = seed_base + s_idx * 17
            res = run_simulation(SimInput(horizon_min, sim_req, workers, tuggers, params, seed=sim_seed))
            kpi = compute_kpis(res, 0.0, horizon_min)
            
            late_m = kpi["late_minutes"]
            loss = late_m * cfg.cost.late_minute_vnd + act.cost_vnd
            
            scenario_losses.append(loss)
            late_mins_list.append(late_m)
            late_rates_list.append(kpi["late_rate"])
            throughputs.append(kpi["throughput"])

        losses_arr = np.array(scenario_losses)
        e_loss = float(np.mean(losses_arr))
        cvar90 = compute_cvar(losses_arr, alpha=0.90)
        risk_score = e_loss + lambda_risk * cvar90

        evaluations.append({
            "action_id": act.action_id,
            "name": act.name,
            "description": act.description,
            "action_type": act.action_type,
            "is_feasible": True,
            "cost_vnd": round(act.cost_vnd),
            "expected_loss_vnd": round(e_loss),
            "cvar90_loss_vnd": round(cvar90),
            "risk_score": round(risk_score),
            "avg_late_minutes": round(float(np.mean(late_mins_list)), 1),
            "avg_late_rate": round(float(np.mean(late_rates_list)) * 100.0, 1),
            "avg_throughput": int(np.mean(throughputs)),
            "scenario_losses": [round(x) for x in scenario_losses],
            "is_pareto": False,
        })

    # Filter feasible actions to compute Pareto frontier and rankings
    feasible_acts = [e for e in evaluations if e["is_feasible"]]
    if feasible_acts:
        # Pareto check: non-dominated in (expected_loss_vnd, cvar90_loss_vnd)
        for act_a in feasible_acts:
            dominated = False
            for act_b in feasible_acts:
                if act_a["action_id"] == act_b["action_id"]:
                    continue
                # B dominates A if B is strictly better or equal in both objectives and strictly better in at least one
                b_better_e = act_b["expected_loss_vnd"] <= act_a["expected_loss_vnd"]
                b_better_c = act_b["cvar90_loss_vnd"] <= act_a["cvar90_loss_vnd"]
                b_strictly = (act_b["expected_loss_vnd"] < act_a["expected_loss_vnd"]) or (act_b["cvar90_loss_vnd"] < act_a["cvar90_loss_vnd"])
                if b_better_e and b_better_c and b_strictly:
                    dominated = True
                    break
            act_a["is_pareto"] = not dominated

        # Sort by risk_score ascending
        feasible_acts.sort(key=lambda x: x["risk_score"])
        best_act = feasible_acts[0]
        base_act = next((e for e in feasible_acts if e["action_id"] == "ACT_BASE"), feasible_acts[-1])

        # Generate recommendation sentence (proposal §11 template)
        late_reduction_pct = 0.0
        if base_act["avg_late_minutes"] > 0:
            late_reduction_pct = round(
                (base_act["avg_late_minutes"] - best_act["avg_late_minutes"]) / base_act["avg_late_minutes"] * 100.0, 1
            )

        recommendation_statement = (
            f"Đề xuất áp dụng '{best_act['name']}'. "
            f"Mô phỏng qua {n_scenarios} kịch bản tương lai cho thấy phương án này giúp giảm "
            f"{late_reduction_pct}% phút trễ trung bình so với cơ sở và cắt giảm tổn thất ở kịch bản xấu (CVaR90) "
            f"xuống còn {best_act['cvar90_loss_vnd']:,.0f} đ (với chi phí tăng thêm: {best_act['cost_vnd']:,.0f} đ). "
            f"Điều kiện áp dụng: Trưởng ca logistics phê duyệt điều phối tại đầu ca."
        )
    else:
        recommendation_statement = "Tất cả các phương án can thiệp đều vi phạm ràng buộc vận hành. Cần liên hệ quản lý ca."

    return {
        "lambda_risk": lambda_risk,
        "n_scenarios": n_scenarios,
        "evaluations": evaluations,
        "recommendation_statement": recommendation_statement,
        "best_action_id": feasible_acts[0]["action_id"] if feasible_acts else None,
    }
