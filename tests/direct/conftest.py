"""Shared helpers for the vector-store direct-mode tests."""

import sys
from datetime import datetime, timezone

import pytest

# A fixed "now" for deterministic time travel: 2030-01-01T00:00:00Z.
BASE_ISO = "2030-01-01T00:00:00Z"
BASE_TS = 1893456000  # int(datetime.fromisoformat(BASE_ISO...).timestamp())


def to_hex(addr_bytes) -> str:
    """Convert address bytes to the checksummed hex the contract returns."""
    if hasattr(addr_bytes, "as_hex"):
        return addr_bytes.as_hex
    from genlayer.py.types import Address

    return Address(addr_bytes).as_hex


def addr(addr_bytes):
    """Build an Address for TreeMap[Address, ...] lookups."""
    from genlayer.py.types import Address

    if isinstance(addr_bytes, Address):
        return addr_bytes
    return Address(addr_bytes)


def set_time(iso_str: str) -> None:
    """Move the contract's view of block time."""
    import genlayer.gl as gl

    gl.message_raw["datetime"] = iso_str


def iso(ts: int) -> str:
    return datetime.fromtimestamp(ts, timezone.utc).isoformat().replace("+00:00", "Z")


def _reset() -> None:
    """Reset the direct loader's known-contract cache."""
    if "genlayer.gl" in sys.modules:
        import genlayer.gl as gl

        if hasattr(gl, "message_raw"):
            gl.message_raw["datetime"] = BASE_ISO


@pytest.fixture(autouse=True)
def _reset_block_time():
    """genlayer.gl is imported once per session, so message_raw leaks
    between tests: reset it to a fixed base before and after each one."""
    _reset()
    yield
    _reset()