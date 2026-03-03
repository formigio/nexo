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

### Prerequisites

- Node.js >= 20
- SurrealDB v3 ([install guide](https://surrealdb.com/install))

### Install and run

```bash
# Clone and install
git clone https://github.com/formigio/nexo.git
cd nexo
npm install

# Start SurrealDB (pick one)
surreal start --user root --pass root file:nexo.db   # Direct install
# OR
docker compose up -d                                   # Docker Compose (SurrealDB + API + Console)
# OR
warden env up                                          # Warden (macOS, TLS + .test domains)

# Initialize and seed
npm run build
nexo init
npm run seed:example    # Seeds a todo app with ~55 nodes and ~120 edges

# Explore
nexo app overview --app todo
nexo traverse scr_todo_list --depth 2
nexo impact fld_todo_completed --hops 3

# Start the web console
nexo web --app todo
# Open http://localhost:3000
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
nexo web                     Start web console (--port, --host, --app)
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

The `nexo web` server exposes a read-only JSON API for querying the graph. See [docs/api.md](docs/api.md) for the full endpoint reference.

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

## Architecture

Nexo uses **SurrealDB v3** as a unified store for graph traversal, document storage, and relational filtering in a single query engine.

**Data model:** Two tables — `node` (all types, differentiated by `type` field) and `edge` (RELATION table with typed edges). Node IDs are deterministic: `{type_prefix}_{slugified_name}`.

```
src/schema/         Zod schemas + ID generation
src/db/             SurrealDB operations (CRUD, traversal, migrations)
src/cli/            Commander-based CLI
src/ingest/         Source code parsers (React Router, AWS SAM)
src/mcp-server/     MCP server (stdio transport)
src/web/            HTTP server + web console
```

See [docs/architecture.md](docs/architecture.md) for full details, [docs/schema.md](docs/schema.md) for the complete type system.

## Running SurrealDB

Nexo supports three ways to run SurrealDB:

| Method | Best for | Command | Ports |
|--------|----------|---------|-------|
| **Direct install** | Simplest setup | `surreal start --user root --pass root file:nexo.db` | DB: 8000 |
| **Docker Compose** | Consistent environments | `docker compose up -d` | DB: 8000, API: 3001, Console: 8080 |
| **Warden** | macOS power users | `warden env up` | TLS via `*.nexo.test` domains |

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed setup instructions for each method.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, how to add node/edge types, write seed files, and submit PRs.

## License

[MIT](LICENSE) - Never Behind Group, LLC
