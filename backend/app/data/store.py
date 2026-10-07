"""Versioned dataset store (parquet per table + meta.json) and the active-version pointer."""
from __future__ import annotations

import json
import threading
from functools import lru_cache
from pathlib import Path
from typing import Dict, Optional

import pandas as pd

from ..config import DATASETS_DIR, VAR_DIR

TABLES = ["requests", "process_events", "resources", "resource_calendar", "production_plan", "disruptions",
          "routes", "item_master", "cost_parameters", "snapshot"]
_CURRENT = VAR_DIR / "current.json"
_lock = threading.Lock()


def read_current() -> dict:
    if _CURRENT.exists():
        return json.loads(_CURRENT.read_text(encoding="utf-8"))
    return {}


def write_current(**kw) -> dict:
    with _lock:
        cur = read_current()
        cur.update({k: v for k, v in kw.items()})
        _CURRENT.write_text(json.dumps(cur, indent=2), encoding="utf-8")
        return cur


def save_dataset(ds: Dict[str, object]) -> str:
    meta = ds["meta"]
    version = meta["data_version"]
    path = DATASETS_DIR / version
    path.mkdir(parents=True, exist_ok=True)
    for t in TABLES:
        if t in ds and ds[t] is not None:
            df: pd.DataFrame = ds[t]
            df.to_parquet(path / f"{t}.parquet", index=False)
    (path / "meta.json").write_text(json.dumps(meta, indent=2, default=str), encoding="utf-8")
    load_dataset.cache_clear()
    return version


def list_datasets() -> list:
    out = []
    for p in sorted(DATASETS_DIR.iterdir()):
        m = p / "meta.json"
        if m.exists():
            out.append(json.loads(m.read_text(encoding="utf-8")))
    return out


class Dataset:
    def __init__(self, version: str, path: Path):
        self.version = version
        self.path = path
        self.meta = json.loads((path / "meta.json").read_text(encoding="utf-8"))
        self._cache: Dict[str, pd.DataFrame] = {}

    def __getitem__(self, table: str) -> pd.DataFrame:
        if table not in self._cache:
            f = self.path / f"{table}.parquet"
            self._cache[table] = pd.read_parquet(f) if f.exists() else pd.DataFrame()
        return self._cache[table]

    def __contains__(self, table: str) -> bool:
        return (self.path / f"{table}.parquet").exists()

    def get(self, table: str, default=None):
        if table in self:
            return self[table]
        return default if default is not None else pd.DataFrame()

    @property
    def now(self) -> pd.Timestamp:
        return pd.Timestamp(self.meta["now"])


@lru_cache(maxsize=4)
def load_dataset(version: Optional[str] = None) -> Dataset:
    version = version or read_current().get("data_version")
    if not version:
        raise FileNotFoundError("No active dataset")
    path = DATASETS_DIR / version
    if not (path / "meta.json").exists():
        raise FileNotFoundError(version)
    return Dataset(version, path)


def active_dataset() -> Dataset:
    return load_dataset(read_current().get("data_version"))
