"""High-performance thread-safe in-memory TTL cache with Single-Flight locking to prevent cache stampedes."""
from __future__ import annotations

import inspect
import time
import threading
from typing import Any, Callable, Dict, Optional, Tuple
from functools import wraps


class TTLCache:
    """Thread-safe Time-To-Live in-memory cache with per-key single-flight locks."""

    def __init__(self, default_ttl: float = 3600.0, max_size: int = 500):
        self.default_ttl = default_ttl
        self.max_size = max_size
        self._store: Dict[str, Tuple[Any, float]] = {}
        self._lock = threading.Lock()
        self._key_locks: Dict[str, threading.Lock] = {}

    def get(self, key: str) -> Optional[Any]:
        now = time.time()
        with self._lock:
            if key in self._store:
                val, expires_at = self._store[key]
                if now < expires_at:
                    return val
                else:
                    del self._store[key]
        return None

    def get_key_lock(self, key: str) -> threading.Lock:
        """Return a dedicated lock for a specific cache key to prevent thundering herd recomputation."""
        with self._lock:
            if key not in self._key_locks:
                if len(self._key_locks) > self.max_size * 2:
                    active_keys = set(self._store.keys())
                    self._key_locks = {k: v for k, v in self._key_locks.items() if k in active_keys or v.locked()}
                self._key_locks[key] = threading.Lock()
            return self._key_locks[key]

    def set(self, key: str, value: Any, ttl: Optional[float] = None) -> None:
        duration = ttl if ttl is not None else self.default_ttl
        expires_at = time.time() + duration
        with self._lock:
            if len(self._store) >= self.max_size:
                now = time.time()
                keys_to_del = [k for k, (_, exp) in self._store.items() if exp <= now]
                for k in keys_to_del:
                    del self._store[k]
                if len(self._store) >= self.max_size:
                    oldest_key = min(self._store.keys(), key=lambda k: self._store[k][1])
                    del self._store[oldest_key]
            self._store[key] = (value, expires_at)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()


# Global cache instance (1 hour default TTL for immutable dataset versions)
analytics_cache = TTLCache(default_ttl=3600.0)


def _serialize_arg(val: Any) -> str:
    if hasattr(val, "model_dump"):
        return str(sorted(val.model_dump().items()))
    if hasattr(val, "dict"):
        return str(sorted(val.dict().items()))
    if hasattr(val, "__dict__"):
        return str(sorted(val.__dict__.items()))
    return str(val)


def cached(prefix: str, ttl: float = 3600.0):
    """Decorator to cache endpoint/function results with single-flight protection against concurrent stampedes."""
    def decorator(fn: Callable):
        sig = inspect.signature(fn)

        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                bound = sig.bind_partial(*args, **kwargs)
                key_parts = [prefix] + [f"{k}:{_serialize_arg(v)}" for k, v in sorted(bound.arguments.items())]
            except Exception:
                key_parts = [prefix] + [_serialize_arg(a) for a in args] + [
                    f"{k}:{_serialize_arg(v)}" for k, v in sorted(kwargs.items())
                ]

            cache_key = "|".join(key_parts)
            # Fast path: lock-free read if already cached
            cached_val = analytics_cache.get(cache_key)
            if cached_val is not None:
                return cached_val

            # Single-flight lock: if multiple concurrent users request the same uncached endpoint,
            # only the first computes it; the others wait on key_lock and reuse the cached result in 0ms.
            key_lock = analytics_cache.get_key_lock(cache_key)
            with key_lock:
                cached_val = analytics_cache.get(cache_key)
                if cached_val is not None:
                    return cached_val
                result = fn(*args, **kwargs)
                analytics_cache.set(cache_key, result, ttl=ttl)
                return result
        return wrapper
    return decorator
