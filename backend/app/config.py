"""Application paths and runtime settings."""
from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
VAR_DIR = Path(os.environ.get("D2_VAR_DIR", BASE_DIR / "var"))
DATASETS_DIR = VAR_DIR / "datasets"
MODELS_DIR = VAR_DIR / "models"
RUNS_DIR = VAR_DIR / "runs"
DB_PATH = VAR_DIR / "app.db"
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"

for d in (VAR_DIR, DATASETS_DIR, MODELS_DIR, RUNS_DIR):
    d.mkdir(parents=True, exist_ok=True)

SIM_WORKERS = int(os.environ.get("D2_SIM_WORKERS", max(1, (os.cpu_count() or 4) - 2)))
LLM_BASE_URL = os.environ.get("D2_LLM_BASE_URL", "")
LLM_API_KEY = os.environ.get("D2_LLM_API_KEY", "")
LLM_MODEL = os.environ.get("D2_LLM_MODEL", "")
