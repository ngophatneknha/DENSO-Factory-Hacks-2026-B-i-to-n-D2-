"""Discrete-event simulator of the intralogistics supply flow (SimPy).

Entity  : material supply request (one line-side replenishment order)
Stages  : picking (pickers) -> loading (loaders + docks) -> tugger milk-run transport -> delivery at line
Workers : pull model with time-varying segments (shift, break, reassignment) -> supports
          resource moves between stages, temporary workers and absences.
Tuggers : depart on a cycle or when full; availability windows encode driver shifts & maintenance.

Time unit is minutes relative to t0 of the run. Randomness is pre-sampled per request so that
alternative actions evaluated with the same seed share Common Random Numbers (CRN).
"""
from __future__ import annotations

import heapq
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import simpy

STAGE_PICK, STAGE_LOAD, STAGE_TRANS = "picking", "loading", "transport"


@dataclass
class WorkerSpec:
    worker_id: str
    segments: List[Tuple[float, float, str]]  # (start, end, stage)


@dataclass
class TuggerSpec:
    tugger_id: str
    windows: List[Tuple[float, float]]


@dataclass
class SimParams:
    priority: str = "FIFO"  # FIFO | EDD
    tugger_capacity: int = 8
    tugger_cycle_min: float = 20.0
    tugger_dock_load_min: float = 1.0
    tugger_load_per_req_min: float = 0.25
    unload_per_req_min: float = 0.8
    docks: int = 4
    route_pos: Dict[str, float] = field(default_factory=dict)
    return_min: Dict[str, float] = field(default_factory=dict)
    service_sigma: float = 0.28
    travel_sigma: float = 0.15
    monitor_step: float = 15.0


@dataclass
class SimInput:
    horizon_min: float
    requests: pd.DataFrame  # request_id, line_id, item_group, n_lines, arrival_min, due_min,
    #                         pick_std, load_std, start_stage
    workers: List[WorkerSpec]
    tuggers: List[TuggerSpec]
    params: SimParams
    seed: int = 0


@dataclass
class SimResult:
    requests: pd.DataFrame  # input + timestamps per stage + resource ids
    trips: pd.DataFrame
    queue_ts: pd.DataFrame  # t, picking, loading, transport (waiting counts)
    busy: Dict[str, float]
    available: Dict[str, float]
    horizon_min: float
    logic_errors: List[str]


class _JobQueue:
    __slots__ = ("env", "heap", "counter", "_ev")

    def __init__(self, env: simpy.Environment):
        self.env = env
        self.heap: list = []
        self.counter = 0
        self._ev = env.event()

    def push(self, idx: int, key: float) -> None:
        heapq.heappush(self.heap, (key, self.counter, idx))
        self.counter += 1
        ev = self._ev
        self._ev = self.env.event()
        ev.succeed()

    def pop(self) -> Optional[int]:
        if self.heap:
            return heapq.heappop(self.heap)[2]
        return None

    def pop_many(self, n: int) -> List[int]:
        out = []
        while self.heap and len(out) < n:
            out.append(heapq.heappop(self.heap)[2])
        return out

    def wait(self):
        return self._ev

    def __len__(self) -> int:
        return len(self.heap)


def _lognormal_mult(rng: np.random.Generator, sigma: float, size) -> np.ndarray:
    return np.exp(rng.normal(-0.5 * sigma * sigma, sigma, size))


