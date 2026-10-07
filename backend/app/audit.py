"""Audit logging for tracking configuration changes, simulations, operator decisions, and exports."""
from __future__ import annotations

import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

from .config import DB_PATH


def _get_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = _get_conn()
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                user_name TEXT NOT NULL,
                action_type TEXT NOT NULL,
                entity_id TEXT,
                details_json TEXT,
                ip_address TEXT
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS background_jobs (
                job_id TEXT PRIMARY KEY,
                job_type TEXT NOT NULL,
                status TEXT NOT NULL,
                progress_pct INTEGER DEFAULT 0,
                status_message TEXT,
                created_at TEXT NOT NULL,
                finished_at TEXT,
                result_json TEXT,
                error_message TEXT
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS saved_decisions (
                decision_id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                operator_name TEXT NOT NULL,
                shift_id TEXT NOT NULL,
                action_id TEXT NOT NULL,
                action_name TEXT NOT NULL,
                decision_status TEXT NOT NULL, -- APPROVED | REJECTED | MODIFIED
                expected_saving_vnd REAL,
                cost_vnd REAL,
                notes TEXT,
                run_id TEXT
            );
        """)
    conn.close()


def log_audit(
    action_type: str,
    user_name: str = "Operator",
    entity_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
):
    init_db()
    conn = _get_conn()
    with conn:
        conn.execute(
            """
            INSERT INTO audit_logs (timestamp, user_name, action_type, entity_id, details_json, ip_address)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                datetime.now().isoformat(),
                user_name,
                action_type,
                entity_id,
                json.dumps(details or {}, ensure_ascii=False),
                ip_address or "127.0.0.1",
            ),
        )
    conn.close()


def get_recent_audit_logs(limit: int = 50) -> List[Dict[str, Any]]:
    init_db()
    conn = _get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?", (limit,))
    rows = cur.fetchall()
    out = []
    for r in rows:
        d = dict(r)
        if d.get("details_json"):
            try:
                d["details"] = json.loads(d["details_json"])
            except Exception:
                d["details"] = {}
        out.append(d)
    conn.close()
    return out
