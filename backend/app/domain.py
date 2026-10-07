"""Factory domain configuration for the pilot intralogistics flow.

Flow: Warehouse/Supermarket -> Picking -> Loading (docks) -> Tugger transport -> Delivery at line.
All numbers are DESIGN ASSUMPTIONS for synthetic data (proposal A01/A02), not DENSO facts.
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Dict, List


SHIFTS = [("S1", 6), ("S2", 14), ("S3", 22)]  # shift id, start hour; each 8h
SHIFT_MIN = 480
BUCKET_MIN = 15
STAGES = ["picking", "loading", "transport"]  # stages with own resources
FLOW_STAGES = ["picking", "loading", "transport", "delivery"]  # for flow map


@dataclass
class LineCfg:
    id: str
    name: str
    base_plan_per_hour: float  # planned units/hour on a normal shift
    req_per_unit: float  # material requests per produced unit
    mix: Dict[str, float]  # item group mix
    route_pos_min: float  # cumulative travel minutes from dock along milk-run
    return_min: float  # travel minutes back to dock from this line


@dataclass
class ItemGroupCfg:
    pick_base: float  # minutes per request
    pick_per_line: float  # minutes per order line
    load_min: float  # minutes per request at loading dock
    unit: str


@dataclass
class CostCfg:
    late_minute_vnd: float = 2500.0  # conversion of 1 late-minute -> VND (needs business approval)
    overtime_hour_vnd: float = 95000.0  # internal staff overtime per person-hour
    temp_worker_hour_vnd: float = 120000.0
    tugger_trip_vnd: float = 6000.0  # energy + wear per trip
    spare_tugger_hour_vnd: float = 85000.0  # bringing the spare tugger into service
    big_trailer_hour_vnd: float = 20000.0  # larger trailer set (extra handling)


@dataclass
class FactoryConfig:
    site_id: str = "VN-HN-01"
    area_id: str = "SMKT-A"
    lines: List[LineCfg] = field(default_factory=list)
    item_groups: Dict[str, ItemGroupCfg] = field(default_factory=dict)
    # staffing per stage per shift (pickers, loaders, tugger drivers)
    staffing: Dict[str, Dict[str, int]] = field(default_factory=dict)
    cross_trained_pickers: Dict[str, int] = field(default_factory=dict)  # pickers able to load
    cross_trained_drivers: Dict[str, int] = field(default_factory=dict)  # drivers able to load
    min_staff: Dict[str, int] = field(default_factory=dict)
    docks: int = 4
    tuggers: int = 3
    spare_tuggers: int = 0
    tugger_capacity: int = 8
    tugger_cycle_min: float = 20.0
    tugger_dock_load_min: float = 1.0
    tugger_load_per_req_min: float = 0.25
    unload_per_req_min: float = 0.8
    due_minutes: float = 90.0
    efficiency: float = 0.9  # share of paid time usable for work (capacity model)
    break_offsets_min: List[int] = field(default_factory=lambda: [240, 270])
    break_len_min: int = 30
    service_sigma: float = 0.28  # lognormal multiplicative noise
    travel_sigma: float = 0.15
    overtime_budget_vnd: float = 1_500_000.0  # per decision window
    cost: CostCfg = field(default_factory=CostCfg)

    def to_dict(self) -> dict:
        return asdict(self)

    @property
    def line_ids(self) -> List[str]:
        return [l.id for l in self.lines]

    def line(self, line_id: str) -> LineCfg:
        for l in self.lines:
            if l.id == line_id:
                return l
        raise KeyError(line_id)

    def avg_trip_min(self) -> float:
        far = max(self.lines, key=lambda l: l.route_pos_min)
        return (self.tugger_dock_load_min + self.tugger_load_per_req_min * self.tugger_capacity
                + far.route_pos_min + far.return_min + self.unload_per_req_min * self.tugger_capacity)

    def std_minutes(self, item_group: str, n_lines: int) -> Dict[str, float]:
        g = self.item_groups[item_group]
        return {
            "picking": g.pick_base + g.pick_per_line * n_lines,
            "loading": g.load_min,
            # tugger-minutes attributable to one request on a full trip
            "transport": self.avg_trip_min() / self.tugger_capacity,
        }


def default_config() -> FactoryConfig:
    return FactoryConfig(
        lines=[
            LineCfg("L1", "Line 1 · Compressor", 120, 0.105, {"A": 0.50, "B": 0.35, "C": 0.15}, 3.0, 5.0),
            LineCfg("L2", "Line 2 · Radiator", 95, 0.115, {"A": 0.35, "B": 0.40, "C": 0.25}, 5.5, 5.5),
            LineCfg("L3", "Line 3 · Starter", 100, 0.100, {"A": 0.55, "B": 0.30, "C": 0.15}, 8.5, 5.0),
            LineCfg("L4", "Line 4 · Inverter", 70, 0.125, {"A": 0.60, "B": 0.30, "C": 0.10}, 11.0, 4.0),
        ],
        item_groups={
            "A": ItemGroupCfg(pick_base=1.0, pick_per_line=0.65, load_min=1.2, unit="bin"),
            "B": ItemGroupCfg(pick_base=1.6, pick_per_line=0.9, load_min=2.0, unit="box"),
            "C": ItemGroupCfg(pick_base=2.6, pick_per_line=1.2, load_min=3.6, unit="pallet"),
        },
        staffing={
            "picking": {"S1": 4, "S2": 4, "S3": 3},
            "loading": {"S1": 2, "S2": 2, "S3": 2},
            "transport": {"S1": 3, "S2": 3, "S3": 2},
        },
        cross_trained_pickers={"S1": 1, "S2": 1, "S3": 1},
        cross_trained_drivers={"S1": 3, "S2": 3, "S3": 2},
        min_staff={"picking": 3, "loading": 1, "transport": 1},
        docks=3,
        spare_tuggers=1,
    )


def shift_of_hour(hour: int) -> str:
    if 6 <= hour < 14:
        return "S1"
    if 14 <= hour < 22:
        return "S2"
    return "S3"
