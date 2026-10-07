"""Action catalog and hard constraint validation for intralogistics dispatching.

Ref: Proposal §11 (Recommend):
- Permitted finite action catalog
- Hard constraint filtering (skills, min staffing at donor stage, physical dock/tugger limits)
- Infeasible actions are flagged with clear violation reasons.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd

from ..domain import FactoryConfig, STAGES
from ..sim.schedule import Adjustments


@dataclass
class ActionCandidate:
    action_id: str
    name: str
    description: str
    action_type: str  # REASSIGN | PRIORITY | CYCLE | SPARE_RESOURCE | COMBINED
    adjustments: Adjustments
    cost_vnd: float
    is_feasible: bool = True
    infeasibility_reason: Optional[str] = None


def generate_action_catalog(
    cfg: FactoryConfig,
    t0: pd.Timestamp,
    horizon_min: float = 480.0,
    calendar: Optional[pd.DataFrame] = None,
    current_shift: str = "S1",
) -> List[ActionCandidate]:
    """Generate the finite set of operational dispatch candidate actions."""
    peak_start = t0 + pd.Timedelta(hours=1.5)
    peak_end = t0 + pd.Timedelta(hours=5.5)
    duration_hours = (peak_end - peak_start).total_seconds() / 3600.0

    candidates = [
        ActionCandidate(
            action_id="ACT_BASE",
            name="Phương án 0: Giữ nguyên hiện trạng (Baseline)",
            description="Không can thiệp, giữ nguyên lịch ca, số lượng xe và thứ tự phục vụ FIFO.",
            action_type="BASE",
            adjustments=Adjustments(priority="FIFO"),
            cost_vnd=0.0,
        ),
        ActionCandidate(
            action_id="ACT_EDD_PRIORITY",
            name="Phương án 1: Đổi quy tắc ưu tiên sang EDD (Earliest Due Date)",
            description="Ưu tiên phục vụ các yêu cầu có thời hạn đến chuyền gấp nhất thay vì theo thứ tự đến (FIFO).",
            action_type="PRIORITY",
            adjustments=Adjustments(priority="EDD"),
            cost_vnd=0.0,
        ),
        ActionCandidate(
            action_id="ACT_REASSIGN_PICK_TO_LOAD",
            name="Phương án 2: Điều chuyển 1 nhân viên Picking sang Dock Loading",
            description="Tận dụng nhân viên có kỹ năng kép hỗ trợ bốc hàng tại dock trong khung cao điểm.",
            action_type="REASSIGN",
            adjustments=Adjustments(
                moves=[{"from": "picking", "to": "loading", "n": 1, "start": peak_start, "end": peak_end}]
            ),
            cost_vnd=0.0,  # Internal staff reallocation within regular hours
        ),
        ActionCandidate(
            action_id="ACT_TIGHTEN_CYCLE",
            name="Phương án 3: Rút ngắn nhịp xuất bến Tugger xuống 15 phút",
            description="Tăng tần suất gom và giao hàng milk-run từ 20 phút xuống 15 phút để giảm thời gian chờ tồn tại dock.",
            action_type="CYCLE",
            adjustments=Adjustments(tugger_cycle_min=15.0),
            cost_vnd=3.0 * cfg.cost.tugger_trip_vnd,  # ~3 extra trips
        ),
        ActionCandidate(
            action_id="ACT_ACTIVATE_SPARE_TUGGER",
            name="Phương án 4: Kích hoạt xe Tugger dự phòng (TG_SPARE)",
            description="Đưa xe dự phòng vào chạy tăng cường trong 4 giờ cao điểm để bù đắp năng lực vận chuyển.",
            action_type="SPARE_RESOURCE",
            adjustments=Adjustments(extra_tuggers=[{"start": peak_start, "end": peak_end}]),
            cost_vnd=duration_hours * cfg.cost.spare_tugger_hour_vnd,
        ),
        ActionCandidate(
            action_id="ACT_COMBINED_BEST",
            name="Phương án 5 (Tổ hợp): Điều chuyển 1 người + EDD + Nhịp 15 phút",
            description="Kết hợp đồng thời điều phối nhân lực dock, siết nhịp xe 15m và quy tắc ưu tiên đơn gấp.",
            action_type="COMBINED",
            adjustments=Adjustments(
                priority="EDD",
                tugger_cycle_min=15.0,
                moves=[{"from": "picking", "to": "loading", "n": 1, "start": peak_start, "end": peak_end}],
            ),
            cost_vnd=3.0 * cfg.cost.tugger_trip_vnd,
        ),
    ]

    # Validate Hard Constraints
    for act in candidates:
        # Check skill and minimum staff for worker moves
        for mv in act.adjustments.moves:
            donor_stage = mv["from"]
            curr_staff = cfg.staffing.get(donor_stage, {}).get(current_shift, 0)
            min_required = cfg.min_staff.get(donor_stage, 1)
            cross_trained = cfg.cross_trained_pickers.get(current_shift, 0)

            if mv["n"] > cross_trained:
                act.is_feasible = False
                act.infeasibility_reason = (
                    f"Không đủ nhân sự có chứng chỉ kỹ năng '{mv['to']}' (Cần {mv['n']}, chỉ có {cross_trained})."
                )
            elif (curr_staff - mv["n"]) < min_required:
                act.is_feasible = False
                act.infeasibility_reason = (
                    f"Vi phạm ràng buộc nhân sự tối thiểu tại công đoạn cho {donor_stage} (Còn lại < {min_required})."
                )

        # Check spare tugger availability
        if act.adjustments.extra_tuggers and cfg.spare_tuggers < len(act.adjustments.extra_tuggers):
            act.is_feasible = False
            act.infeasibility_reason = f"Không có đủ xe tugger dự phòng sẵn sàng (Cần {len(act.adjustments.extra_tuggers)}, có {cfg.spare_tuggers})."

        # Check budget constraint
        if act.cost_vnd > cfg.overtime_budget_vnd:
            act.is_feasible = False
            act.infeasibility_reason = f"Chi phí can thiệp ({act.cost_vnd:,.0f} đ) vượt ngân sách cho phép ({cfg.overtime_budget_vnd:,.0f} đ)."

    return candidates
