# Nexo

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Specification graph system** — make your entire app architecture queryable.

Nexo turns your application's screens, components, API endpoints, data entities, business rules, and features into a typed graph. Query it from the CLI, AI agents (via MCP), or a web console to answer questions like *"what would need to change to add feature X?"*

## Why Nexo?

Understanding how everything in an application connects is hard. UX specs live in Figma, data schemas live in migrations, business rules live in people's heads, and API contracts live in handler files. When someone asks "what's the blast radius of this change?", the answer requires a senior engineer who holds the whole system in their head.

Nexo makes that knowledge explicit and queryable:

- **Impact analysis** — change a data field and see every screen, component, API endpoint, and business rule affected
- **Feature scoping** — define a feature as a set of graph nodes and see its full scope before writing code
- **Source code ingest** — parse React Router routes and AWS SAM templates into graph nodes automatically
- **AI-native** — MCP server lets Claude Code (or any MCP client) query and modify the graph
- **Web console** — D3 force-directed graph visualization for exploring your application

## Quickstart

There are two ways to use Nexo depending on what you need:

| | **Full Stack (recommended)** | **CLI + MCP Only** |
|---|---|---|
| Install | Clone repo | `npm install -g @formigio/nexo` |
| What you get | CLI, MCP server, web console, HTTP API | CLI and MCP server only |
| SurrealDB | Managed via Docker Compose or Warden | You provide a running instance |
| Best for | Full local development | Connecting to an existing Nexo database |

### Path A: Full Stack (clone repo)

This gives you everything — CLI, web console, HTTP API, and managed SurrealDB.

```bash
# Clone and install
git clone https://github.com/formigio/nexo.git
cd nexo
npm install

# Start SurrealDB (pick one)
surreal start --user root --pass root file:nexo.db   # Direct install
# OR
npm run docker:up                                      # Docker Compose (builds + starts everything)
# OR
npm run warden:up                                      # Warden (macOS, TLS + .test domains)

# Initialize and seed
npm run build
nexo init
npm run seed:example    # Seeds a todo app with ~55 nodes and ~120 edges

# Explore from the CLI
nexo app overview --app todo
nexo traverse scr_todo_list --depth 2
nexo impact fld_todo_completed --hops 3

# Start the web console (Docker Compose serves it at localhost:8080 automatically)
npm run web:dev         # Vite dev server at localhost:5173
```

> **Note:** `nexo web` starts the JSON API server (default port 3000), not the web console UI. The full web console is a separate React SPA in `web-console/` — served automatically by Docker Compose at `localhost:8080`, or run `npm run web:dev` for Vite HMR during development.

### Path B: CLI + MCP Only (npm install)

The npm package (`@formigio/nexo`) is a **thin client** — it provides the `nexo` CLI and `nexo-mcp` MCP server, both of which connect to an existing SurrealDB instance over the network. It does **not** include:

- The web console UI (D3 graph visualization)
- The HTTP API server (`nexo web`)
- Docker Compose / Warden infrastructure for running SurrealDB

To get those, clone the full repo (Path A above).

```bash
npm install -g @formigio/nexo

# Point at a running SurrealDB instance
export NEXO_DB_URL=http://localhost:8000

# Or use a .nexo/config.json in your project
nexo init --config
# Then edit .nexo/config.json: { "db": { "url": "http://your-surreal-host:8000" } }

# Initialize and explore
nexo init
nexo app overview --app todo
nexo impact fld_todo_completed --hops 3
```

### Environment variables

Copy `.env.example` to `.env` and adjust if needed:

```bash
NEXO_DB_URL=http://localhost:8000   # SurrealDB connection
NEXO_DB_NS=nexo                     # Namespace
NEXO_DB_DB=nexo                     # Database
NEXO_DB_USER=root                   # Credentials
NEXO_DB_PASS=root
```

## CLI Commands