def run_simulation(inp: SimInput) -> SimResult:
    p = inp.params
    req = inp.requests.reset_index(drop=True)
    n = len(req)
    H = float(inp.horizon_min)

    rng = np.random.default_rng([inp.seed, 1])
    pick_mult = _lognormal_mult(rng, p.service_sigma, n)
    load_mult = _lognormal_mult(rng, p.service_sigma, n)
    rng_travel = np.random.default_rng([inp.seed, 2])

    arrival = req["arrival_min"].to_numpy(dtype=float)
    due = req["due_min"].to_numpy(dtype=float)
    pick_std = req["pick_std"].to_numpy(dtype=float)
    load_std = req["load_std"].to_numpy(dtype=float)
    lines = req["line_id"].to_numpy()
    start_stage = req["start_stage"].to_numpy() if "start_stage" in req else np.array([STAGE_PICK] * n)
    key_arr = due if p.priority.upper() == "EDD" else arrival

    nan = np.full(n, np.nan)
    pick_start, pick_end = nan.copy(), nan.copy()
    load_start, load_end = nan.copy(), nan.copy()
    depart, delivered = nan.copy(), nan.copy()
    picker_id = np.empty(n, dtype=object)
    loader_id = np.empty(n, dtype=object)
    tugger_id = np.empty(n, dtype=object)

    env = simpy.Environment()
    q = {STAGE_PICK: _JobQueue(env), STAGE_LOAD: _JobQueue(env), STAGE_TRANS: _JobQueue(env)}
    dock = simpy.Resource(env, capacity=max(1, int(p.docks)))
    busy = {STAGE_PICK: 0.0, STAGE_LOAD: 0.0, STAGE_TRANS: 0.0}
    available = {STAGE_PICK: 0.0, STAGE_LOAD: 0.0, STAGE_TRANS: 0.0}
    trips: list = []
    queue_ts: list = []

    order = np.argsort(arrival, kind="stable")

    def arrivals():
        for idx in order:
            t = max(0.0, arrival[idx])
            if t > env.now:
                yield env.timeout(t - env.now)
            q[start_stage[idx]].push(int(idx), key_arr[idx])

    def worker(spec: WorkerSpec):
        for s, e, stage in sorted(spec.segments):
            s, e = max(0.0, s), min(H, e)
            if e <= s:
                continue
            available[stage] += e - s
            if env.now < s:
                yield env.timeout(s - env.now)
            if env.now >= e:
                continue
            queue = q[stage]
            while env.now < e - 1e-9:
                idx = queue.pop()
                if idx is None:
                    yield queue.wait() | env.timeout(e - env.now)
                    continue
                if stage == STAGE_PICK:
                    pick_start[idx] = env.now
                    picker_id[idx] = spec.worker_id
                    dur = pick_std[idx] * pick_mult[idx]
                    yield env.timeout(dur)
                    pick_end[idx] = env.now
                    busy[STAGE_PICK] += dur
                    q[STAGE_LOAD].push(idx, key_arr[idx])
                elif stage == STAGE_LOAD:
                    with dock.request() as r:
                        yield r
                        load_start[idx] = env.now
                        loader_id[idx] = spec.worker_id
                        dur = load_std[idx] * load_mult[idx]
                        yield env.timeout(dur)
                        load_end[idx] = env.now
                        busy[STAGE_LOAD] += dur
                    q[STAGE_TRANS].push(idx, key_arr[idx])
                else:  # a person assigned to transport without a tugger cannot work
                    queue.push(idx, key_arr[idx])
                    yield env.timeout(e - env.now)

    def tugger(spec: TuggerSpec):
        staged = q[STAGE_TRANS]
        for s, e in sorted(spec.windows):
            s, e = max(0.0, s), min(H, e)
            if e <= s:
                continue
            available[STAGE_TRANS] += e - s
            if env.now < s:
                yield env.timeout(s - env.now)
            last_dep = env.now - p.tugger_cycle_min
            while env.now < e - 1e-9:
                if len(staged) == 0:
                    yield staged.wait() | env.timeout(e - env.now)
                    continue
                next_dep = last_dep + p.tugger_cycle_min
                if len(staged) < p.tugger_capacity and env.now < next_dep - 1e-9:
                    yield staged.wait() | env.timeout(min(next_dep, e) - env.now)
                    continue
                batch = staged.pop_many(p.tugger_capacity)
                t0 = env.now
                last_dep = t0
                yield env.timeout(p.tugger_dock_load_min + p.tugger_load_per_req_min * len(batch))
                for i in batch:
                    depart[i] = env.now
                    tugger_id[i] = spec.tugger_id
                by_line: Dict[str, list] = {}
                for i in batch:
                    by_line.setdefault(lines[i], []).append(i)
                pos = 0.0
                last_line = None
                for ln in sorted(by_line, key=lambda x: p.route_pos.get(x, 0.0)):
                    seg = max(0.0, p.route_pos.get(ln, 0.0) - pos)
                    yield env.timeout(seg * float(_lognormal_mult(rng_travel, p.travel_sigma, 1)[0]))
                    pos = p.route_pos.get(ln, 0.0)
                    for i in by_line[ln]:
                        yield env.timeout(p.unload_per_req_min * float(_lognormal_mult(rng_travel, p.service_sigma, 1)[0]))
                        delivered[i] = env.now
                    last_line = ln
                back = p.return_min.get(last_line, 5.0)
                yield env.timeout(back * float(_lognormal_mult(rng_travel, p.travel_sigma, 1)[0]))
                dur = env.now - t0
                busy[STAGE_TRANS] += dur
                trips.append((spec.tugger_id, t0, env.now, len(batch)))

    def monitor():
        while env.now <= H:
            queue_ts.append((env.now, len(q[STAGE_PICK]), len(q[STAGE_LOAD]), len(q[STAGE_TRANS])))
            yield env.timeout(p.monitor_step)

    env.process(arrivals())
    for w in inp.workers:
        env.process(worker(w))
    for t in inp.tuggers:
        env.process(tugger(t))
    env.process(monitor())
    env.run(until=H)

    out = req.copy()
    out["pick_start"], out["pick_end"] = pick_start, pick_end
    out["load_start"], out["load_end"] = load_start, load_end
    out["depart"], out["delivered"] = depart, delivered
    out["picker_id"], out["loader_id"], out["tugger_id"] = picker_id, loader_id, tugger_id

    res = SimResult(
        requests=out,
        trips=pd.DataFrame(trips, columns=["tugger_id", "depart", "return", "n"]),
        queue_ts=pd.DataFrame(queue_ts, columns=["t", STAGE_PICK, STAGE_LOAD, STAGE_TRANS]),
        busy=busy,
        available=available,
        horizon_min=H,
        logic_errors=[],
    )
    res.logic_errors = check_logic(res)
    return res


