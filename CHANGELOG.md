# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2026-03-09

### Added
- `--files` option on `nexo spec ingest` to filter specific files by glob pattern

### Changed
- Updated API docs to reflect full CRUD support and CORS headers
- Updated architecture docs with current deployment model and GraphClient abstraction
- Updated CLAUDE.md with two operating modes, client module layer, and environment variable docs

## [1.0.0] - 2026-03-03

Initial public release.

### Added
- Core specification graph engine with SurrealDB v3
- CLI (`nexo`) with commands: init, node, edge, traverse, impact, app, feature, ingest, coverage, lint, spec, web
- MCP server (`nexo-mcp`) for AI agent integration via stdio transport
- Web console (React + D3) with force-directed graph visualization, search, filters, feature scoping, and detail panels
- HTTP API — read-only JSON API for querying the graph (see `docs/api.md`)
- Source code ingest pipeline with parsers for React Router and AWS SAM
- Graph hygiene linting with configurable rules and severity levels
- Spec-to-source coverage reporting via IMPLEMENTED_IN edges
- Project config — `.nexo/config.json` for per-project settings (app name, DB connection, ingest paths, web server options)
- Standalone Docker Compose setup (SurrealDB + API + Console)
- Warden dev environment support (TLS + `.test` domains for macOS)
- Todo app example seed
- GitHub Actions CI (build + web console build on Node 20 and 22)
- Documentation: architecture, schema, vision, HTTP API reference
