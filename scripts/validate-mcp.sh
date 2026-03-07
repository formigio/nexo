#!/usr/bin/env bash
#
# Validate Nexo MCP server tools via JSON-RPC over stdio.
# Tests MCP tools in HTTP client mode against a remote API.
#
# Usage: ./scripts/validate-mcp.sh [BASE_URL]
#
# Environment:
#   NEXO_API_KEY  — API key for remote endpoints
#
# Examples:
#   # Against local Docker Compose:
#   ./scripts/validate-mcp.sh http://localhost:3001
#
#   # Against remote API:
#   export NEXO_API_KEY=your-api-key
#   ./scripts/validate-mcp.sh https://your-api.example.com
#
set -euo pipefail

BASE="${1:-http://localhost:3001}"
API_KEY="${NEXO_API_KEY:-}"
PASS=0
FAIL=0
ERRORS=""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MCP_BIN="node ${SCRIPT_DIR}/../dist/mcp-server/index.js"

green() { printf "\033[32m✓ %s\033[0m\n" "$1"; }
red()   { printf "\033[31m✗ %s\033[0m\n" "$1"; }

# HTTP helper for setup/cleanup of test data
AUTH_CURL_ARGS=()
if [ -n "$API_KEY" ]; then
  AUTH_CURL_ARGS=(-H "x-api-key: $API_KEY")
fi

api_curl() {
  curl -s "${AUTH_CURL_ARGS[@]}" "$@"
}

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
echo "  Nexo MCP Server Validation — $BASE"
[ -n "$API_KEY" ] && echo "  (using API key)"
echo "═══════════════════════════════════════════"
echo ""

# ── Auto-detect app and sample node ──
APPS_JSON=$(curl -s "${AUTH_CURL_ARGS[@]}" "$BASE/api/apps" 2>/dev/null || echo "[]")
APP=$(echo "$APPS_JSON" | python3 -c "import sys,json; apps=json.load(sys.stdin); print(apps[0]['app'] if apps else '')" 2>/dev/null || echo "")
if [ -z "$APP" ]; then
  echo "Could not detect app from $BASE/api/apps — using 'todo'"
  APP="todo"
fi

NODES_JSON=$(curl -s "${AUTH_CURL_ARGS[@]}" "$BASE/api/nodes?app=$APP&type=Screen" 2>/dev/null || echo "[]")
SAMPLE_NODE=$(echo "$NODES_JSON" | python3 -c "import sys,json; nodes=json.load(sys.stdin); print(nodes[0]['id'] if nodes else '')" 2>/dev/null || echo "")
if [ -z "$SAMPLE_NODE" ]; then
  echo "Could not detect sample Screen node — using 'scr_todo_list'"
  SAMPLE_NODE="scr_todo_list"
fi

echo "  App: $APP | Sample node: $SAMPLE_NODE"
echo ""

# ── Tools List ──
echo "── Tool Discovery ──"

HTTP_ENV="NEXO_API_URL=$BASE"
[ -n "$API_KEY" ] && HTTP_ENV="$HTTP_ENV NEXO_API_KEY=$API_KEY"

RESP=$(mcp_call "tools/list" "$HTTP_ENV" \
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

# ── Read Tools ──
echo ""
echo "── MCP Read Tools (HTTP Client Mode) ──"

# app_list
RESP=$(mcp_call "app_list" "$HTTP_ENV" \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"app_list","arguments":{}}}')
assert_mcp_success "app_list" "$RESP"
assert_mcp_content_contains "app_list shows $APP" "$RESP" "$APP"

# app_overview
RESP=$(mcp_call "app_overview" "$HTTP_ENV" \
  "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"app_overview\",\"arguments\":{\"app\":\"$APP\"}}}")
assert_mcp_success "app_overview" "$RESP"
assert_mcp_content_contains "app_overview shows node counts" "$RESP" "Node counts"

# list_nodes
RESP=$(mcp_call "list_nodes" "$HTTP_ENV" \
  "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"list_nodes\",\"arguments\":{\"app\":\"$APP\",\"type\":\"Screen\"}}}")
assert_mcp_success "list_nodes" "$RESP"
assert_mcp_content_contains "list_nodes contains $SAMPLE_NODE" "$RESP" "$SAMPLE_NODE"

# get_node
RESP=$(mcp_call "get_node" "$HTTP_ENV" \
  "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"get_node\",\"arguments\":{\"id\":\"$SAMPLE_NODE\"}}}")
assert_mcp_success "get_node" "$RESP"
assert_mcp_content_contains "get_node shows node type" "$RESP" "Screen"

