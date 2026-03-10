# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Nexo?

Nexo (Spanish: "nexus, link, connection") is a specification graph system — a typed graph where every meaningful element of an application (screens, components, API endpoints, business rules, data entities) is a node, and relationships between them (RENDERS, CALLS, VALIDATES, DEPENDS_ON) are typed edges.

Its purpose: make an entire application definition queryable so developers, PMs, and AI agents can answer "what would need to change to add feature X?" by traversing the graph.

## Build and Run

```bash
npm run build          # TypeScript → dist/ (also copies src/schema-sql/ to dist/)
npm run dev            # tsc --watch
npm run up             # Alias for docker:up (default)
npm run docker:up      # Build all + docker compose up -d (SurrealDB + API + Console)
npm run docker:down    # docker compose down
npm run seed:example   # Build + seed an example todo app graph
npm run web:dev        # Vite dev server at localhost:5173 (for active console development)
```

> **Warden users:** Use `npm run warden:up` / `warden:down` instead of the `docker:*` scripts.

After building, the CLI is available as `node dist/cli/index.js` (or `nexo` if npm-linked).

**No test suite exists yet.** No linter is configured.

## Local Dev Environment

The full stack (SurrealDB + API + web console) can run via **Docker Compose** or **Warden**. All npm scripts are namespaced by environment.

### Option A: Docker Compose (recommended for most users)

```bash
npm run docker:up          # Build all + docker compose up -d
npm run docker:down        # docker compose down
```

Services start at: SurrealDB `localhost:8000`, API `localhost:3001`, Console `localhost:8080`.

```bash
npm run docker:db:start    # Start just SurrealDB
npm run docker:restart:api # Restart API after rebuild
npm run docker:logs        # Tail all container logs
npm run docker:logs:api    # Tail API logs only
```

The CLI defaults to `http://localhost:8000` — no extra config needed.

### Option B: Warden (macOS, TLS + .test domains)

