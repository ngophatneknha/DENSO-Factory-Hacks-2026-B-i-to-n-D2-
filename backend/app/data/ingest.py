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
    "requests": {
        "columns": ["request_id", "line_id", "item_group", "quantity", "unit", "created_at", "due_at", "status"],
        "description": "Yêu cầu cấp vật tư từ các dây chuyền",
        "sample": [
            {"request_id": "REQ0001", "line_id": "L1", "item_group": "A", "quantity": 20, "unit": "bin", "created_at": "2026-10-07 06:15:00", "due_at": "2026-10-07 07:45:00", "status": "OPEN"},
            {"request_id": "REQ0002", "line_id": "L2", "item_group": "B", "quantity": 16, "unit": "box", "created_at": "2026-10-07 06:22:00", "due_at": "2026-10-07 07:52:00", "status": "OPEN"},
        ]
    },
    "production_plan": {
        "columns": ["line_id", "hour_start", "planned_qty", "revision_no", "revision_time"],
        "description": "Kế hoạch sản xuất theo giờ cho từng line",
        "sample": [
            {"line_id": "L1", "hour_start": "2026-10-07 06:00:00", "planned_qty": 120, "revision_no": 0, "revision_time": "2026-10-06 18:00:00"},
            {"line_id": "L2", "hour_start": "2026-10-07 06:00:00", "planned_qty": 95, "revision_no": 0, "revision_time": "2026-10-06 18:00:00"},
        ]
    },
    "disruptions": {
        "columns": ["start_at", "end_at", "resource_id", "reason_code", "known_in_advance"],
        "description": "Nhật ký sự cố, bảo trì và vắng mặt nguồn lực",
        "sample": [
            {"start_at": "2026-10-07 13:00:00", "end_at": "2026-10-07 16:00:00", "resource_id": "TG3", "reason_code": "PLANNED_MAINTENANCE", "known_in_advance": True},
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