```
nexo init                    Create DB namespace/database + run migrations
nexo node create|get|list|update|delete   Manage spec graph nodes
nexo edge create|list|delete              Manage typed edges
nexo traverse <nodeId>       BFS graph walk (--depth, --edge-types)
nexo impact <nodeId>         Impact analysis (--hops)
nexo app list|overview       Application-level queries
nexo feature list|scope      Feature queries
nexo ingest                  Parse source code and sync nodes (--app, --frontend, --backend, --apply)
nexo coverage                Spec-to-source coverage report (--app)
nexo lint                    Graph hygiene rules (--app, --rule, --severity)
nexo web                     Start JSON API server (--port, --host, --app)
```

## Project Config

Create a `.nexo/config.json` to avoid passing `--app`, `--frontend`, `--backend` flags on every command:

```bash
nexo init --config    # Scaffolds .nexo/config.json in the current directory
```

```json
{
  "app": "myapp",
  "db": { "url": "http://localhost:8000" },
  "ingest": { "frontend": "../my-frontend", "backend": "../my-backend" },
  "web": { "port": 3000 }
}
```

All fields are optional. Precedence: CLI flags > environment variables > `.nexo/config.json` > defaults.

## HTTP API

The `nexo web` command starts a lightweight HTTP server that exposes a read-only JSON API for querying the graph. This is the **API server only** — it does not serve the web console UI.

To get the full web console, use Docker Compose (`localhost:8080`) or run `npm run web:dev` (`localhost:5173`) from the cloned repo. See [docs/api.md](docs/api.md) for the full endpoint reference.

## MCP Server

Nexo includes an MCP server for AI agent integration:

```json
{
  "mcpServers": {
    "nexo": {
      "command": "nexo-mcp",
      "args": []
    }
  }
}
```

Tools exposed: `get_node`, `list_nodes`, `create_node`, `update_node`, `delete_node`, `list_edges`, `create_edge`, `delete_edge`, `app_list`, `app_overview`, `feature_list`, `feature_scope`, `traverse`, `impact_analysis`.

## Deployment

- **Local server** is the currently supported model — run SurrealDB and the Nexo stack on your own machine or infrastructure.
- **npm CLI as thin client** — `@formigio/nexo` installed via npm works as a CLI/MCP client against any reachable SurrealDB instance. No local Docker required.
- **Hosted Nexo backend** — a managed cloud service is on the roadmap but not yet available.

## Architecture

Nexo uses **SurrealDB v3** as a unified store for graph traversal, document storage, and relational filtering in a single query engine.

**Data model:** Two tables — `node` (all types, differentiated by `type` field) and `edge` (RELATION table with typed edges). Node IDs are deterministic: `{type_prefix}_{slugified_name}`.

```
src/schema/         Zod schemas + ID generation
src/db/             SurrealDB operations (CRUD, traversal, migrations)
src/cli/            Commander-based CLI
src/ingest/         Source code parsers (React Router, AWS SAM)
src/mcp-server/     MCP server (stdio transport)
src/web/            HTTP API server (JSON endpoints)
web-console/        React + Vite + D3 web console (separate SPA)
```

See [docs/architecture.md](docs/architecture.md) for full details, [docs/schema.md](docs/schema.md) for the complete type system.

## Running SurrealDB

Nexo supports three ways to run SurrealDB:

| Method | Best for | Command | Ports |
|--------|----------|---------|-------|
| **Direct install** | Simplest setup | `surreal start --user root --pass root file:nexo.db` | DB: 8000 |
| **Docker Compose** | Consistent environments | `npm run docker:up` (or `docker compose up -d`) | DB: 8000, API: 3001, Console: 8080 |
| **Warden** | macOS power users | `npm run warden:up` (or `warden env up`) | TLS via `*.nexo.test` domains |

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed setup instructions for each method.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, how to add node/edge types, write seed files, and submit PRs.

## License

[MIT](LICENSE) - Never Behind Group, LLC
