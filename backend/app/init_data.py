"""Initialise default dataset and store on startup (including Git LFS pointer fallback on Render)."""
from __future__ import annotations

import pandas as pd

from .config import DATASETS_DIR
from .data.synthetic import generate_dataset, DEFAULT_NOW
from .data.store import save_dataset, write_current, read_current, list_datasets


def _is_valid_parquet_dataset(version: str) -> bool:
    """Verify that the dataset exists AND its parquet files are real binary Parquet (not 130-byte Git LFS pointers)."""
    try:
        req_file = DATASETS_DIR / version / "requests.parquet"
        if not req_file.exists() or req_file.stat().st_size < 1024:
            return False
        df = pd.read_parquet(req_file, columns=["request_id"])
        return len(df) > 0
    except Exception:
        return False


def ensure_initial_dataset(seed: int = 42) -> str:
    current = read_current()
    ver = current.get("data_version")
    if ver:
        datasets = list_datasets()
        if any(d.get("data_version") == ver for d in datasets) and _is_valid_parquet_dataset(ver):
            return ver

    print("[init_data] Generating baseline synthetic dataset (seed=42)...")
    ds = generate_dataset(seed=seed, now=DEFAULT_NOW)
    v = save_dataset(ds)
    write_current(data_version=v, now=DEFAULT_NOW.isoformat(), seed=seed)
    print(f"[init_data] Default dataset {v} saved and set as current.")
    return v


if __name__ == "__main__":
    ensure_initial_dataset()
