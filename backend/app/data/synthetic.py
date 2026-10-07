"""Synthetic dataset generator (data readiness level D0 - clearly labelled SYNTHETIC).

Pipeline: production plan (with revisions) -> material requests (Poisson, AR deviations, bursts)
-> random disruptions -> run the DES over the full history to create a consistent event log
-> snapshot of open work at `now` -> future plan/calendar/known disruptions for the demo day.

Demo day storyline (known in advance at `now`): new-model ramp-up raises S2 plan of L1/L2 by 30%,
and tugger TG3 has planned maintenance 13:00-16:00.
"""
from __future__ import annotations

import time
from typing import Dict

import numpy as np
import pandas as pd

from ..domain import BUCKET_MIN, SHIFTS, SHIFT_MIN, FactoryConfig, default_config
from ..sim.engine import SimInput, run_simulation
from ..sim.schedule import build_calendar, build_resources, build_specs, operating_shifts

DEFAULT_NOW = pd.Timestamp("2026-10-07 06:00")
HISTORY_DAYS = 84
FUTURE_DAYS = 2


def _shift_factor(shift: str, day: pd.Timestamp) -> float:
    f = {"S1": 1.0, "S2": 1.0, "S3": 0.75}[shift]
    if day.dayofweek == 6:
        f *= 0.5
    return f


def generate_plan(cfg: FactoryConfig, first_day: pd.Timestamp, n_days: int, rng: np.random.Generator,
                  demo_day: pd.Timestamp | None = None) -> pd.DataFrame:
    rows = []
    # high-plan episodes
    day_factor = np.exp(rng.normal(0, 0.06, n_days))
    d = 0
    while d < n_days:
        if rng.random() < 0.08:
            L = int(rng.integers(2, 5))
            day_factor[d:d + L] *= rng.uniform(1.12, 1.28)
            d += L
        d += 1
    for di in range(n_days):
        day = (first_day + pd.Timedelta(days=di)).normalize()
        release0 = day - pd.Timedelta(hours=12)  # day-1 18:00
        for line in cfg.lines:
            line_f = np.exp(rng.normal(0, 0.05))
            revise = rng.random() < 0.15
            rev_factor = rng.uniform(0.8, 1.25)
            for shift, sh in SHIFTS:
                if shift not in operating_shifts(day):
                    continue
                change_hour = int(rng.integers(0, 8)) if rng.random() < 0.3 else -1
                for h in range(8):
                    hs = day + pd.Timedelta(hours=sh + h)
                    qty = line.base_plan_per_hour * day_factor[di] * line_f * _shift_factor(shift, day)
                    if h == change_hour:
                        qty *= 0.4  # changeover
                    if demo_day is not None and day == demo_day.normalize() and shift == "S2" and line.id in ("L1", "L2"):
                        qty *= 1.30
                    qty = float(round(qty))
                    rows.append({"line_id": line.id, "hour_start": hs, "planned_qty": qty,
                                 "revision_no": 0, "revision_time": release0})
                    if revise and hs >= day + pd.Timedelta(hours=14) and not (demo_day is not None and day == demo_day.normalize()):
                        rows.append({"line_id": line.id, "hour_start": hs, "planned_qty": float(round(qty * rev_factor)),
                                     "revision_no": 1, "revision_time": day + pd.Timedelta(hours=4)})
    return pd.DataFrame(rows)


def final_plan(plan: pd.DataFrame) -> pd.DataFrame:
    p = plan.sort_values("revision_no").groupby(["line_id", "hour_start"], as_index=False).last()
    return p[["line_id", "hour_start", "planned_qty"]]


def plan_as_of(plan: pd.DataFrame, as_of: pd.Timestamp) -> pd.DataFrame:
    """Latest plan revision known at `as_of` (prevents leakage of later revisions)."""
    p = plan[plan["revision_time"] <= as_of]
    p = p.sort_values("revision_no").groupby(["line_id", "hour_start"], as_index=False).last()
    return p[["line_id", "hour_start", "planned_qty"]]


def _bucket_shape(minute_in_shift: np.ndarray) -> np.ndarray:
    s = np.ones_like(minute_in_shift, dtype=float)
    s[minute_in_shift < 60] = 1.15
    s[(minute_in_shift >= 240) & (minute_in_shift < 300)] = 0.85
    s[minute_in_shift >= 450] = 0.85
    return s


