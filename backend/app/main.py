"""FastAPI main application exposing endpoints for the D2 Logistics Control Room."""
from __future__ import annotations

import os
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, UploadFile, File, Form, Query, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import pandas as pd

from .config import FRONTEND_DIST, VAR_DIR
from .domain import default_config, FactoryConfig
from .data.store import active_dataset, list_datasets, read_current, write_current, save_dataset
from .data.synthetic import generate_dataset, DEFAULT_NOW
from .data.quality import profile_dataset
from .data.ingest import parse_upload_file, generate_excel_template
from .predict.engine import PredictEngine
from .sim.scenario_requests import prepare_horizon_requests
from .sim.engine import SimInput, run_simulation, compute_kpis
from .sim.schedule import build_specs, Adjustments
from .data.synthetic import std_times
from .detect.alerts import detect_operational_alerts
from .detect.intervention import compute_intervention_impact
from .recommend.optimizer import evaluate_actions_on_scenarios
from .audit import init_db, log_audit, get_recent_audit_logs, _get_conn
from .jobs import run_in_background, get_job_status
from .reports import build_excel_report


app = FastAPI(
    title="DENSO Factory Hacks 2026 - D2 Logistics Control Room API",
    version="1.0.0",
    description="Predict, Detect, Simulate, and Recommend system for intralogistics supply flows.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize PredictEngine singleton
predict_engine = PredictEngine()


@app.on_event("startup")
def on_startup():
    init_db()
    try:
        from .init_data import ensure_initial_dataset
        ensure_initial_dataset()
    except Exception as e:
        print(f"[startup] ensure_initial_dataset note: {e}")


# ==============================================================================
# Health & Status
# ==============================================================================
@app.get("/api/health")
def get_health():
    cur = read_current()
    return {
        "status": "UP",
        "system": "D2 Logistics Control Room",
        "competition": "DENSO Factory Hacks 2026",
        "active_dataset": cur.get("data_version"),
        "now": cur.get("now", DEFAULT_NOW.isoformat()),
        "mode": "SYNTHETIC",
        "readiness": "D0",
    }


# ==============================================================================
# Data Management & Ingest
# ==============================================================================
@app.get("/api/data/current")
def get_current_data():
    ds = active_dataset()
    prof = profile_dataset(ds)
    return {
        "meta": ds.meta,
        "quality": prof,
        "tables": {
            "requests_count": len(ds["requests"]),
            "events_count": len(ds["process_events"]),
            "snapshot_wip_count": len(ds["snapshot"]),
            "resources_count": len(ds["resources"]),
            "calendar_count": len(ds["resource_calendar"]),
            "plan_count": len(ds["production_plan"]),
        }
    }


@app.get("/api/data/datasets")
def get_all_datasets():
    return list_datasets()


@app.post("/api/data/generate")
def trigger_generate_dataset(seed: int = 42, history_days: int = 84):
    def _worker(prog_cb):
        ds = generate_dataset(seed=seed, now=DEFAULT_NOW, history_days=history_days, progress=lambda p, m: prog_cb(int(p*100), m))
        v = save_dataset(ds)
        write_current(data_version=v, now=DEFAULT_NOW.isoformat(), seed=seed)
        log_audit("DATASET_GENERATE", "Operator", v, {"seed": seed, "history_days": history_days})
        return {"data_version": v, "meta": ds["meta"]}

    job_id = run_in_background("DATASET_GENERATE", _worker)
    return {"job_id": job_id, "message": "Đang sinh dữ liệu tổng hợp nền..."}


@app.get("/api/data/template")
def download_template():
    buf = generate_excel_template()
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=D2_Logistics_Template.xlsx"}
    )


