# BHN MCP server

A [FastMCP](https://github.com/jlowin/fastmcp) (Python) server that exposes the
platform's AI surface to MCP clients (Claude, IDEs, agents).

## Tools

| Tool | Access | What it does |
|------|--------|--------------|
| `ai_metrics(days)` | read-only | Reliability + cost over the `AIInteraction` log |
| `review_queue(limit)` | read-only | Flagged AI answers awaiting human review |
| `search_contacts(query, limit)` | read-only | Search the outreach directory |
| `submit_feedback(interaction_id, rating, token)` | **write** | Record thumbs feedback on an answer |
| `trigger_eval(token)` | **write/action** | Run the offline eval suite |

**Read-only by default.** The two write tools are refused unless
`BHN_MCP_ALLOW_WRITES=1` **and** the caller passes a `token` matching
`BHN_MCP_TOKEN` (fail-closed: no token configured → all writes refused).

## Run

```bash
cd mcp
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
export DATABASE_URL=postgres://...        # read access to the BHN database
python -m bhn_mcp.server                   # starts the MCP server (stdio)
```

To enable writes:

```bash
export BHN_MCP_ALLOW_WRITES=1
export BHN_MCP_TOKEN=$(openssl rand -hex 16)
```

## Connect

`/.mcp.json` at the repo root registers this server (command `python -m
bhn_mcp.server`, cwd `mcp`, read-only env). Point an MCP client at it, or copy
the block into your client config.

## Test

```bash
cd mcp && python tests/test_core.py     # standalone, no deps
# or: pip install pytest && pytest
```

`tests/test_core.py` covers the auth / write-gating / formatting logic (no DB
required). The DB layer (`bhn_mcp/db.py`) runs parameterised SQL against
`DATABASE_URL`; integration testing it needs a live database.

## Design notes

- `core.py` — pure logic, imports nothing heavy, fully unit-tested.
- `db.py` — psycopg queries (lazy import), parameterised (no string interpolation).
- `server.py` — FastMCP tool registration; write tools call `authorize_write()` first.
