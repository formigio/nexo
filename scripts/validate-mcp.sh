#!/usr/bin/env bash
#
# Validate Nexo MCP server tools via JSON-RPC over stdio.
# Tests both direct DB mode and HTTP client mode.
#
# Usage: ./scripts/validate-mcp.sh [BASE_URL]
#
# Environment:
#   NEXO_API_KEY  — API key for remote endpoints
#
set -euo pipefail

BASE="${1:-https://app.nexo.test}"
API_KEY="${NEXO_API_KEY:-}"
PASS=0
FAIL=0
ERRORS=""
MCP_BIN="node dist/mcp-server/index.js"

green() { printf "\033[32m✓ %s\033[0m\n" "$1"; }
red()   { printf "\033[31m✗ %s\033[0m\n" "$1"; }

# Send a JSON-RPC request to the MCP server and return the response.
# Args: $1 = description, $2 = env prefix (empty or "NEXO_API_URL=..."), $3... = JSON-RPC messages
mcp_call() {
  local desc="$1"
  shift
  local env_prefix="$1"
  shift

  # Build the input: initialize + request + extra messages
  local input=""
  # MCP initialize handshake
  input+='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0.1"}}}'
  input+=$'\n'
  input+='{"jsonrpc":"2.0","method":"notifications/initialized"}'
  input+=$'\n'

  # Add the actual request(s)
  for msg in "$@"; do
    input+="$msg"
    input+=$'\n'
  done

  local result
  if [ -n "$env_prefix" ]; then
    result=$(echo "$input" | env $env_prefix $MCP_BIN 2>/dev/null | tail -1)
  else
    result=$(echo "$input" | $MCP_BIN 2>/dev/null | tail -1)
  fi

  echo "$result"
}

assert_mcp_success() {
  local desc="$1" result="$2"
  # Check that result is valid JSON with a "result" field (not "error")
  local has_result
  has_result=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if 'result' in d else 'no')" 2>/dev/null || echo "no")
  if [ "$has_result" = "yes" ]; then
    green "$desc"
    PASS=$((PASS + 1))
  else
    local err_msg
    err_msg=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',{}).get('message','unknown'))" 2>/dev/null || echo "parse error")
    red "$desc — $err_msg"
    FAIL=$((FAIL + 1))
    ERRORS="$ERRORS\n  - $desc"
  fi
}

assert_mcp_content_contains() {
  local desc="$1" result="$2" needle="$3"
  local content
  content=$(echo "$result" | python3 -c "
import sys,json
d=json.load(sys.stdin)
texts = [c.get('text','') for c in d.get('result',{}).get('content',[])]
print('\\n'.join(texts))
" 2>/dev/null || echo "")
  if echo "$content" | grep -q "$needle"; then
    green "$desc"
    PASS=$((PASS + 1))
  else
    red "$desc — '$needle' not found in output"
    FAIL=$((FAIL + 1))
    ERRORS="$ERRORS\n  - $desc"
  fi
}

echo ""
echo "═══════════════════════════════════════════"
echo "  Nexo MCP Server Validation"
echo "═══════════════════════════════════════════"
echo ""

# ── Auto-detect app and sample node ──
AUTH_ARGS=()
[ -n "$API_KEY" ] && AUTH_ARGS=(-H "x-api-key: $API_KEY")

APPS_JSON=$(curl -s "${AUTH_ARGS[@]}" "$BASE/api/apps" 2>/dev/null || echo "[]")
APP=$(echo "$APPS_JSON" | python3 -c "import sys,json; apps=json.load(sys.stdin); print(apps[0]['app'] if apps else '')" 2>/dev/null || echo "")
if [ -z "$APP" ]; then
  echo "Could not detect app from $BASE/api/apps — using 'todo'"
  APP="todo"
fi

NODES_JSON=$(curl -s "${AUTH_ARGS[@]}" "$BASE/api/nodes?app=$APP&type=Screen" 2>/dev/null || echo "[]")
SAMPLE_NODE=$(echo "$NODES_JSON" | python3 -c "import sys,json; nodes=json.load(sys.stdin); print(nodes[0]['id'] if nodes else '')" 2>/dev/null || echo "")
if [ -z "$SAMPLE_NODE" ]; then
  echo "Could not detect sample Screen node — using 'scr_todo_list'"
  SAMPLE_NODE="scr_todo_list"
fi

echo "  App: $APP | Sample node: $SAMPLE_NODE"
echo ""

# ── Tools List ──
echo "── Tool Discovery ──"

RESP=$(mcp_call "tools/list" "" \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}')
assert_mcp_success "tools/list responds" "$RESP"

TOOL_COUNT=$(echo "$RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('result',{}).get('tools',[])))" 2>/dev/null || echo "0")
if [ "$TOOL_COUNT" -gt 0 ]; then
  green "tools/list returns $TOOL_COUNT tools"
  PASS=$((PASS + 1))
else
  red "tools/list returned no tools"
  FAIL=$((FAIL + 1))
  ERRORS="$ERRORS\n  - tools/list count"
fi

# ── HTTP Client Mode ──
echo ""
echo "── MCP Tools (HTTP Client Mode) ──"

HTTP_ENV="NEXO_API_URL=$BASE"
[ -n "$API_KEY" ] && HTTP_ENV="$HTTP_ENV NEXO_API_KEY=$API_KEY"

# app_list via HTTP
RESP=$(mcp_call "app_list (HTTP)" "$HTTP_ENV" \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"app_list","arguments":{}}}')
assert_mcp_success "app_list (HTTP)" "$RESP"
assert_mcp_content_contains "app_list (HTTP) shows $APP" "$RESP" "$APP"