@app.post("/api/data/upload")
async def upload_data_file(file: UploadFile = File(...)):
    contents = await file.read()
    try:
        tables = parse_upload_file(contents, file.filename)
        ds = active_dataset()
        # Save custom dataset version
        version = f"UPLOAD-{pd.Timestamp.now().strftime('%Y%m%d%H%M%S')}"
        new_ds_dict = {
            "requests": tables.get("requests", ds["requests"]),
            "process_events": tables.get("process_events", ds["process_events"]),
            "resources": tables.get("resources", ds["resources"]),
            "resource_calendar": tables.get("resource_calendar", ds["resource_calendar"]),
            "production_plan": tables.get("production_plan", ds["production_plan"]),
            "disruptions": tables.get("disruptions", ds["disruptions"]),
            "routes": ds["routes"],
            "item_master": ds["item_master"],
            "cost_parameters": ds["cost_parameters"],
            "snapshot": ds["snapshot"],
            "meta": {
                **ds.meta,
                "data_version": version,
                "mode": "IMPORTED_USER_DATA",
                "uploaded_filename": file.filename,
                "uploaded_at": pd.Timestamp.now().isoformat(),
            }
        }
        save_dataset(new_ds_dict)
        write_current(data_version=version)
        log_audit("DATA_UPLOAD", "Operator", version, {"filename": file.filename})
        return {"status": "SUCCESS", "version": version, "tables_imported": list(tables.keys())}
    except Exception as ex:
        raise HTTPException(status_code=400, detail=str(ex))


@app.get("/api/data/quality")
def get_data_quality():
    ds = active_dataset()
    return profile_dataset(ds)


@app.get("/api/data/browse")
def browse_table(
    table: str = Query("requests", enum=["requests", "process_events", "production_plan", "resource_calendar", "resources", "snapshot"]),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=5, le=100),
    search: str = Query("", max_length=100)
):
    ds = active_dataset()
    if table not in ds:
        raise HTTPException(status_code=404, detail=f"Table {table} not found in active dataset")
    df = ds[table]
    if search.strip():
        mask = pd.Series(False, index=df.index)
        s_low = search.lower()
        for col in df.columns:
            mask |= df[col].astype(str).str.lower().str.contains(s_low, na=False)
        df_filtered = df[mask]
    else:
        df_filtered = df

    total_rows = len(df_filtered)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    sliced = df_filtered.iloc[start_idx:end_idx].copy()

    for col in sliced.columns:
        if pd.api.types.is_datetime64_any_dtype(sliced[col]):
            sliced[col] = sliced[col].dt.strftime("%Y-%m-%d %H:%M:%S")
        else:
            sliced[col] = sliced[col].fillna("-")

    return {
        "table": table,
        "total_rows": total_rows,
        "page": page,
        "page_size": page_size,
        "columns": list(df.columns),
        "rows": sliced.to_dict(orient="records"),
    }


# ==============================================================================
# Predict Endpoints
# ==============================================================================
@app.get("/api/predict/forecast")
def get_forecast(horizon_hours: int = Query(8, ge=1, le=24)):
    ds = active_dataset()
    res = predict_engine.forecast_upcoming(
        requests=ds["requests"],
        plan=ds["production_plan"],
        calendar=ds["resource_calendar"],
        disruptions=ds["disruptions"],
        as_of=ds.now,
        horizon_hours=horizon_hours,
    )
    return res


@app.get("/api/predict/backtest")
def get_backtest():
    ds = active_dataset()
    if not predict_engine.is_trained:
        predict_engine.train_and_backtest(ds["requests"], ds["production_plan"], ds.now)
    return predict_engine.backtest_results


# ==============================================================================
# Detect Endpoints
# ==============================================================================
# Detect Endpoints
# ==============================================================================
@app.get("/api/detect/alerts")
def get_alerts():
    ds = active_dataset()
    fc = predict_engine.forecast_upcoming(
        requests=ds["requests"],
        plan=ds["production_plan"],
        calendar=ds["resource_calendar"],
        disruptions=ds["disruptions"],
        as_of=ds.now,
        horizon_hours=8,
    )
    alerts = detect_operational_alerts(fc["timeline"], ds["snapshot"], ds.now)
    return {
        "as_of": ds.now.isoformat(),
        "total_alerts": len(alerts),
        "alerts": alerts,
    }


@app.get("/api/detect/bottlenecks")
def get_bottlenecks():
    ds = active_dataset()
    cfg = default_config()
    req_pool = prepare_horizon_requests(
        cfg=cfg,
        plan=ds["production_plan"],
        snapshot=ds["snapshot"],
        t_start=ds.now,
        t_end=ds.now + pd.Timedelta(hours=8),
        seed=42,
    )
    res = compute_intervention_impact(
        cfg=cfg,
        base_requests=req_pool,
        calendar=ds["resource_calendar"],
        disruptions=ds["disruptions"],
        t0=ds.now,
        horizon_min=480.0,
    )
    return res