def generate_requests(cfg: FactoryConfig, plan_final: pd.DataFrame, t_from: pd.Timestamp, t_to: pd.Timestamp,
                      rng: np.random.Generator, id_prefix: str = "R") -> pd.DataFrame:
    buckets = pd.date_range(t_from, t_to - pd.Timedelta(minutes=BUCKET_MIN), freq=f"{BUCKET_MIN}min")
    hour_idx = buckets.floor("h")
    shift_start_h = np.select([(buckets.hour >= 6) & (buckets.hour < 14), (buckets.hour >= 14) & (buckets.hour < 22)],
                              [6, 14], 22)
    mins = (buckets.hour - shift_start_h) % 24 * 60 + buckets.minute
    shape = _bucket_shape(np.asarray(mins))
    out = []
    for line in cfg.lines:
        pl = plan_final[plan_final["line_id"] == line.id].set_index("hour_start")["planned_qty"]
        qty_h = pl.reindex(hour_idx).fillna(0.0).to_numpy()
        # AR(1) deviation at hourly resolution
        n_h = len(buckets) // 4 + 2
        e = np.zeros(n_h)
        eps = rng.normal(0, 0.07, n_h)
        for i in range(1, n_h):
            e[i] = 0.85 * e[i - 1] + eps[i]
        dev = np.repeat(e, 4)[: len(buckets)]
        lam = qty_h / 4.0 * line.req_per_unit * shape * np.exp(dev + rng.normal(0, 0.08, len(buckets)))
        cnt = rng.poisson(lam)
        burst = (rng.random(len(buckets)) < 0.02) & (qty_h > 0)
        cnt = cnt + burst * rng.poisson(6, len(buckets))
        total = int(cnt.sum())
        if total == 0:
            continue
        bstart = np.repeat(buckets.values, cnt)
        offs = rng.uniform(0, BUCKET_MIN * 60, total).astype("timedelta64[s]")
        created = pd.to_datetime(bstart + offs)
        groups = list(line.mix.keys())
        g = rng.choice(groups, size=total, p=[line.mix[k] for k in groups])
        n_lines = np.clip(1 + rng.poisson(1.4, total), 1, 6)
        out.append(pd.DataFrame({"line_id": line.id, "item_group": g, "n_lines": n_lines, "created_at": created}))
    req = pd.concat(out, ignore_index=True).sort_values("created_at").reset_index(drop=True)
    pack = {"A": 20, "B": 8, "C": 1}
    req["quantity"] = req["n_lines"] * req["item_group"].map(pack)
    req["unit"] = req["item_group"].map({k: v.unit for k, v in cfg.item_groups.items()})
    req["due_at"] = req["created_at"] + pd.Timedelta(minutes=cfg.due_minutes)
    req.insert(0, "request_id", [f"{id_prefix}{i:06d}" for i in range(1, len(req) + 1)])
    return req


def generate_disruptions(cfg: FactoryConfig, calendar: pd.DataFrame, rng: np.random.Generator) -> pd.DataFrame:
    rows = []
    days = sorted(calendar["date"].unique())
    for d in days:
        day = pd.Timestamp(d)
        if rng.random() < 0.10:  # tugger breakdown
            tg = f"TG{int(rng.integers(1, cfg.tuggers + 1))}"
            s = day + pd.Timedelta(hours=float(rng.uniform(6, 20)))
            rows.append({"start_at": s.round("min"), "end_at": (s + pd.Timedelta(minutes=float(rng.uniform(60, 180)))).round("min"),
                         "resource_id": tg, "reason_code": "TUGGER_BREAKDOWN", "known_in_advance": False})
        cal_d = calendar[calendar["date"] == d]
        if rng.random() < 0.15 and len(cal_d):  # absence of one person for a shift
            r = cal_d.sample(1, random_state=int(rng.integers(0, 1 << 30))).iloc[0]
            if not r["resource_id"].startswith("DR-"):
                rows.append({"start_at": r["start_at"], "end_at": r["end_at"], "resource_id": r["resource_id"],
                             "reason_code": "ABSENCE", "known_in_advance": False})
    return pd.DataFrame(rows, columns=["start_at", "end_at", "resource_id", "reason_code", "known_in_advance"])


def std_times(cfg: FactoryConfig, req: pd.DataFrame) -> pd.DataFrame:
    ig = req["item_group"]
    pb = ig.map({k: v.pick_base for k, v in cfg.item_groups.items()})
    pp = ig.map({k: v.pick_per_line for k, v in cfg.item_groups.items()})
    ld = ig.map({k: v.load_min for k, v in cfg.item_groups.items()})
    return pd.DataFrame({"pick_std": pb + pp * req["n_lines"], "load_std": ld})


def events_from_sim(res_req: pd.DataFrame, t0: pd.Timestamp) -> pd.DataFrame:
    def ts(col):
        return t0 + pd.to_timedelta(res_req[col], unit="min")
    parts = []
    spec = [("picking", "start", "pick_start", "picker_id"), ("picking", "end", "pick_end", "picker_id"),
            ("loading", "start", "load_start", "loader_id"), ("loading", "end", "load_end", "loader_id"),
            ("transport", "depart", "depart", "tugger_id"), ("delivery", "delivered", "delivered", "tugger_id")]
    for proc, etype, col, rcol in spec:
        m = res_req[col].notna()
        sub = res_req.loc[m]
        parts.append(pd.DataFrame({"request_id": sub["request_id"].values, "process_id": proc, "event_type": etype,
                                   "event_time": ts(col)[m].dt.round("s").values, "resource_id": sub[rcol].values}))
    ev = pd.concat(parts, ignore_index=True).sort_values(["event_time", "request_id"]).reset_index(drop=True)
    ev.insert(0, "event_id", [f"E{i:08d}" for i in range(1, len(ev) + 1)])
    return ev