[Warden](https://warden.dev/) (v0.15.0) provides Traefik reverse proxy, dnsmasq for `.test` domains, and automatic TLS.

**One-time setup:**

1. Install Warden: `brew install wardenenv/warden/warden`
2. Start global services: `warden svc up`
3. Sign TLS certificate: `warden sign-certificate nexo.test`
4. Start environment: `npm run warden:up`
5. Init + seed: `nexo init && npm run seed:example`

**Daily workflow:**

```bash
npm run warden:up          # Build all + warden env up
npm run warden:down        # warden env down
```

| Service | URL | Purpose |
|---------|-----|---------|
| SurrealDB | `https://db.nexo.test` | Graph database |
| API | `https://app.nexo.test` | Nexo web server (JSON API) |
| Console | `https://nexo.test` | Web console (production build) |

```bash
npm run warden:db:start    # Start just SurrealDB
npm run warden:restart:api # Restart API after rebuild
npm run warden:logs        # Tail all container logs
npm run warden:logs:api    # Tail API logs only
```

Set your DB URL for the CLI:
```bash
export NEXO_DB_URL=https://db.nexo.test
```

### How it works

- **Data persists** in Docker named volume `nexo_surrealdata`
- **API container** connects internally via `http://surrealdb:8000` (Docker network)
- **Console container** serves the built SPA via nginx, proxying `/api` to the API service
- **Vite dev mode** (optional, `npm run web:dev`) proxies `/api` to the API service
- **Warden only:** No host port bindings — Traefik routes `*.nexo.test` via labels. TLS CA is trusted in macOS System keychain.

### Configuration files

- `docker-compose.yml` — Docker Compose services (standalone mode)
- `.env` — Environment config (gitignored, local overrides)
- `.warden/warden-env.yml` — Docker Compose services for Warden
- `.warden/nginx/default.conf` — nginx config for console (SPA fallback + API proxy)

## Environment

- **Node >= 20**, ESM (`"type": "module"` in package.json)
- **TypeScript** targeting ES2022, `NodeNext` module resolution
- **SurrealDB v3** running in Docker (local)

### Two operating modes

The CLI and MCP server can talk to the graph in two ways:

| Mode | When | How it connects |
|------|------|-----------------|
| **HTTP client** | `NEXO_API_URL` is set (or `api.url` in config) | CLI/MCP → HTTP API (remote or local) |
| **Direct DB** | No API URL configured | CLI/MCP → SurrealDB directly |

**HTTP client mode** (remote API):
```bash
export NEXO_API_URL=https://your-api-host.com
export NEXO_API_KEY=<your-api-key>
nexo node list --app todo     # talks to API server
```

**Direct DB mode** (local dev):
```bash
export NEXO_DB_URL=https://db.nexo.test   # Warden
# or: defaults to http://localhost:8000    # Docker Compose
nexo node list --app todo                  # talks to SurrealDB directly
```

Config can also be set in `~/.nexo/config.json`:
```json
{ "api": { "url": "https://your-api-host.com", "key": "..." } }
```

### Environment variables

**DB config** (direct mode, all have defaults): `NEXO_DB_URL`, `NEXO_DB_NS`, `NEXO_DB_DB`, `NEXO_DB_USER`, `NEXO_DB_PASS`

**API config** (HTTP client mode): `NEXO_API_URL`, `NEXO_API_KEY`

## Architecture

### Data Model

Two SurrealDB tables with type discriminators:

- **`node`** — SCHEMAFULL. All node types in one table, differentiated by `type` field. Type-specific data lives in a `props` FLEXIBLE object. IDs are deterministic: `{type_prefix}_{slugified_name}` (e.g., `scr_schedule`, `api_get_trips`). Type prefixes defined in `src/schema/ids.ts`.
- **`edge`** — RELATION table (IN node OUT node). Edge `type` field constrained to the defined edge types. Unique index on `(in, out, type)`.

Schema DDL lives in `src/schema-sql/*.surql` files, run in sorted order by `src/db/migrate.ts`.

### Module Layers

```
src/schema/         Zod schemas + ID generation (no DB dependency)
    types.ts        Node/Edge types, per-type props schemas, edge constraints
    ids.ts          Deterministic ID generation: generateNodeId(type, name)

src/client/         GraphClient abstraction layer
    types.ts        GraphClient interface + filter/update types
    factory.ts      getClient() — returns HttpGraphClient or DbGraphClient
    http-client.ts  HTTP API implementation (used when api.url is configured)
    db-client.ts    Direct SurrealDB implementation (local dev fallback)

src/db/             SurrealDB operations (used by DbGraphClient and server routes)
    client.ts       Connection management: getDb(), initDb(), closeDb()
    nodes.ts        CRUD for nodes + normalizeNode() for RecordId→string
    edges.ts        CRUD for edges + RELATE-based creation with constraint validation
    queries.ts      BFS traversal and impact analysis
    migrate.ts      Runs .surql migration files

src/cli/            Commander-based CLI (one file per subcommand)
    index.ts        Program root — registers all subcommands
    output.ts       Shared formatting helpers (chalk-based)

src/ingest/         Source code → graph sync pipeline
    parsers/sam.ts  Parses AWS SAM template.yaml → ParsedEndpoint[]
    parsers/routes.ts  Parses React Router App.jsx → ParsedScreen[]
    sync.ts         Diff-and-sync: compare parsed source against graph, create/update nodes
    sourceMap.ts    Resolves graph node IDs → source file paths on disk

src/mcp-server/     MCP server (stdio transport) exposing graph tools to AI agents
src/web/            HTTP server (full CRUD API) + D3v7 force-directed graph visualization
```

### API-First Architecture

The CLI and MCP server are thin clients that use the `GraphClient` interface:

```
CLI / MCP  ──→  GraphClient interface  ──→  HttpGraphClient (when api.url set)
                                        └→  DbGraphClient   (local dev fallback)
```

**Mode selection**: `getApiConfig()` returns `{url, key}` or `null`. If non-null, `getClient()` returns `HttpGraphClient` (talks to the API over HTTP). Otherwise, it returns `DbGraphClient` (direct SurrealDB connection for local dev).

The API server (`src/web/routes.ts`) always uses direct DB access — it IS the server. It exposes full CRUD: `GET/POST/PUT/DELETE` on `/api/nodes`, `/api/edges`, plus `/api/init`, `/api/traverse/:id`, `/api/impact/:id`, `/api/apps`, etc.

### Key Patterns

- **SurrealDB RecordId handling**: SurrealDB returns `RecordId` objects, not strings. Every query result goes through `normalizeNode()` or `normalizeEdge()` to convert `RecordId` → plain string IDs (stripping `node:` / `edge:` prefixes).
- **Edge constraint validation**: Before creating an edge, `createEdge()` verifies both source and target nodes exist and their types are allowed for that edge type (see `EDGE_CONSTRAINTS` in `types.ts`).
- **Ingest is dry-run by default**: `nexo ingest` shows what would change; pass `--apply` to write to DB.
- **All imports use `.js` extension**: Required by NodeNext module resolution (TypeScript compiles `.ts` → `.js` but import paths must already say `.js`).
- **Dynamic imports in factory**: `getClient()` uses dynamic `import()` so that `surrealdb` is never loaded when using HTTP mode (important for lightweight CLI usage against remote API).

## CLI Commands

```
nexo init                    # Create DB namespace/database + run migrations
nexo node create|get|list|update|delete
nexo edge create|list|delete
nexo traverse <nodeId>       # BFS graph walk (--depth, --edge-types)
nexo impact <nodeId>         # Impact analysis (--hops)
nexo app list|overview
nexo feature list|scope
nexo ingest --app <name> [--frontend-path ...] [--backend-path ...] [--apply]
nexo web [--port 3000] [--host 127.0.0.1] [--app <name>]
```

## Working Principles

1. **Documentation-first** — Designs go in `docs/` before code. `docs/schema.md` is the source of truth for the data model.
2. **Schema is king** — Node/edge types and constraints in `src/schema/types.ts` must match `docs/schema.md`.
3. **Example seed proves the model** — The included todo app seed validates every schema decision against a real (if simple) application.
4. **AI-native** — Every feature should be consumable by AI agents via MCP.
