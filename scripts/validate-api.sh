#!/usr/bin/env bash
#
# Validate Nexo API endpoints + CLI HTTP client mode (read + write)
#
# Usage: ./scripts/validate-api.sh [BASE_URL]
#
# Environment:
#   NEXO_API_KEY  — API key for remote endpoints (x-api-key header)
#
# Examples:
#   # Against local Docker Compose:
#   ./scripts/validate-api.sh http://localhost:3001
#
#   # Against remote API:
#   export NEXO_API_KEY=your-api-key
#   ./scripts/validate-api.sh https://your-api.example.com
#
set -euo pipefail

BASE="${1:-http://localhost:3001}"
API_KEY="${NEXO_API_KEY:-}"
PASS=0
FAIL=0
ERRORS=""

# Resolve CLI binary: prefer npm-linked `nexo`, fall back to dist/
if command -v nexo &>/dev/null; then
  CLI="nexo"
else
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  CLI="node ${SCRIPT_DIR}/../dist/cli/index.js"
fi

green() { printf "\033[32m✓ %s\033[0m\n" "$1"; }
red()   { printf "\033[31m✗ %s\033[0m\n" "$1"; }

# Build curl auth args
AUTH_ARGS=()
if [ -n "$API_KEY" ]; then
  AUTH_ARGS=(-H "x-api-key: $API_KEY")
fi

api_curl() {
  curl -s "${AUTH_ARGS[@]}" "$@"
}

api_curl_w() {
  curl -s -w "\n%{http_code}" "${AUTH_ARGS[@]}" "$@"
}

assert_status() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    green "$desc (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    red "$desc — expected $expected, got $actual"
    FAIL=$((FAIL + 1))
    ERRORS="$ERRORS\n  - $desc"
  fi
}

assert_json_field() {
  local desc="$1" json="$2" field="$3" expected="$4"
  local actual
  actual=$(echo "$json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('$field',''))" 2>/dev/null || echo "PARSE_ERROR")
  if [ "$actual" = "$expected" ]; then
    green "$desc ($field=$actual)"
    PASS=$((PASS + 1))
  else
    red "$desc — expected $field=$expected, got $field=$actual"
    FAIL=$((FAIL + 1))
    ERRORS="$ERRORS\n  - $desc"
  fi
}

assert_json_array_nonempty() {
  local desc="$1" json="$2"
  local len
  len=$(echo "$json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
  if [ "$len" -gt 0 ]; then
    green "$desc ($len items)"
    PASS=$((PASS + 1))
  else
    red "$desc — empty or not an array"
    FAIL=$((FAIL + 1))
    ERRORS="$ERRORS\n  - $desc"
  fi
}

echo ""
echo "═══════════════════════════════════════════"
echo "  Nexo API Validation — $BASE"
[ -n "$API_KEY" ] && echo "  (using API key)"
echo "═══════════════════════════════════════════"
echo ""

# ── Auto-detect app and sample node ─────────────────
echo "── Discovery ──"

RESP=$(api_curl_w "$BASE/api/apps")
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -1)
assert_status "GET /api/apps" 200 "$CODE"
assert_json_array_nonempty "GET /api/apps returns apps" "$BODY"

# Pick the first app
APP=$(echo "$BODY" | python3 -c "import sys,json; apps=json.load(sys.stdin); print(apps[0]['app'] if apps else '')" 2>/dev/null || echo "")
if [ -z "$APP" ]; then
  red "No apps found — cannot continue"
  exit 1
fi
green "Using app: $APP"
PASS=$((PASS + 1))

# Find a Screen node to use for traversal/impact tests
RESP=$(api_curl_w "$BASE/api/nodes?app=$APP&type=Screen")
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -1)
SAMPLE_NODE=$(echo "$BODY" | python3 -c "import sys,json; nodes=json.load(sys.stdin); print(nodes[0]['id'] if nodes else '')" 2>/dev/null || echo "")
SAMPLE_NAME=$(echo "$BODY" | python3 -c "import sys,json; nodes=json.load(sys.stdin); print(nodes[0]['name'] if nodes else '')" 2>/dev/null || echo "")

if [ -z "$SAMPLE_NODE" ]; then
  red "No Screen nodes found in $APP"
  exit 1
fi
green "Sample node: $SAMPLE_NODE ($SAMPLE_NAME)"
PASS=$((PASS + 1))

echo ""

# ── READ ENDPOINTS ──────────────────────────────

echo "── Read Endpoints ──"

# GET /api/nodes (all)
RESP=$(api_curl_w "$BASE/api/nodes")
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -1)
assert_status "GET /api/nodes" 200 "$CODE"
assert_json_array_nonempty "GET /api/nodes returns nodes" "$BODY"

# GET /api/nodes?app=
RESP=$(api_curl_w "$BASE/api/nodes?app=$APP")
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -1)
assert_status "GET /api/nodes?app=$APP" 200 "$CODE"
assert_json_array_nonempty "GET /api/nodes filtered by app" "$BODY"