@app.get("/api/detect/rca")
def get_root_cause_analysis(
    stage: str = "loading",
    utilization: float = 88.5,
    demand_surge_pct: float = 30.0,
    tugger_deficit: int = 1,
    dock_queue_len: int = 4,
):
    from .detect.rca import analyze_bottleneck_root_cause
    return analyze_bottleneck_root_cause(
        stage=stage,
        utilization=utilization,
        demand_surge_pct=demand_surge_pct,
        tugger_deficit=tugger_deficit,
        dock_queue_len=dock_queue_len,
    )

class EvaluateActionsRequest(BaseModel):
    lambda_risk: float = 0.25
    n_scenarios: int = 10
    demand_multiplier: float = 1.0  # 1.0 = normal, 1.3 = +30% surge


@app.post("/api/recommend/evaluate")
def evaluate_recommendations(req: EvaluateActionsRequest):
    ds = active_dataset()
    cfg = default_config()
    
    req_pool = prepare_horizon_requests(
        cfg=cfg,
        plan=ds["production_plan"],
        snapshot=ds["snapshot"],
        t_start=ds.now,
        t_end=ds.now + pd.Timedelta(hours=8),
        seed=42,
    )
    if req.demand_multiplier != 1.0:
        frac = req.demand_multiplier
        n_extra = int(len(req_pool) * (frac - 1.0))
        if n_extra > 0:
            extra_sample = req_pool.sample(n=n_extra, replace=True, random_state=42).copy().reset_index(drop=True)
            extra_sample["request_id"] = [f"{rid}_SURGE_{i+1:03d}" for i, rid in enumerate(extra_sample["request_id"])]
            req_pool = pd.concat([req_pool, extra_sample], ignore_index=True)

    res = evaluate_actions_on_scenarios(
        cfg=cfg,
        base_requests=req_pool,
        calendar=ds["resource_calendar"],
        disruptions=ds["disruptions"],
        t0=ds.now,
        horizon_min=480.0,
        n_scenarios=req.n_scenarios,
        lambda_risk=req.lambda_risk,
    )
    return res


@app.get("/api/recommend/actions")
def get_recommendations():
    return evaluate_recommendations(EvaluateActionsRequest(lambda_risk=0.25, n_scenarios=10))


class MultiPlanRequest(BaseModel):
    alpha: float = 0.25
    beta: float = 0.40
    gamma: float = 0.15
    delta: float = 0.20
    demand_multiplier: float = 1.3


@app.post("/api/recommend/multi-plans")
def get_multi_objective_plans(req: MultiPlanRequest):
    from .recommend.multi_plan import compute_multi_objective_plans
    baseline_kpis = {"late_minutes": 120.0, "late_rate": 0.18}
    return compute_multi_objective_plans(
        baseline_kpis=baseline_kpis,
        demand_multiplier=req.demand_multiplier,
        alpha=req.alpha,
        beta=req.beta,
        gamma=req.gamma,
        delta=req.delta,
    )


@app.get("/api/recommend/counterfactual")
def get_counterfactual(target_sla: float = 95.0):
    from .recommend.multi_plan import solve_counterfactual_recommendation
    return solve_counterfactual_recommendation(target_sla=target_sla)


@app.get("/api/recommend/ablation")
def get_ablation_benchmarks_table():
    from .recommend.multi_plan import get_ablation_benchmarks
    return get_ablation_benchmarks()


# ==============================================================================
# What-if Simulation Endpoints
# ==============================================================================
class CustomSimRequest(BaseModel):
    priority: str = "FIFO"
    tugger_cycle_min: float = 20.0
    extra_pickers: int = 0
    extra_loaders: int = 0
    extra_tuggers: int = 0
    demand_surge_pct: float = 0.0  # e.g. 20 for +20%
    seed: int = 42


