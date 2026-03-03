# HTTP API Reference

Nexo exposes a read-only JSON API for querying the specification graph. The API is served by `nexo web` (or the API container in Docker/Warden setups).

Base URL depends on your setup:
- **Warden**: `https://nexo.test/api` (via nginx proxy) or `https://app.nexo.test/api`
- **Docker Compose**: `http://localhost:3001/api`
- **Local**: `http://localhost:3000/api`

All endpoints return JSON with `Content-Type: application/json`. CORS is enabled for all origins.

---

## Apps

### List applications

```
GET /api/apps
```

Returns all applications in the graph with their node counts.

**Response**

```json
[
  { "app": "todo", "count": 52 },
  { "app": "myapp", "count": 120 }
]
```

**Example**

```bash
curl http://localhost:3000/api/apps
```

---

## Graph

### Get full graph

```
GET /api/graph?app={app}
```

Returns all nodes and their connecting edges for an application. This is the primary endpoint used by the web console's force-directed graph visualization.

**Query parameters**

| Param | Type   | Required | Description |
|-------|--------|----------|-------------|
| `app` | string | No       | Filter to a specific application. Falls back to the server's `--app` flag if not provided. |

**Response**

```json
{
  "nodes": [
    {
      "id": "scr_login",
      "type": "Screen",
      "app": "todo",
      "name": "Login",
      "description": "Email/password login form",
      "tags": [],
      "props": { "route": "/login", "platform": ["web"], "accessLevel": "public" },
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-15T10:00:00Z",
      "version": 1
    }
  ],
  "edges": [
    {
      "id": "abc123",
      "type": "RENDERS",
      "in": "scr_login",
      "out": "cmp_login_form",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

Edges are filtered to only include those where both `in` and `out` nodes are in the returned node set.

**Example**

```bash
curl http://localhost:3000/api/graph?app=todo
```

---

## Nodes

### Get a node by ID

```
GET /api/nodes/{id}
```

Returns a single node. Returns `404` if not found.

**Path parameters**

| Param | Type   | Description |
|-------|--------|-------------|
| `id`  | string | The node ID (e.g., `scr_login`, `api_get_todos`) |

**Response**: A single [Node object](#node-object).

**Example**

```bash
curl http://localhost:3000/api/nodes/scr_login
```

### Batch fetch nodes

```
GET /api/nodes?ids={id1}&ids={id2}
```

Returns multiple nodes by ID in a single request. Returns an empty array if no `ids` are provided.

**Query parameters**

| Param | Type     | Required | Description |
|-------|----------|----------|-------------|
| `ids` | string[] | Yes      | One or more node IDs (repeat the param for multiple) |

**Response**: Array of [Node objects](#node-object).

**Example**

```bash
curl 'http://localhost:3000/api/nodes?ids=scr_login&ids=scr_register'
```

### Search nodes

```
GET /api/nodes/search?q={query}&app={app}&type={type}
```

Typeahead search across node names and IDs. Returns up to 30 results sorted by name length (shorter = more relevant).

**Query parameters**

| Param  | Type   | Required | Description |
|--------|--------|----------|-------------|
| `q`    | string | No       | Search term (case-insensitive, matches against name and ID) |
| `app`  | string | No       | Filter to a specific application |
| `type` | string | No       | Filter to a specific node type (e.g., `Screen`, `APIEndpoint`) |

If `q` is omitted or empty, returns all nodes matching the other filters (up to 30).

**Response**: Array of [Node objects](#node-object).

**Example**

```bash
curl 'http://localhost:3000/api/nodes/search?q=login&app=todo'
```

### Get edges for a node

```
GET /api/nodes/{id}/edges
```

Returns all edges connected to a node (both inbound and outbound), deduplicated.

**Path parameters**

| Param | Type   | Description |
|-------|--------|-------------|
| `id`  | string | The node ID |

**Response**: Array of [Edge objects](#edge-object).

**Example**

```bash
curl http://localhost:3000/api/nodes/scr_login/edges
```

---

## Screens

### List screens

```
GET /api/screens?app={app}
```

Returns Screen nodes and their CHILD_OF edges (for building screen hierarchy trees).

**Query parameters**

| Param | Type   | Required | Description |
|-------|--------|----------|-------------|
| `app` | string | No       | Filter to a specific application |

**Response**

```json
{
  "screens": [
    { "id": "scr_login", "type": "Screen", "name": "Login", ... }
  ],
  "childEdges": [
    { "id": "abc", "type": "CHILD_OF", "in": "scr_settings_notifications", "out": "scr_settings" }
  ]
}
```

**Example**

```bash
curl 'http://localhost:3000/api/screens?app=todo'
```

---

## Features

### List features

```
GET /api/features?app={app}
```

Returns Feature nodes for an application.

**Query parameters**

| Param | Type   | Required | Description |
|-------|--------|----------|-------------|
| `app` | string | No       | Filter to a specific application |

**Response**: Array of [Node objects](#node-object) where `type` is `"Feature"`.

**Example**

```bash
curl 'http://localhost:3000/api/features?app=todo'
```

### Feature summary with scope counts

```
GET /api/features/summary?app={app}
```

Returns features enriched with counts of belonging nodes grouped by type. Useful for dashboards.

**Query parameters**

| Param | Type   | Required | Description |
|-------|--------|----------|-------------|
| `app` | string | No       | Filter to a specific application |

**Response**

```json
[
  {
    "id": "ftr_authentication",
    "type": "Feature",
    "name": "Authentication",
    "props": { "featureId": "F1", "status": "deployed", "priority": "P0" },
    "scopeCounts": {
      "Screen": 3,
      "Component": 2,
      "APIEndpoint": 4,
      "BusinessRule": 1
    },
    "scopeTotal": 10,
    ...
  }
]
```

**Example**

```bash
curl 'http://localhost:3000/api/features/summary?app=todo'
```

### Feature scope (nodes and internal edges)

```
GET /api/features/{id}/scope
```

Returns a feature, all nodes that BELONG_TO it, and the edges connecting those nodes (excluding BELONGS_TO edges themselves). This is the data needed to render a feature subgraph.

**Path parameters**

| Param | Type   | Description |
|-------|--------|-------------|
| `id`  | string | The feature node ID (e.g., `ftr_authentication`) |

**Response**

```json
{
  "feature": { "id": "ftr_authentication", "type": "Feature", ... },
  "members": [
    { "id": "scr_login", "type": "Screen", ... },
    { "id": "cmp_login_form", "type": "Component", ... }
  ],
  "edges": [
    { "type": "RENDERS", "in": "scr_login", "out": "cmp_login_form", ... }
  ],
  "belongsToEdges": [
    { "type": "BELONGS_TO", "in": "scr_login", "out": "ftr_authentication", ... }
  ]
}
```

Returns `404` if the feature node is not found.

**Example**

```bash
curl http://localhost:3000/api/features/ftr_authentication/scope
```

---

## Traversal

### BFS traversal

```
GET /api/traverse/{id}?depth={n}&edgeTypes={types}
```

Performs a breadth-first traversal from a starting node, returning all reachable nodes and edges within the specified depth.

**Path parameters**

| Param | Type   | Description |
|-------|--------|-------------|
| `id`  | string | The starting node ID |

**Query parameters**

| Param      | Type   | Required | Default | Description |
|------------|--------|----------|---------|-------------|
| `depth`    | number | No       | `2`     | Maximum traversal depth |
| `edgeTypes`| string | No       | all     | Comma-separated edge types to follow (e.g., `RENDERS,TRIGGERS`) |

**Response**

```json
{
  "nodes": [ ... ],
  "edges": [ ... ],
  "startId": "scr_login",
  "depth": 2
}
```

**Example**

```bash
curl 'http://localhost:3000/api/traverse/scr_login?depth=3&edgeTypes=RENDERS,TRIGGERS,CALLS'
```

### Impact analysis

```
GET /api/impact/{id}?hops={n}
```

Analyzes what would be affected if a node changes. Returns direct impacts (one hop) and structural impacts (multi-hop).

**Path parameters**

| Param | Type   | Description |
|-------|--------|-------------|
| `id`  | string | The node ID to analyze |

**Query parameters**

| Param  | Type   | Required | Default | Description |
|--------|--------|----------|---------|-------------|
| `hops` | number | No       | `3`     | Maximum number of hops to traverse |

**Response**

```json
{
  "startNode": { "id": "ent_todo", "type": "DataEntity", ... },
  "directImpacts": [ ... ],
  "structuralImpacts": [ ... ],
  "edges": [ ... ],
  "hops": 3
}
```

**Example**

```bash
curl 'http://localhost:3000/api/impact/ent_todo?hops=2'
```

---

## Object Schemas

### Node object

| Field         | Type     | Description |
|---------------|----------|-------------|
| `id`          | string   | Deterministic ID: `{type_prefix}_{slugified_name}` |
| `type`        | string   | One of: `Screen`, `Component`, `UserState`, `UserAction`, `APIEndpoint`, `DataEntity`, `DataField`, `BusinessRule`, `Feature`, `InfraResource`, `SourceFile` |
| `app`         | string   | Application this node belongs to |
| `name`        | string   | Human-readable name |
| `description` | string?  | Optional description |
| `tags`        | string[] | User-defined tags |
| `props`       | object   | Type-specific properties (varies by node type) |
| `createdAt`   | string?  | ISO 8601 timestamp |
| `updatedAt`   | string?  | ISO 8601 timestamp |
| `version`     | number   | Auto-incrementing version number |

### Edge object

| Field       | Type    | Description |
|-------------|---------|-------------|
| `id`        | string  | Auto-generated edge ID |
| `type`      | string  | Edge type (e.g., `RENDERS`, `CALLS`, `BELONGS_TO`) |
| `in`        | string  | Source node ID |
| `out`       | string  | Target node ID |
| `metadata`  | object? | Optional metadata |
| `createdAt` | string? | ISO 8601 timestamp |

---

## Error responses

All errors return JSON with an `error` field:

```json
{ "error": "Not found" }
```

| Status | Meaning |
|--------|---------|
| 404    | Resource not found |
| 500    | Internal server error |

---

## CORS

All responses include permissive CORS headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

`OPTIONS` requests return `204 No Content` with these headers for preflight support.
