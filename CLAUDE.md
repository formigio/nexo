# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Nexo?

Nexo (Spanish: "nexus, link, connection") is a specification graph system — a typed graph where every meaningful element of an application (screens, components, API endpoints, business rules, data entities) is a node, and relationships between them (RENDERS, CALLS, VALIDATES, DEPENDS_ON) are typed edges.

Its purpose: make an entire application definition queryable so developers, PMs, and AI agents can answer "what would need to change to add feature X?" by traversing the graph.

## Build and Run

```bash
npm run build          # TypeScript → dist/ (also copies src/schema-sql/ to dist/)
npm run dev            # tsc --watch
npm run up             # Build all + start Docker services (SurrealDB + API + Console)
npm run down           # Stop all Docker services
npm run seed:example   # Build + seed an example todo app graph
npm run web:dev        # Vite dev server at localhost:5173 (for active console development)
```

After building, the CLI is available as `node dist/cli/index.js` (or `nexo` if npm-linked).

**No test suite exists yet.** No linter is configured.

## Local Dev Environment (Warden + Docker)

The dev stack runs on [Warden](https://warden.dev/) (v0.15.0), which provides Traefik reverse proxy, dnsmasq for `.test` domains, and Docker Compose orchestration.

### Services

| Service | Image | URL | Purpose |
|---------|-------|-----|---------|
| SurrealDB | `surrealdb/surrealdb:v3` | `https://db.nexo.test` | Graph database |
| API | `node:22-slim` | `https://app.nexo.test` | Nexo web server (JSON API) |
| Console | `nginx:alpine` | `https://nexo.test` | Web console (production build) |

### Setup (one-time)

1. Install Warden: `brew install wardenenv/warden/warden`
2. Start global services: `warden svc up`
3. Sign TLS certificate: `warden sign-certificate nexo.test`
4. Start environment: `warden env up`
5. Init + seed: `nexo init && npm run seed:example`

### Daily workflow

```bash
warden env up          # Start SurrealDB + API + Console (or: npm run up)
                       # Then browse https://nexo.test
warden env down        # Stop everything (or: npm run down)
```

For active web console development, use `npm run web:dev` instead (Vite HMR at `localhost:5173`).

### Additional scripts

```bash
npm run db:start       # Start just SurrealDB
npm run restart:api    # Restart API after rebuild
npm run logs           # Tail all container logs
npm run logs:api       # Tail API logs only
```

### How it works

- **No host port bindings** — Traefik routes `*.nexo.test` to the correct container via labels
- **TLS everywhere** — Warden CA is trusted in macOS System keychain; Node.js and browsers work natively
- **Data persists** in Docker named volume `nexo_surrealdata`
- **Host CLI tools** (`nexo init`, `nexo seed`, etc.) connect to SurrealDB via `https://db.nexo.test`
- **API container** connects internally via `http://surrealdb:8000` (Docker network)
- **Console container** serves the built SPA via nginx at `https://nexo.test`, proxying `/api` to the API service
- **Vite dev mode** (optional) proxies `/api` to `https://app.nexo.test` using Warden CA cert

### Configuration files

- `.env` — Warden environment config (gitignored, local overrides)
- `.warden/warden-env.yml` — Docker Compose services for Warden
- `.warden/nginx/default.conf` — nginx config for console (SPA fallback + API proxy)

## Environment

- **Node >= 20**, ESM (`"type": "module"` in package.json)
- **TypeScript** targeting ES2022, `NodeNext` module resolution
- **SurrealDB v3** running in Docker via Warden (accessible at `https://db.nexo.test`)

Environment variables for DB config (all have defaults):
`NEXO_DB_URL`, `NEXO_DB_NS`, `NEXO_DB_DB`, `NEXO_DB_USER`, `NEXO_DB_PASS`

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

src/db/             SurrealDB operations (all take a Surreal instance)
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
src/web/            HTTP server for D3v7 force-directed graph visualization
```

### Key Patterns

- **SurrealDB RecordId handling**: SurrealDB returns `RecordId` objects, not strings. Every query result goes through `normalizeNode()` or `normalizeEdge()` to convert `RecordId` → plain string IDs (stripping `node:` / `edge:` prefixes).
- **Edge constraint validation**: Before creating an edge, `createEdge()` verifies both source and target nodes exist and their types are allowed for that edge type (see `EDGE_CONSTRAINTS` in `types.ts`).
- **Ingest is dry-run by default**: `nexo ingest` shows what would change; pass `--apply` to write to DB.
- **All imports use `.js` extension**: Required by NodeNext module resolution (TypeScript compiles `.ts` → `.js` but import paths must already say `.js`).

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