@app.post("/api/simulate/custom")
def simulate_custom(sim_cfg: CustomSimRequest):
    ds = active_dataset()
    cfg = default_config()
    t0 = ds.now
    horizon_min = 480.0

    req_pool = prepare_horizon_requests(
        cfg=cfg,
        plan=ds["production_plan"],
        snapshot=ds["snapshot"],
        t_start=t0,
        t_end=t0 + pd.Timedelta(minutes=horizon_min),
        seed=sim_cfg.seed,
    )
    if sim_cfg.demand_surge_pct > 0:
        frac = 1.0 + (sim_cfg.demand_surge_pct / 100.0)
        n_extra = int(len(req_pool) * (frac - 1.0))
        if n_extra > 0:
            extra_sample = req_pool.sample(n=n_extra, replace=True, random_state=sim_cfg.seed).copy().reset_index(drop=True)
            extra_sample["request_id"] = [f"{rid}_SURGE_{i+1:03d}" for i, rid in enumerate(extra_sample["request_id"])]
            req_pool = pd.concat([req_pool, extra_sample], ignore_index=True)

    # Build custom adjustments
    temps = []
    if sim_cfg.extra_pickers > 0:
        temps.append({"stage": "picking", "start": t0, "end": t0 + pd.Timedelta(minutes=horizon_min), "n": sim_cfg.extra_pickers})
    if sim_cfg.extra_loaders > 0:
        temps.append({"stage": "loading", "start": t0, "end": t0 + pd.Timedelta(minutes=horizon_min), "n": sim_cfg.extra_loaders})

    xtra_tugs = []
    if sim_cfg.extra_tuggers > 0:
        for _ in range(sim_cfg.extra_tuggers):
            xtra_tugs.append({"start": t0, "end": t0 + pd.Timedelta(minutes=horizon_min)})

    adj = Adjustments(
        priority=sim_cfg.priority,
        tugger_cycle_min=sim_cfg.tugger_cycle_min,
        temps=temps,
        extra_tuggers=xtra_tugs,
    )

    sim_req = pd.concat([
        req_pool[["request_id", "line_id", "item_group", "n_lines"]],
        std_times(cfg, req_pool)
    ], axis=1)
    sim_req["arrival_min"] = (req_pool["created_at"] - t0).dt.total_seconds() / 60.0
    sim_req["due_min"] = (req_pool["due_at"] - t0).dt.total_seconds() / 60.0
    sim_req["start_stage"] = req_pool.get("start_stage", "picking")

    workers, tuggers, params, _ = build_specs(
        cfg=cfg, calendar=ds["resource_calendar"], disruptions=ds["disruptions"], t0=t0, horizon_min=horizon_min, adj=adj
    )

    res = run_simulation(SimInput(horizon_min, sim_req, workers, tuggers, params, seed=sim_cfg.seed))
    kpis = compute_kpis(res, 0.0, horizon_min)

    # Queue timeline samples
    q_sample = res.queue_ts.to_dict(orient="records")

    # Detailed Trips Gantt
    trips_gantt = []
    if len(res.trips):
        for _, tr in res.trips.iterrows():
            trips_gantt.append({
                "tugger_id": str(tr["tugger_id"]),
                "depart": round(float(tr["depart"]), 1),
                "return": round(float(tr["return"]), 1),
                "duration": round(float(tr["return"] - tr["depart"]), 1),
                "orders_count": int(tr["n"]),
            })

    # Order-level fulfillment trace: include all late orders, WIP orders, and representative on-time orders
    reqs_df = res.requests
    deliv_col = reqs_df["delivered"]
    due_col = reqs_df["due_min"]
    is_deliv = deliv_col.notna()

    is_late_deliv = is_deliv & (deliv_col > due_col + 1e-6)
    is_overdue = (~is_deliv) & (due_col <= horizon_min)
    is_wip = (~is_deliv) & (due_col > horizon_min)
    is_ontime = is_deliv & (~is_late_deliv)

    late_df = reqs_df[is_late_deliv | is_overdue]
    wip_df = reqs_df[is_wip]
    ontime_df = reqs_df[is_ontime]

    trace_df = pd.concat([
        late_df,
        wip_df.head(20),
        ontime_df.head(50),
    ]).drop_duplicates(subset=["request_id"]).sort_values(by="due_min")

    sample_rows = []
    for _, row in trace_df.iterrows():
        deliv = row["delivered"]
        due = row["due_min"]
        if pd.notna(deliv):
            is_late = bool(deliv > due + 1e-6)
            late_min = round(max(0.0, float(deliv - due)), 1)
            status = "LATE" if is_late else "ON_TIME"
        else:
            # Undelivered at horizon_min (480.0)
            if due <= horizon_min:
                status = "OVERDUE"  # Overdue in current shift
                late_min = round(max(0.0, float(horizon_min - due)), 1)
            else:
                status = "WIP_IN_PROGRESS"  # Due in next shift, normal buffer WIP
                late_min = 0.0
        sample_rows.append({
            "request_id": str(row["request_id"]),
            "line_id": str(row["line_id"]),
            "item_group": str(row.get("item_group", "BIN")),
            "due_min": round(float(due), 1),
            "pick_end": round(float(row["pick_end"]), 1) if pd.notna(row["pick_end"]) else None,
            "load_end": round(float(row["load_end"]), 1) if pd.notna(row["load_end"]) else None,
            "delivered": round(float(deliv), 1) if pd.notna(deliv) else None,
            "status": status,
            "late_min": late_min,
            "picker_id": str(row.get("picker_id", "-")),
            "tugger_id": str(row.get("tugger_id", "-")),
        })

    # Timeline playback snapshots (every 15 mins)
    playback = []
    for t_step in range(0, int(horizon_min) + 1, 15):
        # Queues at t_step
        q_row = res.queue_ts[res.queue_ts["t"] <= t_step].iloc[-1] if len(res.queue_ts[res.queue_ts["t"] <= t_step]) else None
        q_p = int(q_row["picking"]) if q_row is not None else 0
        q_l = int(q_row["loading"]) if q_row is not None else 0
        q_t = int(q_row["transport"]) if q_row is not None else 0
        deliv_count = int((reqs_df["delivered"] <= t_step).sum())
        active_tugs = res.trips[(res.trips["depart"] <= t_step) & (res.trips["return"] > t_step)]["tugger_id"].tolist()
        playback.append({
            "t": t_step,
            "picking_queue": q_p,
            "loading_queue": q_l,
            "transport_queue": q_t,
            "delivered_cum": deliv_count,
            "active_tuggers": [str(x) for x in active_tugs],
        })

    return {
        "kpis": kpis,
        "logic_errors": res.logic_errors,
        "queue_timeline": q_sample[::2],  # sample every 30 mins
        "trips_count": len(res.trips),
        "trips_gantt": trips_gantt,
        "order_sample": sample_rows,
        "playback_snapshots": playback,
    }


