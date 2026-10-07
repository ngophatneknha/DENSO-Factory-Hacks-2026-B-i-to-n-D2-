"""Initialise default dataset and store on startup."""
from __future__ import annotations

import sys
import pandas as pd
from pathlib import Path

from .data.synthetic import generate_dataset, DEFAULT_NOW
from .data.store import save_dataset, write_current, read_current, list_datasets


def ensure_initial_dataset(seed: int = 42) -> str:
    current = read_current()
    if current.get("data_version"):
        # Check if dataset exists
        datasets = list_datasets()
        if any(d.get("data_version") == current["data_version"] for d in datasets):
            return current["data_version"]
    
    print("[init_data] Generating baseline synthetic dataset (seed=42)...")
    ds = generate_dataset(seed=seed, now=DEFAULT_NOW)
    v = save_dataset(ds)
    write_current(data_version=v, now=DEFAULT_NOW.isoformat(), seed=seed)
    print(f"[init_data] Default dataset {v} saved and set as current.")
    return v


if __name__ == "__main__":
    ensure_initial_dataset()