# GET /api/nodes?type=Screen
RESP=$(api_curl_w "$BASE/api/nodes?type=Screen")
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -1)
assert_status "GET /api/nodes?type=Screen" 200 "$CODE"
assert_json_array_nonempty "GET /api/nodes filtered by type" "$BODY"

# GET /api/edges
RESP=$(api_curl_w "$BASE/api/edges")
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -1)
assert_status "GET /api/edges" 200 "$CODE"
assert_json_array_nonempty "GET /api/edges returns edges" "$BODY"

# GET /api/edges?type=RENDERS
RESP=$(api_curl_w "$BASE/api/edges?type=RENDERS")
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -1)
assert_status "GET /api/edges?type=RENDERS" 200 "$CODE"
assert_json_array_nonempty "GET /api/edges filtered by type" "$BODY"

# GET /api/nodes/:id
RESP=$(api_curl_w "$BASE/api/nodes/$SAMPLE_NODE")
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -1)
assert_status "GET /api/nodes/:id" 200 "$CODE"
assert_json_field "GET /api/nodes/:id correct node" "$BODY" "id" "$SAMPLE_NODE"

# GET /api/nodes/:id — not found
RESP=$(api_curl_w "$BASE/api/nodes/scr_nonexistent_xyz")
CODE=$(echo "$RESP" | tail -1)
assert_status "GET /api/nodes/:id not found" 404 "$CODE"

# GET /api/nodes/:id/edges
RESP=$(api_curl_w "$BASE/api/nodes/$SAMPLE_NODE/edges")
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -1)
assert_status "GET /api/nodes/:id/edges" 200 "$CODE"
assert_json_array_nonempty "GET /api/nodes/:id/edges returns edges" "$BODY"

# GET /api/traverse/:id
RESP=$(api_curl_w "$BASE/api/traverse/$SAMPLE_NODE")
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -1)
assert_status "GET /api/traverse/:id" 200 "$CODE"

# GET /api/impact/:id
RESP=$(api_curl_w "$BASE/api/impact/$SAMPLE_NODE")
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -1)
assert_status "GET /api/impact/:id" 200 "$CODE"

# GET /api/features
RESP=$(api_curl_w "$BASE/api/features?app=$APP")
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -1)
assert_status "GET /api/features?app=$APP" 200 "$CODE"

echo ""
echo "── Write Endpoints ──"

# POST /api/nodes — create
RESP=$(api_curl_w -X POST "$BASE/api/nodes" \
  -H 'Content-Type: application/json' \
  -d "{\"type\":\"Component\",\"app\":\"$APP\",\"name\":\"Test Validation Widget\",\"description\":\"Created by validation script\",\"tags\":[\"test\",\"validation\"],\"props\":{\"componentType\":\"presentational\"}}")
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -1)
assert_status "POST /api/nodes (create)" 201 "$CODE"
assert_json_field "POST /api/nodes returns correct id" "$BODY" "id" "cmp_test_validation_widget"
assert_json_field "POST /api/nodes returns correct type" "$BODY" "type" "Component"

# GET the created node
RESP=$(api_curl_w "$BASE/api/nodes/cmp_test_validation_widget")
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -1)
assert_status "GET created node" 200 "$CODE"
assert_json_field "GET created node correct name" "$BODY" "name" "Test Validation Widget"

# PUT /api/nodes/:id — update
RESP=$(api_curl_w -X PUT "$BASE/api/nodes/cmp_test_validation_widget" \
  -H 'Content-Type: application/json' \
  -d '{"description":"Updated by validation script","tags":["test","validation","updated"]}')
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -1)
assert_status "PUT /api/nodes/:id (update)" 200 "$CODE"
assert_json_field "PUT /api/nodes/:id bumps version" "$BODY" "version" "2"
assert_json_field "PUT /api/nodes/:id updates description" "$BODY" "description" "Updated by validation script"

# POST /api/edges — create (needs a real target node)
api_curl -X POST "$BASE/api/nodes" \
  -H 'Content-Type: application/json' \
  -d "{\"type\":\"Screen\",\"app\":\"$APP\",\"name\":\"Test Validation Screen\",\"description\":\"Target for edge test\",\"tags\":[\"test\"],\"props\":{\"route\":\"/test-validation\"}}" > /dev/null

RESP=$(api_curl_w -X POST "$BASE/api/edges" \
  -H 'Content-Type: application/json' \
  -d '{"type":"RENDERS","from":"scr_test_validation_screen","to":"cmp_test_validation_widget"}')
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -1)
assert_status "POST /api/edges (create)" 201 "$CODE"
assert_json_field "POST /api/edges correct type" "$BODY" "type" "RENDERS"

# Extract edge ID for cleanup
EDGE_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")

