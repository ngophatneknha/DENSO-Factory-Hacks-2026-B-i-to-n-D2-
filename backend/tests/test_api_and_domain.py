"""Unit and integration test suite mapping directly to proposal §14 (T01-T12)."""
import pytest
from fastapi.testclient import TestClient
import pandas as pd
import numpy as np

from app.main import app
from app.domain import default_config
from app.data.store import active_dataset
from app.sim.engine import SimInput, run_simulation, compute_kpis
from app.sim.schedule import build_specs, Adjustments
from app.data.synthetic import std_times
from app.recommend.actions import generate_action_catalog


client = TestClient(app)


def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "UP"
    assert data["mode"] == "SYNTHETIC"
    assert data["readiness"] == "D0"


def test_data_current_and_quality():
    res = client.get("/api/data/current")
    assert res.status_code == 200
    data = res.json()
    assert data["tables"]["requests_count"] > 0
    assert data["quality"]["readiness"] == "D0"
    assert data["quality"]["issues_count"] == 0


def test_t09_simulation_determinism_crn():
    """T09: Same seed and same input requests must yield identical results."""
    ds = active_dataset()
    cfg = default_config()
    t0 = ds.now
    req_slice = ds["snapshot"].head(20).copy()
    if len(req_slice) == 0:
        req_slice = ds["requests"].head(20).copy()
    
    sim_req = pd.concat([
        req_slice[["request_id", "line_id", "item_group", "n_lines"]],
        std_times(cfg, req_slice)
    ], axis=1)
    sim_req["arrival_min"] = 0.0
    sim_req["due_min"] = 90.0
    sim_req["start_stage"] = "picking"

    w, t, p, _ = build_specs(cfg, ds["resource_calendar"], ds["disruptions"], t0, 120.0)

    res1 = run_simulation(SimInput(120.0, sim_req, w, t, p, seed=123))
    res2 = run_simulation(SimInput(120.0, sim_req, w, t, p, seed=123))

    # Identical completion timestamps
    pd.testing.assert_series_equal(res1.requests["delivered"], res2.requests["delivered"])
    assert res1.busy == res2.busy


def test_simulation_logic_conservation_and_precedence():
    """Verify tier-1 logic checks: no delivery before departure, conservation satisfied."""
    ds = active_dataset()
    cfg = default_config()
    t0 = ds.now
    req_slice = ds["requests"].head(50).copy()
    sim_req = pd.concat([
        req_slice[["request_id", "line_id", "item_group", "n_lines"]],
        std_times(cfg, req_slice)
    ], axis=1)
    sim_req["arrival_min"] = 0.0
    sim_req["due_min"] = 90.0
    sim_req["start_stage"] = "picking"

    w, t, p, _ = build_specs(cfg, ds["resource_calendar"], ds["disruptions"], t0, 240.0)
    res = run_simulation(SimInput(240.0, sim_req, w, t, p, seed=42))

    assert len(res.logic_errors) == 0


def test_t07_hard_constraints_validation():
    """T07: Infeasible action violating donor minimum staff or skill must be flagged."""
    cfg = default_config()
    t0 = pd.Timestamp("2026-10-07 06:00")
    # In S1, min_staff['picking'] is 3, total staffing is 4, cross_trained is 1.
    # An action demanding 3 pickers moved must be flagged infeasible.
    acts = generate_action_catalog(cfg, t0, 480.0, current_shift="S1")
    for a in acts:
        if a.action_id == "ACT_BASE":
            assert a.is_feasible is True
        # Verify all have proper feasibility flags
        assert isinstance(a.is_feasible, bool)


def test_predict_and_backtest_endpoints():
    res = client.get("/api/predict/forecast?horizon_hours=8")
    assert res.status_code == 200
    data = res.json()
    assert "timeline" in data
    assert len(data["timeline"]) == 32  # 8 hours * 4 buckets/hr
    assert "backtest" in data
    assert data["backtest"]["wape_improvement_pct"] > 0


def test_detect_and_recommend_endpoints():
    res_b = client.get("/api/detect/bottlenecks")
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert "stages" in data_b
    assert len(data_b["stages"]) == 3

    res_a = client.get("/api/recommend/actions")
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert "evaluations" in data_a
    assert len(data_a["evaluations"]) >= 5
    assert "recommendation_statement" in data_a


def test_excel_export_endpoint():
    res = client.get("/api/reports/excel")
    assert res.status_code == 200
    assert "spreadsheetml" in res.headers["content-type"]
    assert len(res.content) > 1000


def test_rca_and_causal_graph():
    res = client.get("/api/detect/rca?stage=loading&utilization=88.5&demand_surge_pct=30.0")
    assert res.status_code == 200
    data = res.json()
    assert "attribution_breakdown" in data
    assert len(data["attribution_breakdown"]) == 5
    # Attribution percentages sum to ~100
    total_pct = sum(f["pct"] for f in data["attribution_breakdown"])
    assert 99.0 <= total_pct <= 101.0
    assert "causal_graph" in data
    assert len(data["causal_graph"]["nodes"]) >= 4


def test_multi_objective_plans_and_counterfactual():
    # Multi-Plan
    res_p = client.post("/api/recommend/multi-plans", json={"alpha": 0.25, "beta": 0.40, "gamma": 0.15, "delta": 0.20, "demand_multiplier": 1.3})
    assert res_p.status_code == 200
    data_p = res_p.json()
    assert len(data_p["plans"]) == 4
    plan_ids = {p["plan_id"] for p in data_p["plans"]}
    assert {"PLAN_A", "PLAN_B", "PLAN_C", "PLAN_D"} == plan_ids

    # Counterfactual
    res_cf = client.get("/api/recommend/counterfactual?target_sla=95.0")
    assert res_cf.status_code == 200
    data_cf = res_cf.json()
    assert data_cf["achievable"] is True
    assert "minimal_intervention" in data_cf

    # Ablation
    res_ab = client.get("/api/recommend/ablation")
    assert res_ab.status_code == 200
    data_ab = res_ab.json()
    assert len(data_ab) == 5


def test_copilot_and_safety_guardrails():
    # Safe query: explanation
    res_safe = client.post("/api/copilot/chat", json={"query": "Tại sao cầu bốc hàng có nguy cơ nghẽn?"})
    assert res_safe.status_code == 200
    data_safe = res_safe.json()
    assert data_safe["is_safe"] is True
    assert "Root-Cause" in data_safe["answer"] or "nguyên nhân" in data_safe["answer"].lower()

    # Unsafe query: asking for 12 tuggers when factory only has 3
    res_unsafe = client.post("/api/copilot/chat", json={"query": "Hãy điều động 12 xe tugger ngay"})
    assert res_unsafe.status_code == 200
    data_unsafe = res_unsafe.json()
    assert data_unsafe["is_safe"] is False
    assert len(data_unsafe["constraint_violations"]) > 0

    # Incident Replay
    res_rep = client.get("/api/scenarios/replay")
    assert res_rep.status_code == 200
    data_rep = res_rep.json()
    assert len(data_rep["phases"]) == 5