def generate_dataset(seed: int = 42, now: pd.Timestamp = DEFAULT_NOW, history_days: int = HISTORY_DAYS,
                     cfg: FactoryConfig | None = None, progress=None) -> Dict[str, object]:
    cfg = cfg or default_config()
    rng = np.random.default_rng(seed)
    t_start = now - pd.Timedelta(days=history_days)
    t_future_end = now + pd.Timedelta(days=FUTURE_DAYS)
    tick = time.time()

    def prog(p, msg):
        if progress:
            progress(p, msg)

    prog(0.05, "plan")
    plan = generate_plan(cfg, t_start, history_days + FUTURE_DAYS, rng, demo_day=now)
    pf = final_plan(plan)
    prog(0.15, "requests")
    req = generate_requests(cfg, pf, t_start, now, rng)
    resources = build_resources(cfg)
    calendar = build_calendar(cfg, t_start, history_days + FUTURE_DAYS)
    dis = generate_disruptions(cfg, calendar[calendar["start_at"] < now], rng)
    dis = dis[dis["end_at"] <= now]
    demo_dis = pd.DataFrame([{"start_at": now.normalize() + pd.Timedelta(hours=13),
                              "end_at": now.normalize() + pd.Timedelta(hours=16), "resource_id": "TG3",
                              "reason_code": "PLANNED_MAINTENANCE", "known_in_advance": True}])
    dis_all = pd.concat([dis, demo_dis], ignore_index=True)

    prog(0.25, "simulate history")
    H = (now - t_start).total_seconds() / 60
    workers, tuggers, params, _ = build_specs(cfg, calendar, dis, t_start, H, resources=resources)
    sim_req = pd.concat([req[["request_id", "line_id", "item_group", "n_lines"]], std_times(cfg, req)], axis=1)
    sim_req["arrival_min"] = (req["created_at"] - t_start).dt.total_seconds() / 60
    sim_req["due_min"] = (req["due_at"] - t_start).dt.total_seconds() / 60
    sim_req["start_stage"] = "picking"
    res = run_simulation(SimInput(H, sim_req, workers, tuggers, params, seed=seed))
    prog(0.85, "events")
    events = events_from_sim(res.requests, t_start)
    r = res.requests
    req["completed_at"] = t_start + pd.to_timedelta(r["delivered"], unit="min")
    req["status"] = np.where(r["delivered"].notna(), "DONE", "OPEN")

    # snapshot of open work at `now`
    open_r = r[r["delivered"].isna()].copy()
    stage = np.where(open_r["pick_end"].isna(), "picking", np.where(open_r["load_end"].isna(), "loading", "transport"))
    snapshot = req.loc[open_r.index, ["request_id", "line_id", "item_group", "n_lines", "quantity", "unit",
                                      "created_at", "due_at"]].copy()
    snapshot["stage"] = stage

    routes = pd.DataFrame([{"line_id": l.id, "line_name": l.name, "route_pos_min": l.route_pos_min,
                            "return_min": l.return_min} for l in cfg.lines])
    item_master = pd.DataFrame([{"item_group": k, "pick_base_min": v.pick_base, "pick_per_line_min": v.pick_per_line,
                                 "load_min": v.load_min, "unit": v.unit} for k, v in cfg.item_groups.items()])
    costs = pd.DataFrame([{"parameter": k, "value": v, "unit": "VND"} for k, v in vars(cfg.cost).items()])
    meta = {
        "data_version": f"SYN-s{seed}-{now:%Y%m%d}",
        "mode": "SYNTHETIC",
        "readiness": "D0",
        "seed": seed,
        "now": now.isoformat(),
        "history_start": t_start.isoformat(),
        "future_end": t_future_end.isoformat(),
        "n_requests": int(len(req)),
        "n_events": int(len(events)),
        "sim_logic_errors": res.logic_errors,
        "generated_seconds": round(time.time() - tick, 1),
        "storyline": "S2 plan +30% on L1/L2 (new model ramp-up); TG3 planned maintenance 13:00-16:00",
    }
    prog(1.0, "done")
    return {
        "requests": req, "process_events": events, "resources": resources, "resource_calendar": calendar,
        "production_plan": plan, "disruptions": dis_all, "routes": routes, "item_master": item_master,
        "cost_parameters": costs, "snapshot": snapshot, "meta": meta,
    }
