"""Unit tests for the MCP server's pure logic (auth / write-gating / formatting).
No DB or fastmcp needed. Runs under pytest, or standalone: `python tests/test_core.py`.
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from bhn_mcp.core import (  # noqa: E402
    authorize_write,
    check_token,
    clamp_days,
    clamp_limit,
    format_metrics,
    valid_rating,
    writes_allowed,
)


def _set(**env):
    for k, v in env.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v


def test_writes_default_off():
    _set(BHN_MCP_ALLOW_WRITES=None)
    assert writes_allowed() is False
    _set(BHN_MCP_ALLOW_WRITES="1")
    assert writes_allowed() is True
    _set(BHN_MCP_ALLOW_WRITES="true")
    assert writes_allowed() is True


def test_token_fail_closed():
    _set(BHN_MCP_TOKEN=None)
    assert check_token("anything") is False  # nothing configured -> refuse
    _set(BHN_MCP_TOKEN="s3cret")
    assert check_token("s3cret") is True
    assert check_token("wrong") is False


def test_authorize_write():
    _set(BHN_MCP_ALLOW_WRITES=None, BHN_MCP_TOKEN="s3cret")
    assert authorize_write("s3cret")[0] is False  # writes disabled
    _set(BHN_MCP_ALLOW_WRITES="1")
    assert authorize_write("s3cret")[0] is True
    assert authorize_write("nope")[0] is False


def test_clamps():
    assert clamp_days(0) == 1
    assert clamp_days(9999) == 365
    assert clamp_days("x") == 30
    assert clamp_limit(0) == 1
    assert clamp_limit(9999) == 100


def test_format_and_rating():
    m = format_metrics(10, 2, 0.123456789)
    assert m["total_calls"] == 10 and m["error_rate"] == 0.2 and m["total_cost_usd"] == 0.123457
    assert format_metrics(0, 0, None)["error_rate"] == 0.0
    assert valid_rating(1) and valid_rating(-1) and not valid_rating(0)


if __name__ == "__main__":
    for _name, _fn in sorted(globals().items()):
        if _name.startswith("test_") and callable(_fn):
            _fn()
            print(f"ok  {_name}")
    print("all core tests passed")
