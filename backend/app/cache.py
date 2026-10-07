"""High-performance thread-safe in-memory TTL cache for expensive analytics endpoints."""
from __future__ import annotations

import time
import threading
from typing import Any, Callable, Dict, Optional, Tuple
from functools import wraps


class TTLCache:
    """Thread-safe Time-To-Live in-memory cache."""

    def __init__(self, default_ttl: float = 30.0, max_size: int = 500):
        self.default_ttl = default_ttl
        self.max_size = max_size
        self._store: Dict[str, Tuple[Any, float]] = {}
        self._lock = threading.Lock()

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

    def set(self, key: str, value: Any, ttl: Optional[float] = None) -> None:
        duration = ttl if ttl is not None else self.default_ttl
        expires_at = time.time() + duration
        with self._lock:
            # Evict expired entries if approaching max size
            if len(self._store) >= self.max_size:
                now = time.time()
                keys_to_del = [k for k, (_, exp) in self._store.items() if exp <= now]
                for k in keys_to_del:
                    del self._store[k]
                # If still at max size, evict oldest
                if len(self._store) >= self.max_size:
                    oldest_key = min(self._store.keys(), key=lambda k: self._store[k][1])
                    del self._store[oldest_key]
            self._store[key] = (value, expires_at)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()


# Global cache instance
analytics_cache = TTLCache(default_ttl=30.0)


def cached(prefix: str, ttl: float = 30.0):
    """Decorator to cache endpoint or function results based on arguments."""
    def decorator(fn: Callable):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # Build cache key from prefix and arguments
            key_parts = [prefix]
            for a in args:
                if hasattr(a, "model_dump"):
                    key_parts.append(str(sorted(a.model_dump().items())))
                elif hasattr(a, "dict"):
                    key_parts.append(str(sorted(a.dict().items())))
                elif hasattr(a, "__dict__"):
                    key_parts.append(str(sorted(a.__dict__.items())))
                else:
                    key_parts.append(str(a))
            for k, v in sorted(kwargs.items()):
                if hasattr(v, "model_dump"):
                    key_parts.append(f"{k}:{sorted(v.model_dump().items())}")
                elif hasattr(v, "dict"):
                    key_parts.append(f"{k}:{sorted(v.dict().items())}")
                elif hasattr(v, "__dict__"):
                    key_parts.append(f"{k}:{sorted(v.__dict__.items())}")
                else:
                    key_parts.append(f"{k}:{v}")

            cache_key = "|".join(key_parts)
            cached_val = analytics_cache.get(cache_key)
            if cached_val is not None:
                return cached_val

            result = fn(*args, **kwargs)
            analytics_cache.set(cache_key, result, ttl=ttl)
            return result
        return wrapper
    return decorator