# list_nodes via HTTP
RESP=$(mcp_call "list_nodes (HTTP)" "$HTTP_ENV" \
  "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"list_nodes\",\"arguments\":{\"app\":\"$APP\",\"type\":\"Screen\"}}}")
assert_mcp_success "list_nodes (HTTP)" "$RESP"
assert_mcp_content_contains "list_nodes (HTTP) contains $SAMPLE_NODE" "$RESP" "$SAMPLE_NODE"

# get_node via HTTP
RESP=$(mcp_call "get_node (HTTP)" "$HTTP_ENV" \
  "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"get_node\",\"arguments\":{\"id\":\"$SAMPLE_NODE\"}}}")
assert_mcp_success "get_node (HTTP)" "$RESP"

# list_edges via HTTP
RESP=$(mcp_call "list_edges (HTTP)" "$HTTP_ENV" \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_edges","arguments":{"type":"RENDERS"}}}')
assert_mcp_success "list_edges (HTTP)" "$RESP"
assert_mcp_content_contains "list_edges (HTTP) shows RENDERS" "$RESP" "RENDERS"

# traverse via HTTP
RESP=$(mcp_call "traverse (HTTP)" "$HTTP_ENV" \
  "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"traverse\",\"arguments\":{\"id\":\"$SAMPLE_NODE\"}}}")
assert_mcp_success "traverse (HTTP)" "$RESP"
assert_mcp_content_contains "traverse (HTTP) shows node count" "$RESP" "node(s)"

# impact_analysis via HTTP
RESP=$(mcp_call "impact_analysis (HTTP)" "$HTTP_ENV" \
  "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"impact_analysis\",\"arguments\":{\"id\":\"$SAMPLE_NODE\"}}}")
assert_mcp_success "impact_analysis (HTTP)" "$RESP"
assert_mcp_content_contains "impact_analysis (HTTP) shows impact" "$RESP" "impact"

# feature_list via HTTP
RESP=$(mcp_call "feature_list (HTTP)" "$HTTP_ENV" \
  "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"feature_list\",\"arguments\":{\"app\":\"$APP\"}}}")
assert_mcp_success "feature_list (HTTP)" "$RESP"

echo ""
echo "═══════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  printf "\033[31mFailed tests:%b\033[0m\n" "$ERRORS"
  exit 1
else
  printf "\033[32mAll tests passed!\033[0m\n"
  exit 0
fi
