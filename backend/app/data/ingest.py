"""Data ingestion and export template generator for CSV/Excel uploads.

Supports importing:
- requests.csv / .xlsx
- production_plan.csv / .xlsx
- resource_calendar.csv / .xlsx
- disruptions.csv / .xlsx
"""
from __future__ import annotations

import io
from pathlib import Path
from typing import Dict, Any, List
import pandas as pd

from ..domain import FactoryConfig, default_config


TEMPLATE_SCHEMAS = {
    "01_Production_Plan": {
        "columns": ["line_id", "line_name", "hour_start", "planned_qty", "takt_sec", "revision_no", "revision_time", "surge_flag"],
        "description": "File Excel #1: Kế hoạch lắp ráp Heijunka theo giờ (Line 1..4) & lịch sử điều chỉnh đơn hàng (+30%)",
        "sample": [
            {"line_id": "L1", "line_name": "Line 1 · Compressor", "hour_start": "2026-10-07 08:00:00", "planned_qty": 120, "takt_sec": 30.0, "revision_no": 0, "revision_time": "2026-10-06 18:00:00", "surge_flag": "NORMAL"},
            {"line_id": "L1", "line_name": "Line 1 · Compressor", "hour_start": "2026-10-07 09:00:00", "planned_qty": 156, "takt_sec": 23.1, "revision_no": 1, "revision_time": "2026-10-07 05:30:00", "surge_flag": "SURGE_+30%"},
            {"line_id": "L1", "line_name": "Line 1 · Compressor", "hour_start": "2026-10-07 10:00:00", "planned_qty": 156, "takt_sec": 23.1, "revision_no": 1, "revision_time": "2026-10-07 05:30:00", "surge_flag": "SURGE_+30%"},
            {"line_id": "L2", "line_name": "Line 2 · Radiator", "hour_start": "2026-10-07 09:00:00", "planned_qty": 124, "takt_sec": 29.0, "revision_no": 1, "revision_time": "2026-10-07 05:30:00", "surge_flag": "SURGE_+30%"},
            {"line_id": "L2", "line_name": "Line 2 · Radiator", "hour_start": "2026-10-07 10:00:00", "planned_qty": 124, "takt_sec": 29.0, "revision_no": 1, "revision_time": "2026-10-07 05:30:00", "surge_flag": "SURGE_+30%"},
            {"line_id": "L3", "line_name": "Line 3 · Starter", "hour_start": "2026-10-07 10:00:00", "planned_qty": 100, "takt_sec": 36.0, "revision_no": 0, "revision_time": "2026-10-06 18:00:00", "surge_flag": "NORMAL"},
            {"line_id": "L4", "line_name": "Line 4 · Inverter", "hour_start": "2026-10-07 10:00:00", "planned_qty": 70, "takt_sec": 51.4, "revision_no": 0, "revision_time": "2026-10-06 18:00:00", "surge_flag": "NORMAL"},
        ]
    },
    "02_BOM_Item_Master": {
        "columns": ["item_group", "part_code", "part_name", "handling_stream", "pack_unit", "std_qty_per_pack", "pick_base_min", "pick_per_line_min", "load_min", "dock_slot_equiv"],
        "description": "File Excel #2: Định mức vật tư BOM, quy cách đóng gói (Bin/Box/Pallet) & thời gian chuẩn ST",
        "sample": [
            {"item_group": "A", "part_code": "DN-INV-IC01", "part_name": "Cảm biến & Vi mạch Điều khiển Nhỏ", "handling_stream": "GTP Shuttle + Robot AMR", "pack_unit": "bin", "std_qty_per_pack": 20, "pick_base_min": 1.0, "pick_per_line_min": 0.65, "load_min": 1.2, "dock_slot_equiv": 0.5},
            {"item_group": "B", "part_code": "DN-CMP-KT02", "part_name": "Bộ Kitting Van & Cụm Rô-to Lắp ráp", "handling_stream": "Supermarket Kitting + Tugger Milk-run", "pack_unit": "box", "std_qty_per_pack": 8, "pick_base_min": 1.6, "pick_per_line_min": 0.90, "load_min": 2.0, "dock_slot_equiv": 1.0},
            {"item_group": "C", "part_code": "DN-RAD-AL03", "part_name": "Lốc Nhôm Đúc & Két Tản Nhiệt Nặng", "handling_stream": "Warehouse Forklift + Heavy Dock", "pack_unit": "pallet", "std_qty_per_pack": 1, "pick_base_min": 2.6, "pick_per_line_min": 1.20, "load_min": 3.6, "dock_slot_equiv": 2.0},
        ]
    },
    "03_WMS_GTP_Stock": {
        "columns": ["zone_id", "zone_name", "line_id", "item_group", "on_hand_packs", "safety_buffer_mins", "reorder_point_mins", "andon_threshold_mins", "status"],
        "description": "File Excel #3: Tồn kho WMS Kho chính, Kệ GTP, Siêu thị Kitting & Tồn đệm 2-Bin Kanban chân chuyền",
        "sample": [
            {"zone_id": "GTP-BAY-01", "zone_name": "Hệ thống Kệ tự động Goods-to-Person", "line_id": "ALL", "item_group": "A", "on_hand_packs": 420, "safety_buffer_mins": 180, "reorder_point_mins": 60, "andon_threshold_mins": 15, "status": "HEALTHY"},
            {"zone_id": "SMKT-RACK-A", "zone_name": "Kho Siêu thị & Bàn Kitting PK1..4", "line_id": "ALL", "item_group": "B", "on_hand_packs": 260, "safety_buffer_mins": 120, "reorder_point_mins": 45, "andon_threshold_mins": 15, "status": "HEALTHY"},
            {"zone_id": "LINE-BUF-L1", "zone_name": "Kệ Kanban Chân chuyền L1 Compressor", "line_id": "L1", "item_group": "B", "on_hand_packs": 18, "safety_buffer_mins": 45, "reorder_point_mins": 25, "andon_threshold_mins": 10, "status": "RISK_AT_10H00"},
            {"zone_id": "LINE-BUF-L2", "zone_name": "Kệ Kanban Chân chuyền L2 Radiator", "line_id": "L2", "item_group": "C", "on_hand_packs": 14, "safety_buffer_mins": 45, "reorder_point_mins": 25, "andon_threshold_mins": 10, "status": "RISK_AT_10H00"},
        ]
    },
    "04_HR_Skill_Roster": {
        "columns": ["resource_id", "worker_name", "shift", "home_stage", "certified_skills", "break_window", "can_reassign_to_dock"],
        "description": "File Excel #4: Bảng phân ca nhân sự & Ma trận chứng chỉ đa kỹ năng (Cross-skill Matrix)",
        "sample": [
            {"resource_id": "PK-S1-1", "worker_name": "Nguyễn Văn An (NV-04)", "shift": "S1", "home_stage": "picking", "certified_skills": "picking|loading|gtp", "break_window": "10:00-10:30", "can_reassign_to_dock": True},
            {"resource_id": "PK-S1-2", "worker_name": "Trần Thị Bích", "shift": "S1", "home_stage": "picking", "certified_skills": "picking|gtp", "break_window": "10:30-11:00", "can_reassign_to_dock": False},
            {"resource_id": "LD-S1-1", "worker_name": "Lê Hoàng Nam", "shift": "S1", "home_stage": "loading", "certified_skills": "loading|forklift", "break_window": "10:00-10:30", "can_reassign_to_dock": True},
            {"resource_id": "LD-S1-2", "worker_name": "Phạm Minh Tuấn", "shift": "S1", "home_stage": "loading", "certified_skills": "loading|forklift", "break_window": "10:30-11:00", "can_reassign_to_dock": True},
            {"resource_id": "DR-S1-1", "worker_name": "Vũ Đức Thắng (Tugger TG1)", "shift": "S1", "home_stage": "transport", "certified_skills": "transport|loading", "break_window": "10:00-10:30", "can_reassign_to_dock": True},
        ]
    },
    "05_Fleet_Equipment_Log": {
        "columns": ["equipment_id", "equipment_type", "assigned_zone", "capacity_spec", "cycle_or_speed", "status_06_14", "maintenance_window", "reason_code"],
        "description": "File Excel #5: Nhật ký thiết bị & Lịch bảo dưỡng Đoàn xe kéo AGV/Tugger, Robot AMR, Xe nâng Forklift, Trạm GTP & Cầu bốc Dock",
        "sample": [
            {"equipment_id": "TG1", "equipment_type": "Tugger Milk-run Train", "assigned_zone": "Route L1->L2->L3->L4", "capacity_spec": "8 req/trip", "cycle_or_speed": "20 min/cycle", "status_06_14": "ACTIVE", "maintenance_window": "-", "reason_code": "NORMAL"},
            {"equipment_id": "TG2", "equipment_type": "Tugger Milk-run Train", "assigned_zone": "Route L1->L2->L3->L4", "capacity_spec": "8 req/trip", "cycle_or_speed": "20 min/cycle", "status_06_14": "ACTIVE", "maintenance_window": "-", "reason_code": "NORMAL"},
            {"equipment_id": "TG3", "equipment_type": "Tugger Milk-run Train", "assigned_zone": "Route L1->L2->L3->L4", "capacity_spec": "8 req/trip", "cycle_or_speed": "20 min/cycle", "status_06_14": "MAINTENANCE_10_12", "maintenance_window": "2026-10-07 10:00 - 12:00", "reason_code": "PLANNED_MAINTENANCE"},
            {"equipment_id": "AMR1", "equipment_type": "Autonomous Mobile Robot", "assigned_zone": "GTP -> Line Express", "capacity_spec": "2 bin/trip", "cycle_or_speed": "1.8 m/s", "status_06_14": "ACTIVE", "maintenance_window": "-", "reason_code": "NORMAL"},
            {"equipment_id": "FK1", "equipment_type": "Counterbalance Forklift", "assigned_zone": "Warehouse -> Loading Dock", "capacity_spec": "2 pallet/trip", "cycle_or_speed": "3.6 min/pallet", "status_06_14": "ACTIVE", "maintenance_window": "-", "reason_code": "NORMAL"},
            {"equipment_id": "DK1..DK3", "equipment_type": "Loading Dock Bays", "assigned_zone": "Outbound Staging Area", "capacity_spec": "3 bays / 12 dolly slots (24m2)", "cycle_or_speed": "2.0 min/box", "status_06_14": "BOTTLENECK_RISK", "maintenance_window": "-", "reason_code": "LOADER_SHORTAGE_2_OF_3"},
        ]
    },
    "requests": {
        "columns": ["request_id", "line_id", "item_group", "quantity", "unit", "created_at", "due_at", "status"],
        "description": "Bảng tổng hợp Yêu cầu cấp vật tư E-Kanban phát sinh từ 5 nguồn trên",
        "sample": [
            {"request_id": "REQ0001", "line_id": "L1", "item_group": "A", "quantity": 20, "unit": "bin", "created_at": "2026-10-07 09:15:00", "due_at": "2026-10-07 10:00:00", "status": "OPEN"},
            {"request_id": "REQ0002", "line_id": "L2", "item_group": "B", "quantity": 16, "unit": "box", "created_at": "2026-10-07 09:22:00", "due_at": "2026-10-07 10:07:00", "status": "OPEN"},
            {"request_id": "REQ0003", "line_id": "L1", "item_group": "C", "quantity": 2, "unit": "pallet", "created_at": "2026-10-07 09:30:00", "due_at": "2026-10-07 10:15:00", "status": "OPEN"},
        ]
    },
    "production_plan": {
        "columns": ["line_id", "hour_start", "planned_qty", "revision_no", "revision_time"],
        "description": "Bảng chuẩn hóa Kế hoạch sản xuất theo giờ nạp trực tiếp vào Engine",
        "sample": [
            {"line_id": "L1", "hour_start": "2026-10-07 09:00:00", "planned_qty": 156, "revision_no": 1, "revision_time": "2026-10-07 05:30:00"},
            {"line_id": "L2", "hour_start": "2026-10-07 09:00:00", "planned_qty": 124, "revision_no": 1, "revision_time": "2026-10-07 05:30:00"},
        ]
    },
    "disruptions": {
        "columns": ["start_at", "end_at", "resource_id", "reason_code", "known_in_advance"],
        "description": "Bảng chuẩn hóa Sự cố, bảo trì và vắng mặt nguồn lực",
        "sample": [
            {"start_at": "2026-10-07 10:00:00", "end_at": "2026-10-07 12:00:00", "resource_id": "TG3", "reason_code": "PLANNED_MAINTENANCE", "known_in_advance": True},
        ]
    }
}


def generate_excel_template() -> io.BytesIO:
    """Generate a multi-sheet Excel file containing template schemas and samples."""
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        for name, spec in TEMPLATE_SCHEMAS.items():
            df = pd.DataFrame(spec["sample"], columns=spec["columns"])
            df.to_excel(writer, sheet_name=name, index=False)
    output.seek(0)
    return output


def parse_upload_file(file_content: bytes, filename: str) -> Dict[str, pd.DataFrame]:
    """Parse uploaded CSV or Excel bytes into DataFrames."""
    res = {}
    if filename.endswith(".csv"):
        # Single table file
        table_name = Path(filename).stem.lower()
        df = pd.read_csv(io.BytesIO(file_content))
        res[table_name] = df
    elif filename.endswith((".xlsx", ".xls")):
        excel_file = pd.ExcelFile(io.BytesIO(file_content))
        for sheet in excel_file.sheet_names:
            clean_name = sheet.strip().lower()
            res[clean_name] = pd.read_excel(excel_file, sheet_name=sheet)
    else:
        raise ValueError("Định dạng file không hỗ trợ. Vui lòng tải lên file .csv hoặc .xlsx")
    return res
