# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-03-13

### Fixed
- CLI commands now show actionable validation errors instead of `[object Object]`
  - HTTP client properly formats ZodError issues from the API
  - All CLI catch blocks use `formatError()` for consistent error display

### Added
- **Web Console — Graph Management (N8 Phases 1-6)**
  - Node creation dialog with type-specific fields and Zod validation
  - Full-screen node edit page with inline props editing
  - Edge creation with constraint-validated type and target selection
  - Node and edge deletion with impact preview and inline confirmation
  - Graph context menu (right-click) for quick actions
  - Edge hover-to-delete interaction
  - Enter/exit animations, toast notifications, error boundaries
- GraphClient abstraction — swap between direct SurrealDB and HTTP API backends
- HTTP client for connecting CLI/MCP to remote Nexo API
- Auth token refresh support for Cognito-protected APIs
- Expanded edge type constraints with validation
- YAML spec file parser (`spec parse`, `spec sync`, `spec enrich`, `spec export`)
- File-based spec ingest filtering
- Sync script for maintaining public repo (`scripts/sync-to-public.sh`)

### Changed
- Edge constraints now enforced on create — clear error messages for invalid source/target types
- Defensive null guards throughout web console components

## [1.1.1] - 2026-03-05

### Fixed
- Minor documentation and build fixes

## [1.1.0] - 2026-03-04

### Added
- GraphClient interface with HTTP client for remote API support
- Project-level custom lint rules loaded from `.nexo/rules/`

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