# ==============================================================================
# Operator Decisions & Audit
# ==============================================================================
class DecisionApproval(BaseModel):
    action_id: str
    action_name: str
    decision_status: str  # APPROVED | REJECTED | MODIFIED
    operator_name: str = "Trưởng ca Logistics"
    notes: Optional[str] = None
    expected_saving_vnd: float = 0.0
    cost_vnd: float = 0.0


@app.post("/api/decisions/approve")
def approve_decision(dec: DecisionApproval):
    import uuid
    init_db()
    dec_id = f"DEC-{str(uuid.uuid4())[:8]}"
    conn = _get_conn()
    with conn:
        conn.execute(
            """
            INSERT INTO saved_decisions (
                decision_id, timestamp, operator_name, shift_id, action_id, action_name,
                decision_status, expected_saving_vnd, cost_vnd, notes, run_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                dec_id, pd.Timestamp.now().isoformat(), dec.operator_name, "S1",
                dec.action_id, dec.action_name, dec.decision_status,
                dec.expected_saving_vnd, dec.cost_vnd, dec.notes, dec_id
            )
        )
    conn.close()
    log_audit("DECISION_RECORDED", dec.operator_name, dec_id, dec.dict())
    return {"status": "SUCCESS", "decision_id": dec_id}


@app.get("/api/decisions/history")
def get_decisions():
    init_db()
    conn = _get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM saved_decisions ORDER BY timestamp DESC LIMIT 50")
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/audit/logs")
def get_audit(limit: int = 50):
    return get_recent_audit_logs(limit)


# ==============================================================================
# Copilot & Safe Constraint Validation
# ==============================================================================
from .copilot import CopilotQueryRequest, process_copilot_query, validate_safety_constraints


@app.post("/api/copilot/chat")
def copilot_chat(req: CopilotQueryRequest):
    return process_copilot_query(req)


@app.get("/api/copilot/validate-safety")
def copilot_validate(tuggers: int = 3, loaders: int = 3, cost_vnd: float = 0.0):
    cfg = default_config()
    res = validate_safety_constraints(
        proposed_tuggers=tuggers,
        proposed_loaders=loaders,
        proposed_cost_vnd=cost_vnd,
        cfg=cfg,
    )
    return res.dict()


# ==============================================================================
# Incident Replay Mode
# ==============================================================================
@app.get("/api/scenarios/replay")
def get_incident_replay():
    return {
        "scenario_name": "Sự cố Đột biến Nhu cầu Ca S2 & Bảo dưỡng Xe Kéo TG-03",
        "horizon": "14:00 - 22:00 (8 giờ)",
        "phases": [
            {
                "phase_id": 1,
                "name": "1. Vận hành Bình thường (Normal State)",
                "timestamp": "14:00",
                "status_color": "emerald",
                "kpis": {"health_score": 96, "dock_queue": 1, "fleet_util": "62%", "sla": "99.4%"},
                "event": "Đầu ca S2. 19 đơn WIP đệm được xử lý trơn tru. 3 xe Tugger hoạt động nhịp nhàng theo chu kỳ 20 phút.",
                "dock_state": "NORMAL",
                "active_tuggers": ["TG-01", "TG-02", "TG-03"],
            },
            {
                "phase_id": 2,
                "name": "2. Cảnh báo Sớm (Early Warning)",
                "timestamp": "14:30",
                "status_color": "amber",
                "kpis": {"health_score": 82, "dock_queue": 4, "fleet_util": "79%", "sla": "96.2%"},
                "event": "Đơn hàng Line 1 & Line 2 đột ngột tăng 30% do thay đổi kế hoạch sản xuất. Cầu bốc hàng bắt đầu tích tụ hàng chờ.",
                "dock_state": "WARNING",
                "active_tuggers": ["TG-01", "TG-02", "TG-03"],
            },
            {
                "phase_id": 3,
                "name": "3. Xuất hiện Điểm nghẽn (Bottleneck Occurrence)",
                "timestamp": "15:00",
                "status_color": "rose",
                "kpis": {"health_score": 58, "dock_queue": 8, "fleet_util": "98%", "sla": "81.5%"},
                "event": "Xe TG-03 phải dừng hoạt động để bảo dưỡng định kỳ. Năng lực kéo giảm 33%. Tồn ứ nghiêm trọng tại Loading Dock.",
                "dock_state": "CONGESTED",
                "active_tuggers": ["TG-01", "TG-02"],
            },
            {
                "phase_id": 4,
                "name": "4. AI Can thiệp Đa Mục Tiêu (AI Recommendation)",
                "timestamp": "15:15",
                "status_color": "blue",
                "kpis": {"health_score": 75, "dock_queue": 6, "fleet_util": "88%", "sla": "92.0%"},
                "event": "Logistics Copilot đề xuất Phương án C (Pareto): Chuyển 1 Picker sang hỗ trợ Dock 2 + Chuyển quy tắc điều độ sang EDD + Rút ngắn chu kỳ xe còn 15 phút.",
                "dock_state": "DISPATCHING",
                "active_tuggers": ["TG-01", "TG-02"],
            },
            {
                "phase_id": 5,
                "name": "5. Khôi phục Vận hành Ổn định (Full Recovery)",
                "timestamp": "16:30",
                "status_color": "emerald",
                "kpis": {"health_score": 94, "dock_queue": 2, "fleet_util": "74%", "sla": "98.4%"},
                "event": "Hàng chờ tại Dock giải tỏa thành công. Xe TG-03 hoàn tất bảo dưỡng và sẵn sàng dự phòng nóng. SLA đạt 98.4%, không gián đoạn dây chuyền.",
                "dock_state": "RECOVERED",
                "active_tuggers": ["TG-01", "TG-02", "TG-03"],
            },
        ]
    }


# ==============================================================================
# Reports & Jobs
# ==============================================================================
@app.get("/api/reports/excel")
def download_excel_report():
    ds = active_dataset()
    fc = predict_engine.forecast_upcoming(
        requests=ds["requests"],
        plan=ds["production_plan"],
        calendar=ds["resource_calendar"],
        disruptions=ds["disruptions"],
        as_of=ds.now,
        horizon_hours=8,
    )
    rec = evaluate_recommendations(EvaluateActionsRequest(lambda_risk=0.25, n_scenarios=5))
    
    report_dict = {
        "data_version": ds.meta.get("data_version", "SYNTHETIC"),
        "as_of": ds.now.isoformat(),
        "recommendation_statement": rec.get("recommendation_statement"),
        "evaluations": rec.get("evaluations"),
        "timeline": fc.get("timeline"),
        "backtest": fc.get("backtest"),
    }
    buf = build_excel_report(report_dict)
    log_audit("REPORT_EXPORT_EXCEL", "Operator", ds.meta.get("data_version"))
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=D2_Report_{ds.meta.get('data_version', 'SYN')}.xlsx"}
    )


@app.get("/api/reports/dispatch-sheet")
def get_dispatch_sheet():
    ds = active_dataset()
    return {
        "facility": "DENSO Manufacturing Vietnam (DMVN) - Nhà máy 1",
        "sheet_id": f"DSP-20261007-S2-{pd.Timestamp.now().strftime('%H%M')}",
        "shift": "Ca 2 (S2: 14:00 - 22:00)",
        "effective_date": "2026-10-07",
        "supervisor": "Trưởng ca Điều phối Logistics",
        "approved_by": "Giám đốc Quản lý Sản xuất & Chuỗi cung ứng",
        "directive_title": "LỆNH ĐIỀU PHỐI CẤP VẬT TƯ: ỨNG PHÓ CHUYỂN ĐỔI MẪU XE & BẢO DƯỠNG XE TG3",
        "summary": "Kích hoạt phương án tối ưu Pareto COMBINED-01: Chuyển quy tắc điều độ sang EDD, tái bố trí 1 nhân sự Picking sang Cầu bốc hàng Loading Dock, tăng tần suất Tugger lên 15 phút/chuyến.",
        "action_steps": [
            {"time": "14:00", "stage": "Bàn giao ca", "action": "Kiểm kê tồn WIP ban đầu (19 đơn đệm), rà soát kế hoạch Line 1 và Line 2 tăng 30%."},
            {"time": "14:15", "stage": "Supermarket & Picking", "action": "Áp dụng thuật toán sắp xếp thứ tự bốc hàng theo EDD (Earliest Due Date)."},
            {"time": "14:30", "stage": "Loading Dock", "action": "Điều chuyển Picker NV-04 (có chứng chỉ đa kỹ năng) sang vận hành Cầu bốc số 2, nâng tổng số loader lên 3 người."},
            {"time": "15:00", "stage": "Tugger Milk-run", "action": "Rút ngắn chu kỳ xuất bến từ 20 phút xuống 15 phút/chuyến trên tuyến cố định L1->L2->L3->L4."},
            {"time": "16:00", "stage": "Bảo dưỡng", "action": "Xe TG3 kết thúc bảo dưỡng, đưa vào trạng thái sẵn sàng dự phòng nóng."},
            {"time": "21:30", "stage": "Tổng kết ca", "action": "Đối soát số lượng kiện giao đến 4 chuyền, ký xác nhận vào Sổ cái điện tử."}
        ],
        "kpi_targets": {
            "max_late_rate": "< 1.5%",
            "max_late_minutes": "< 15 phút",
            "dock_queue_limit": "≤ 4 đơn",
            "lead_time_target": "≤ 28 phút"
        }
    }


@app.get("/api/jobs/{job_id}")
def check_job(job_id: str):
    stat = get_job_status(job_id)
    if not stat:
        raise HTTPException(status_code=404, detail="Job not found")
    return stat


# Serve built frontend static files if present
if FRONTEND_DIST.exists():
    @app.get("/")
    def serve_root():
        return FileResponse(
            FRONTEND_DIST / "index.html",
            headers={"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache", "Expires": "0"}
        )

    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