# list_edges
RESP=$(mcp_call "list_edges" "$HTTP_ENV" \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_edges","arguments":{"type":"RENDERS"}}}')
assert_mcp_success "list_edges" "$RESP"
assert_mcp_content_contains "list_edges shows RENDERS" "$RESP" "RENDERS"

# traverse
RESP=$(mcp_call "traverse" "$HTTP_ENV" \
  "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"traverse\",\"arguments\":{\"id\":\"$SAMPLE_NODE\"}}}")
assert_mcp_success "traverse" "$RESP"
assert_mcp_content_contains "traverse shows node count" "$RESP" "node(s)"

# impact_analysis
RESP=$(mcp_call "impact_analysis" "$HTTP_ENV" \
  "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"impact_analysis\",\"arguments\":{\"id\":\"$SAMPLE_NODE\"}}}")
assert_mcp_success "impact_analysis" "$RESP"
assert_mcp_content_contains "impact_analysis shows impact" "$RESP" "impact"

# feature_list
RESP=$(mcp_call "feature_list" "$HTTP_ENV" \
  "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"feature_list\",\"arguments\":{\"app\":\"$APP\"}}}")
assert_mcp_success "feature_list" "$RESP"

# feature_scope (find a feature first)
FEATURE_NODE=$(echo "$NODES_JSON" | python3 -c "
import sys,json
# We need to get a Feature node, not a Screen node
print('')
" 2>/dev/null || echo "")

FEATURE_JSON=$(curl -s "${AUTH_CURL_ARGS[@]}" "$BASE/api/nodes?app=$APP&type=Feature" 2>/dev/null || echo "[]")
FEATURE_NODE=$(echo "$FEATURE_JSON" | python3 -c "import sys,json; nodes=json.load(sys.stdin); print(nodes[0]['id'] if nodes else '')" 2>/dev/null || echo "")

if [ -n "$FEATURE_NODE" ]; then
  RESP=$(mcp_call "feature_scope" "$HTTP_ENV" \
    "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"feature_scope\",\"arguments\":{\"id\":\"$FEATURE_NODE\"}}}")
  assert_mcp_success "feature_scope" "$RESP"
  assert_mcp_content_contains "feature_scope shows scope" "$RESP" "in scope"
fi

# ── Write Tools ──
echo ""
echo "── MCP Write Tools (HTTP Client Mode) ──"

# create_node
RESP=$(mcp_call "create_node" "$HTTP_ENV" \
  "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"create_node\",\"arguments\":{\"type\":\"Component\",\"app\":\"$APP\",\"name\":\"MCP Test Widget\",\"description\":\"Created by MCP validation\",\"tags\":[\"test\"],\"props\":{\"componentType\":\"presentational\"}}}}")
assert_mcp_success "create_node" "$RESP"
assert_mcp_content_contains "create_node returns id" "$RESP" "cmp_mcp_test_widget"

# update_node
RESP=$(mcp_call "update_node" "$HTTP_ENV" \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"update_node","arguments":{"id":"cmp_mcp_test_widget","description":"Updated by MCP validation","tags":["test","updated"]}}}')
assert_mcp_success "update_node" "$RESP"
assert_mcp_content_contains "update_node bumps version" "$RESP" "v2"

# create_edge (needs a Screen target)
api_curl -X POST "$BASE/api/nodes" \
  -H 'Content-Type: application/json' \
  -d "{\"type\":\"Screen\",\"app\":\"$APP\",\"name\":\"MCP Test Screen\",\"description\":\"Target for MCP edge test\",\"tags\":[\"test\"],\"props\":{\"route\":\"/mcp-test\"}}" > /dev/null

RESP=$(mcp_call "create_edge" "$HTTP_ENV" \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"create_edge","arguments":{"type":"RENDERS","from":"scr_mcp_test_screen","to":"cmp_mcp_test_widget"}}}')
assert_mcp_success "create_edge" "$RESP"
assert_mcp_content_contains "create_edge shows RENDERS" "$RESP" "RENDERS"

# delete_node (cleanup — will also delete connected edges)
RESP=$(mcp_call "delete_node" "$HTTP_ENV" \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"delete_node","arguments":{"id":"cmp_mcp_test_widget"}}}')
assert_mcp_success "delete_node (component)" "$RESP"

RESP=$(mcp_call "delete_node" "$HTTP_ENV" \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"delete_node","arguments":{"id":"scr_mcp_test_screen"}}}')
assert_mcp_success "delete_node (screen)" "$RESP"

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