# POST /api/edges — constraint violation (wrong types)
RESP=$(api_curl_w -X POST "$BASE/api/edges" \
  -H 'Content-Type: application/json' \
  -d '{"type":"RENDERS","from":"cmp_test_validation_widget","to":"scr_test_validation_screen"}')
CODE=$(echo "$RESP" | tail -1)
assert_status "POST /api/edges constraint violation" 400 "$CODE"

# DELETE /api/edges/:id
if [ -n "$EDGE_ID" ]; then
  RESP=$(api_curl_w -X DELETE "$BASE/api/edges/$EDGE_ID")
  CODE=$(echo "$RESP" | tail -1)
  assert_status "DELETE /api/edges/:id" 200 "$CODE"
fi

# DELETE /api/nodes/:id
RESP=$(api_curl_w -X DELETE "$BASE/api/nodes/cmp_test_validation_widget")
CODE=$(echo "$RESP" | tail -1)
assert_status "DELETE /api/nodes/:id" 200 "$CODE"

# Verify deleted
RESP=$(api_curl_w "$BASE/api/nodes/cmp_test_validation_widget")
CODE=$(echo "$RESP" | tail -1)
assert_status "GET deleted node returns 404" 404 "$CODE"

# Cleanup second test node
api_curl -X DELETE "$BASE/api/nodes/scr_test_validation_screen" > /dev/null

echo ""
echo "── CLI (HTTP Client Mode) ──"

# Build CLI env
CLI_ENV="NEXO_API_URL=$BASE"
[ -n "$API_KEY" ] && CLI_ENV="$CLI_ENV NEXO_API_KEY=$API_KEY"

# Test with api.url set — CLI should use HttpGraphClient
CLI_OUT=$(env $CLI_ENV $CLI app list 2>&1)
if echo "$CLI_OUT" | grep -q "$APP"; then
  green "nexo app list (HTTP mode)"
  PASS=$((PASS + 1))
else
  red "nexo app list (HTTP mode) — output: $CLI_OUT"
  FAIL=$((FAIL + 1))
  ERRORS="$ERRORS\n  - nexo app list (HTTP)"
fi

CLI_OUT=$(env $CLI_ENV $CLI node list --app "$APP" --type Screen 2>&1)
if echo "$CLI_OUT" | grep -q "$SAMPLE_NODE"; then
  green "nexo node list (HTTP mode)"
  PASS=$((PASS + 1))
else
  red "nexo node list (HTTP mode) — output: $CLI_OUT"
  FAIL=$((FAIL + 1))
  ERRORS="$ERRORS\n  - nexo node list (HTTP)"
fi

CLI_OUT=$(env $CLI_ENV $CLI node get "$SAMPLE_NODE" 2>&1)
if echo "$CLI_OUT" | grep -q "$SAMPLE_NAME"; then
  green "nexo node get (HTTP mode)"
  PASS=$((PASS + 1))
else
  red "nexo node get (HTTP mode) — output: $CLI_OUT"
  FAIL=$((FAIL + 1))
  ERRORS="$ERRORS\n  - nexo node get (HTTP)"
fi

CLI_OUT=$(env $CLI_ENV $CLI traverse "$SAMPLE_NODE" 2>&1)
if echo "$CLI_OUT" | grep -q "node(s)"; then
  green "nexo traverse (HTTP mode)"
  PASS=$((PASS + 1))
else
  red "nexo traverse (HTTP mode) — output: $CLI_OUT"
  FAIL=$((FAIL + 1))
  ERRORS="$ERRORS\n  - nexo traverse (HTTP)"
fi

CLI_OUT=$(env $CLI_ENV $CLI impact "$SAMPLE_NODE" 2>&1)
if echo "$CLI_OUT" | grep -qi "impact"; then
  green "nexo impact (HTTP mode)"
  PASS=$((PASS + 1))
else
  red "nexo impact (HTTP mode) — output: $CLI_OUT"
  FAIL=$((FAIL + 1))
  ERRORS="$ERRORS\n  - nexo impact (HTTP)"
fi

# Test write via CLI in HTTP mode
CLI_OUT=$(env $CLI_ENV $CLI node create Component --app "$APP" --name "CLI HTTP Test" --desc "Created via CLI HTTP mode" --prop componentType=presentational 2>&1)
if echo "$CLI_OUT" | grep -q "cmp_cli_http_test"; then
  green "nexo node create (HTTP mode)"
  PASS=$((PASS + 1))
else
  red "nexo node create (HTTP mode) — output: $CLI_OUT"
  FAIL=$((FAIL + 1))
  ERRORS="$ERRORS\n  - nexo node create (HTTP)"
fi

# Cleanup
env $CLI_ENV $CLI node delete cmp_cli_http_test --force 2>/dev/null || \
  api_curl -X DELETE "$BASE/api/nodes/cmp_cli_http_test" > /dev/null

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
