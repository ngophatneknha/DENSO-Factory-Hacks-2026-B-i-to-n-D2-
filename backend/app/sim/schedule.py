"""Resource master, shift calendar and conversion to simulator specs.

Calendar day starts at 06:00 (S1). Operating pattern (assumption): Mon-Fri 3 shifts, Sat S1+S2, Sun S1.
Tugger i is driven by driver i of the crew on duty; tugger availability = driver on duty AND no maintenance.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import pandas as pd

from ..domain import SHIFTS, SHIFT_MIN, FactoryConfig
from .engine import SimParams, TuggerSpec, WorkerSpec

STAGE_PREFIX = {"picking": "PK", "loading": "LD", "transport": "DR"}


def operating_shifts(day: pd.Timestamp) -> List[str]:
    dow = day.dayofweek  # Mon=0
    if dow <= 4:
        return ["S1", "S2", "S3"]
    if dow == 5:
        return ["S1", "S2"]
    return ["S1"]


def build_resources(cfg: FactoryConfig) -> pd.DataFrame:
    rows = []
    for stage, per_shift in cfg.staffing.items():
        for shift, n in per_shift.items():
            for i in range(1, n + 1):
                skills = [stage]
                if stage == "picking" and i <= cfg.cross_trained_pickers.get(shift, 0):
                    skills.append("loading")
                if stage == "transport" and i <= cfg.cross_trained_drivers.get(shift, 0):
                    skills.append("loading")
                rows.append({
                    "resource_id": f"{STAGE_PREFIX[stage]}-{shift}-{i}",
                    "type": {"picking": "picker", "loading": "loader", "transport": "driver"}[stage],
                    "home_stage": stage,
                    "skill": "|".join(skills),
                    "shift": shift,
                    "area": cfg.area_id,
                    "capacity_unit": "person-min",
                })
    for t in range(1, cfg.tuggers + 1):
        rows.append({"resource_id": f"TG{t}", "type": "tugger", "home_stage": "transport", "skill": "transport",
                     "shift": "ALL", "area": cfg.area_id, "capacity_unit": f"{cfg.tugger_capacity} req/trip"})
    for d in range(1, cfg.docks + 1):
        rows.append({"resource_id": f"DK{d}", "type": "dock", "home_stage": "loading", "skill": "loading",
                     "shift": "ALL", "area": cfg.area_id, "capacity_unit": "1 loader"})
    return pd.DataFrame(rows)


def build_calendar(cfg: FactoryConfig, first_day: pd.Timestamp, n_days: int) -> pd.DataFrame:
    """One row per person per operated shift (people resources only)."""
    rows = []
    res = build_resources(cfg)
    people = res[res["type"].isin(["picker", "loader", "driver"])]
    for d in range(n_days):
        day = (first_day + pd.Timedelta(days=d)).normalize()
        for shift, start_h in SHIFTS:
            if shift not in operating_shifts(day):
                continue
            s = day + pd.Timedelta(hours=start_h)
            e = s + pd.Timedelta(minutes=SHIFT_MIN)
            crew = people[people["shift"] == shift]
            for k, (_, r) in enumerate(crew.iterrows()):
                off = cfg.break_offsets_min[k % len(cfg.break_offsets_min)]
                bs = s + pd.Timedelta(minutes=off)
                rows.append({
                    "date": day.date().isoformat(), "shift": shift, "resource_id": r["resource_id"],
                    "stage": r["home_stage"], "start_at": s, "end_at": e,
                    "break_start": bs, "break_end": bs + pd.Timedelta(minutes=cfg.break_len_min),
                    "available_minutes": SHIFT_MIN - cfg.break_len_min,
                })
    return pd.DataFrame(rows)


# --------------------------------------------------------------------------------------------
# Adjustments (actions) applied on top of the calendar
# --------------------------------------------------------------------------------------------
@dataclass
class Adjustments:
    moves: List[dict] = field(default_factory=list)  # {from, to, n, start, end, resource_ids?}
    temps: List[dict] = field(default_factory=list)  # {stage, n, start, end}
    priority: Optional[str] = None
    tugger_cycle_min: Optional[float] = None
    tugger_capacity: Optional[int] = None
    extra_tuggers: List[dict] = field(default_factory=list)  # diagnostic only {start, end}


def _subtract(intervals: List[Tuple[float, float]], cut: Tuple[float, float]) -> List[Tuple[float, float]]:
    out = []
    a, b = cut
    for s, e in intervals:
        if e <= a or s >= b:
            out.append((s, e))
            continue
        if s < a:
            out.append((s, a))
        if e > b:
            out.append((b, e))
    return out


def _split_by_window(segs: List[Tuple[float, float, str]], w: Tuple[float, float], new_stage: str):
    out = []
    a, b = w
    for s, e, st in segs:
        if e <= a or s >= b:
            out.append((s, e, st))
            continue
        if s < a:
            out.append((s, a, st))
        out.append((max(s, a), min(e, b), new_stage))
        if e > b:
            out.append((b, e, st))
    return out


def to_min(ts, t0: pd.Timestamp) -> float:
    return (pd.Timestamp(ts) - t0).total_seconds() / 60.0


def build_specs(cfg: FactoryConfig, calendar: pd.DataFrame, disruptions: pd.DataFrame, t0: pd.Timestamp,
                horizon_min: float, adj: Optional[Adjustments] = None,
                resources: Optional[pd.DataFrame] = None) -> Tuple[List[WorkerSpec], List[TuggerSpec], SimParams, dict]:
    """Convert calendar + disruptions + adjustments into simulator specs for [t0, t0+H]."""
    adj = adj or Adjustments()
    resources = resources if resources is not None else build_resources(cfg)
    skills = dict(zip(resources["resource_id"], resources["skill"]))
    t_end = t0 + pd.Timedelta(minutes=horizon_min)
    cal = calendar[(calendar["end_at"] > t0) & (calendar["start_at"] < t_end)]
    dis = disruptions if disruptions is not None and len(disruptions) else pd.DataFrame(
        columns=["start_at", "end_at", "resource_id", "reason_code"])
    dis = dis[(dis["end_at"] > t0) & (dis["start_at"] < t_end)]

    # person segments
    person: Dict[str, List[Tuple[float, float, str]]] = {}
    for _, r in cal.iterrows():
        ivs = [(to_min(r["start_at"], t0), to_min(r["end_at"], t0))]
        ivs = _subtract(ivs, (to_min(r["break_start"], t0), to_min(r["break_end"], t0)))
        for _, d in dis[dis["resource_id"] == r["resource_id"]].iterrows():
            ivs = _subtract(ivs, (to_min(d["start_at"], t0), to_min(d["end_at"], t0)))
        person.setdefault(r["resource_id"], []).extend((s, e, r["stage"]) for s, e in ivs)

    # tugger maintenance windows (minutes)
    tug_down: Dict[str, List[Tuple[float, float]]] = {}
    for _, d in dis[dis["resource_id"].astype(str).str.startswith("TG")].iterrows():
        tug_down.setdefault(d["resource_id"], []).append((to_min(d["start_at"], t0), to_min(d["end_at"], t0)))

    applied = {"moves": [], "temps": [], "notes": []}
    # moves
    for mv in adj.moves:
        a, b = to_min(mv["start"], t0), to_min(mv["end"], t0)
        cands = mv.get("resource_ids") or [
            rid for rid, segs in person.items()
            if any(st == mv["from"] and s < b and e > a for s, e, st in segs)
            and mv["to"] in skills.get(rid, "").split("|")
        ]
        chosen = cands[: int(mv.get("n", 1))]
        for rid in chosen:
            person[rid] = _split_by_window(person[rid], (a, b), mv["to"])
        applied["moves"].append({**mv, "resource_ids": chosen})
    # temps
    for k, tp in enumerate(adj.temps):
        a, b = to_min(tp["start"], t0), to_min(tp["end"], t0)
        for j in range(int(tp.get("n", 1))):
            rid = f"TMP-{tp['stage'][:2].upper()}-{k + 1}-{j + 1}"
            person[rid] = [(a, b, tp["stage"])]
            applied["temps"].append({**tp, "resource_id": rid})

    workers: List[WorkerSpec] = []
    tugger_windows: Dict[str, List[Tuple[float, float]]] = {f"TG{i}": [] for i in range(1, cfg.tuggers + 1)}
    for rid, segs in person.items():
        wsegs = [(s, e, st) for s, e, st in segs if st != "transport" and e > s]
        if wsegs:
            workers.append(WorkerSpec(rid, wsegs))
        tsegs = [(s, e) for s, e, st in segs if st == "transport" and e > s]
        if tsegs and rid.startswith("DR-"):
            idx = int(rid.split("-")[-1])
            tid = f"TG{idx}"
            if tid in tugger_windows:
                tugger_windows[tid].extend(tsegs)
    tuggers: List[TuggerSpec] = []
    for tid, wins in tugger_windows.items():
        for cut in tug_down.get(tid, []):
            wins = _subtract(wins, cut)
        tuggers.append(TuggerSpec(tid, sorted(w for w in wins if w[1] > w[0])))
    for k, xt in enumerate(adj.extra_tuggers):
        tuggers.append(TuggerSpec(f"TGX{k + 1}", [(to_min(xt["start"], t0), to_min(xt["end"], t0))]))

    params = SimParams(
        priority=adj.priority or "FIFO",
        tugger_capacity=adj.tugger_capacity or cfg.tugger_capacity,
        tugger_cycle_min=adj.tugger_cycle_min or cfg.tugger_cycle_min,
        tugger_dock_load_min=cfg.tugger_dock_load_min,
        tugger_load_per_req_min=cfg.tugger_load_per_req_min,
        unload_per_req_min=cfg.unload_per_req_min,
        docks=cfg.docks,
        route_pos={l.id: l.route_pos_min for l in cfg.lines},
        return_min={l.id: l.return_min for l in cfg.lines},
        service_sigma=cfg.service_sigma,
        travel_sigma=cfg.travel_sigma,
    )
    return workers, tuggers, params, applied


def staffing_on_duty(workers: List[WorkerSpec], tuggers: List[TuggerSpec], t: float) -> Dict[str, int]:
    out = {"picking": 0, "loading": 0, "transport": 0}
    for w in workers:
        for s, e, st in w.segments:
            if s <= t < e:
                out[st] = out.get(st, 0) + 1
    for tg in tuggers:
        if any(s <= t < e for s, e in tg.windows):
            out["transport"] += 1
    return out