def check_logic(res: SimResult) -> List[str]:
    """Logic validation layer (proposal §9 tier 1): conservation and precedence."""
    r = res.requests
    errs = []
    eps = 1e-6
    if ((r["pick_end"] < r["pick_start"] - eps)).any():
        errs.append("pick_end before pick_start")
    st = r.get("start_stage", pd.Series(STAGE_PICK, index=r.index))
    from_pick = st == STAGE_PICK
    if (from_pick & r["load_start"].notna() & (r["pick_end"].isna() | (r["load_start"] < r["pick_end"] - eps))).any():
        errs.append("loading started before picking finished")
    from_load = st.isin([STAGE_PICK, STAGE_LOAD])
    if (from_load & r["depart"].notna() & (r["load_end"].isna() | (r["depart"] < r["load_end"] - eps))).any():
        errs.append("tugger departed before loading finished")
    if ((r["delivered"].notna()) & (r["depart"].isna() | (r["delivered"] < r["depart"] - eps))).any():
        errs.append("delivered before departure")
    if (r["arrival_min"].ge(0) & r["pick_start"].notna() & (r["pick_start"] < r["arrival_min"] - eps)).any():
        errs.append("picking started before request created")
    if len(res.trips) and (res.trips["n"] > res.trips["n"].max()).any():
        errs.append("tugger capacity exceeded")
    # conservation: every request is in exactly one state
    n_done = r["delivered"].notna().sum()
    n_open = r["delivered"].isna().sum()
    if n_done + n_open != len(r):
        errs.append("request conservation violated")
    return errs


def compute_kpis(res: SimResult, eval_from: float = 0.0, eval_to: Optional[float] = None) -> dict:
    """KPIs on requests due inside [eval_from, eval_to]. Open requests past due count as late."""
    H = res.horizon_min
    eval_to = H if eval_to is None else eval_to
    r = res.requests
    due = r["due_min"].to_numpy()
    deliv = r["delivered"].to_numpy()
    arr = r["arrival_min"].to_numpy()
    m = (due >= eval_from) & (due <= eval_to)
    completion = np.where(np.isnan(deliv), H, deliv)
    lateness = np.clip(completion - due, 0, None)
    late = completion > due + 1e-9
    done = ~np.isnan(deliv)
    lead = (deliv - arr)[done & (arr >= 0)]
    qts = res.queue_ts
    qm = qts[(qts["t"] >= eval_from) & (qts["t"] <= eval_to)] if len(qts) else qts
    util = {k: (res.busy[k] / res.available[k] if res.available[k] > 0 else None) for k in res.busy}
    trips_in = res.trips[(res.trips["depart"] >= eval_from) & (res.trips["depart"] <= eval_to)] if len(res.trips) else res.trips
    return {
        "n_due": int(m.sum()),
        "n_late": int((late & m).sum()),
        "late_rate": float((late & m).sum() / m.sum()) if m.sum() else 0.0,
        "late_minutes": float(lateness[m].sum()),
        "lead_p50": float(np.percentile(lead, 50)) if len(lead) else None,
        "lead_p90": float(np.percentile(lead, 90)) if len(lead) else None,
        "throughput": int(((deliv >= eval_from) & (deliv <= eval_to)).sum()),
        "max_queue": {k: int(qm[k].max()) if len(qm) else 0 for k in (STAGE_PICK, STAGE_LOAD, STAGE_TRANS)},
        "utilization": util,
        "trips": int(len(trips_in)),
        "open_at_end": int((~done).sum()),
    }
