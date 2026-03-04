# Contributing to Nexo

Thank you for your interest in contributing to Nexo! This guide covers development setup, project structure, and how to submit changes.

## Development Setup

### Prerequisites

- **Node.js >= 20** (with npm)
- **SurrealDB v3** (via one of the methods below)
- **Git**

### 1. Clone and install

```bash
git clone https://github.com/formigio/nexo.git
cd nexo
npm install
cd web-console && npm install && cd ..
```

### 2. Start SurrealDB

Choose one of three methods:

#### Option A: Direct install (simplest)

Install SurrealDB directly on your machine:

```bash
# macOS
brew install surrealdb/tap/surreal

# Linux / macOS (curl)
curl -sSf https://install.surrealdb.com | sh

# Start SurrealDB
surreal start --user root --pass root file:nexo.db
```

Set your environment:
```bash
cp .env.example .env
# Default NEXO_DB_URL=http://localhost:8000 works out of the box
```

#### Option B: Docker Compose

```bash
npm run docker:up       # Builds TypeScript + web console, then starts all services
# Or without rebuilding:
docker compose up -d
```

This starts three services:
- **SurrealDB** at `http://localhost:8000`
- **API server** at `http://localhost:3001`
- **Web console** at `http://localhost:8080`

The CLI defaults to `http://localhost:8000` — no extra config needed.

Additional `docker:*` scripts:
```bash
npm run docker:down        # Stop all services
npm run docker:db:start    # Start just SurrealDB
npm run docker:restart:api # Restart API after rebuild
npm run docker:logs        # Tail all container logs
npm run docker:logs:api    # Tail API logs only
```

#### Option C: Warden (macOS, TLS + .test domains)

[Warden](https://warden.dev/) provides Traefik reverse proxy, dnsmasq for `.test` domains, and automatic TLS.

```bash
# One-time setup
brew install wardenenv/warden/warden
warden svc up
warden sign-certificate nexo.test

# Start environment
npm run warden:up        # Builds + starts via Warden
# Or without rebuilding:
warden env up
```

With Warden, SurrealDB is available at `https://db.nexo.test` (no port numbers needed). Set your DB URL:
```bash
# Option 1: .nexo/config.json (recommended)
nexo init --config
# Then edit .nexo/config.json and set db.url to "https://db.nexo.test"

# Option 2: environment variable
export NEXO_DB_URL=https://db.nexo.test
```

Additional `warden:*` scripts:
```bash
npm run warden:down        # Stop all services
npm run warden:db:start    # Start just SurrealDB
npm run warden:restart:api # Restart API after rebuild
npm run warden:logs        # Tail all container logs
npm run warden:logs:api    # Tail API logs only
```

### 3. Build and initialize

```bash
npm run build              # TypeScript -> dist/
nexo init                  # Create DB namespace + run migrations
npm run seed:example       # Seed the todo app example graph
```

### 4. Verify

```bash
nexo app overview --app todo    # Should show ~55 nodes, ~120 edges
nexo web --app todo             # Starts the JSON API server at http://localhost:3000
```

### 5. Project config (optional)

Create a `.nexo/config.json` to avoid passing flags on every command:

```bash
nexo init --config    # Scaffolds .nexo/config.json
```

Edit it with your app name and DB connection:
```json
{
  "app": "todo",
  "db": { "url": "http://localhost:8000" }
}
```

Precedence: CLI flags > environment variables > `.nexo/config.json` > defaults.

## Daily workflow

```bash
npm run docker:up          # Build all + start Docker services
npm run docker:down        # Stop Docker services
# Or for Warden: npm run warden:up / warden:down
npm run dev                # tsc --watch (rebuild on changes)
nexo web --app todo        # JSON API server at localhost:3000
npm run web:dev            # Vite dev server at localhost:5173 (full web console with HMR)
```

> **Note:** `nexo web` serves the JSON API only. For the full web console UI (D3 graph visualization), use `npm run web:dev` (Vite) or `npm run docker:up` (serves the built console at `localhost:8080`).

## Project structure

```
src/
  schema/           Zod schemas, type definitions, ID generation
  db/               SurrealDB client, CRUD operations, migrations
  cli/              Commander-based CLI (one file per subcommand)
  ingest/           Source code -> graph sync pipeline
    parsers/        React Router parser, AWS SAM parser, source file walker
  mcp-server/       MCP server exposing graph tools
  web/              HTTP server for the web console API
  seed/             Seed scripts (example.ts, nexo.ts)
  lint/             Graph hygiene rules

web-console/        React + Vite + Tailwind web console (D3 visualization)

docs/               Architecture, schema, vision, feature specs
```

## How to add a node type

1. Add the type name to `NodeType` in `src/schema/types.ts`
2. Add a type prefix to `TYPE_PREFIX` (e.g., `MyType: "myt"`)
3. Define edge constraints in `EDGE_CONSTRAINTS` (which edges can connect to/from your type)
4. Add the type's properties to `docs/schema.md`
5. Create a seed entry in `src/seed/example.ts` to test it

## How to add an edge type

1. Add the type name to `EdgeType` in `src/schema/types.ts`
2. Add constraints in `EDGE_CONSTRAINTS` specifying valid source and target node types
3. Document it in `docs/schema.md`

## How to write a seed file

Seed files live in `src/seed/`. See `src/seed/example.ts` for the pattern:

1. Define node helper functions for each type you use
2. Define all nodes as `CreateNodeInput[]` arrays
3. Define all edges as `CreateEdgeInput[]` arrays
4. In `main()`: connect to DB, wipe existing data for your app, create nodes, create edges, verify counts
5. Add a script to `package.json`: `"seed:myapp": "npm run build && node dist/seed/myapp.js"`

## How to write an ingest parser

Ingest parsers live in `src/ingest/parsers/`. Each parser:

1. Reads source files from a project directory
2. Extracts structured data (screens, endpoints, etc.)
3. Returns typed arrays (`ParsedScreen[]`, `ParsedEndpoint[]`, etc.)

The sync engine in `src/ingest/sync.ts` handles diffing and applying changes to the graph.

To add a new parser:
1. Create `src/ingest/parsers/myparser.ts`
2. Export a parse function and a name function
3. Wire it into `runSync()` in `src/ingest/sync.ts`

## Pull request process

1. Fork the repository and create a feature branch
2. Make your changes with clear, focused commits
3. Ensure `npm run build` succeeds
4. Ensure `cd web-console && npm run build` succeeds (if you changed web console code)
5. Test your changes against a running SurrealDB instance
6. Open a PR with a clear description of what and why

## Code style

- **ESM** — all imports use `.js` extension (TypeScript compiles `.ts` -> `.js`)
- **No test suite yet** — we welcome contributions to set one up
- **No linter configured yet** — we welcome contributions here too
- Keep functions focused and files reasonably sized
- Use the existing patterns in the codebase as your guide
