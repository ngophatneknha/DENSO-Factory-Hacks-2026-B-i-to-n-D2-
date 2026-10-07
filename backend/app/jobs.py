"""Thread-based background job manager with persistent SQLite status."""
from __future__ import annotations

import uuid
import json
import threading
from datetime import datetime
from typing import Dict, Any, Callable, Optional

from .audit import _get_conn, init_db


def create_job(job_type: str, status_message: str = "Queued") -> str:
    init_db()
    job_id = str(uuid.uuid4())[:8]
    conn = _get_conn()
    with conn:
        conn.execute(
            """
            INSERT INTO background_jobs (job_id, job_type, status, progress_pct, status_message, created_at)
            VALUES (?, ?, 'QUEUED', 0, ?, ?)
            """,
            (job_id, job_type, status_message, datetime.now().isoformat()),
        )
    conn.close()
    return job_id


def update_job(
    job_id: str,
    status: Optional[str] = None,
    progress_pct: Optional[int] = None,
    status_message: Optional[str] = None,
    result: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None,
):
    conn = _get_conn()
    with conn:
        updates = []
        params = []
        if status is not None:
            updates.append("status = ?")
            params.append(status)
            if status in ("DONE", "FAILED", "CANCELLED"):
                updates.append("finished_at = ?")
                params.append(datetime.now().isoformat())
        if progress_pct is not None:
            updates.append("progress_pct = ?")
            params.append(progress_pct)
        if status_message is not None:
            updates.append("status_message = ?")
            params.append(status_message)
        if result is not None:
            updates.append("result_json = ?")
            params.append(json.dumps(result, ensure_ascii=False))
        if error is not None:
            updates.append("error_message = ?")
            params.append(error)

        if updates:
            params.append(job_id)
            conn.execute(f"UPDATE background_jobs SET {', '.join(updates)} WHERE job_id = ?", tuple(params))
    conn.close()


def get_job_status(job_id: str) -> Optional[Dict[str, Any]]:
    init_db()
    conn = _get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM background_jobs WHERE job_id = ?", (job_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    if d.get("result_json"):
        try:
            d["result"] = json.loads(d["result_json"])
        except Exception:
            d["result"] = None
    return d


def run_in_background(job_type: str, worker_fn: Callable[[Callable[[int, str], None]], Dict[str, Any]]) -> str:
    """Submit a task to execute in a daemon thread and track in DB."""
    job_id = create_job(job_type, "Starting...")

    def _target():
        update_job(job_id, status="RUNNING", status_message="Processing...")
        def progress_callback(pct: int, msg: str):
            update_job(job_id, progress_pct=pct, status_message=msg)
        try:
            res = worker_fn(progress_callback)
            update_job(job_id, status="DONE", progress_pct=100, status_message="Hoàn thành", result=res)
        except Exception as ex:
            import traceback
            traceback.print_exc()
            update_job(job_id, status="FAILED", status_message=f"Lỗi: {str(ex)}", error=str(ex))

    thread = threading.Thread(target=_target, daemon=True)
    thread.start()
    return job_id
