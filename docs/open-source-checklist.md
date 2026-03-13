# Nexo Open-Source Release Checklist

Target: publish Nexo as a public, MIT-licensed open-source project under the **Formigio** brand via a **fresh GitHub repository** (clean history, no Vahmos artifacts).

---

## Resolved Decisions

| Decision | Answer |
|---|---|
| **Copyright holder** | Never Behind Group, LLC |
| **Brand** | Formigio |
| **GitHub org** | `formigio` → `github.com/formigio/nexo` |
| **npm package** | `@formigio/nexo` |
| **License** | MIT |
| **claude-agent-sdk** | Remove for now (Option B) — can re-add later |
| **Example seed** | Todo app |
| **Project config** | `.nexo/` folder in consuming project (new feature) |
| **Dev environment** | Three modes: Warden, Docker Compose, no Docker |

---

## Phase 1: Sanitize Current Codebase

### Remove Vahmos-specific content
- [ ] Delete `src/seed/vahmos.ts`
- [ ] Delete `docs/vahmos-seed.md`
- [ ] Delete `notes/` directory (internal planning, personal names)
- [ ] Delete `tmp-fix-final.mjs` (untracked temp file)
- [ ] Remove `seed:vahmos` script from `package.json`
- [ ] Create a generic todo-app seed in `src/seed/example.ts`
- [ ] Add `seed:example` script to `package.json`

### Remove claude-agent-sdk
- [ ] Delete `src/ingest/validate.ts`
- [ ] Remove `nexo validate` CLI command registration from `src/cli/index.ts`
- [ ] Remove `@anthropic-ai/claude-agent-sdk` from `package.json` dependencies
- [ ] Remove any validate-related imports/references throughout the codebase

### Remove private references
- [ ] `src/ingest/sync.ts` — remove hardcoded `"group-trip-web"` and `"group-trip-infrastructure"` repo names; derive from `--frontend-path` / `--backend-path` CLI args
- [ ] `CLAUDE.md` — remove "Related Repositories" section
- [ ] `CLAUDE.md` — replace Vahmos-specific language with generic examples throughout
- [ ] `docs/architecture.md` — genericize any Vahmos-specific examples
- [ ] `docs/vision.md` — review and genericize if needed

### Verify clean
- [ ] Run `grep -ri "vahmos" src/ docs/ CLAUDE.md` — zero results
- [ ] Run `grep -ri "group-trip" src/ docs/ CLAUDE.md` — zero results
- [ ] Run `grep -ri "claude-agent-sdk" src/ package.json` — zero results
- [ ] Confirm no API keys, tokens, or secrets in any tracked file

---

## Phase 2: Add Open-Source Scaffolding

### License
- [ ] Add `LICENSE` file (MIT, copyright: Never Behind Group, LLC)
- [ ] Add `"license": "MIT"` to root `package.json`
- [ ] Add `"license": "MIT"` to `web-console/package.json` (and remove `"private": true`)

### Package metadata
- [ ] Update root `package.json`:
  - `"name": "@formigio/nexo"`
  - `"license": "MIT"`
  - `"repository": { "type": "git", "url": "https://github.com/formigio/nexo.git" }`
  - `"homepage": "https://github.com/formigio/nexo"`
  - `"bugs": { "url": "https://github.com/formigio/nexo/issues" }`
  - `"author": "Never Behind Group, LLC"`
  - `"keywords": ["specification-graph", "architecture", "surrealdb", "mcp", "developer-tools"]`

### Documentation
- [ ] Write `README.md` — public-facing:
  - What Nexo is (one-paragraph pitch)
  - Key features / why it exists
  - Screenshot of web console
  - Quickstart (prerequisites, install, init, seed, browse)
  - CLI command overview
  - Architecture summary (link to docs/)
  - MCP server usage
  - Project config (`.nexo/` folder)
  - Contributing link
  - License badge
- [ ] Write `CONTRIBUTING.md`:
  - Dev environment setup (Node 20+, three options: Warden, Docker Compose, no Docker)
  - Build and run instructions
  - How to add node/edge types
  - How to write a seed file
  - How to write an ingest parser
  - PR process
- [ ] Write `docs/api.md` — HTTP API reference:
  - All endpoints with method, path, query params, response shape
  - Grouped by resource (graph, nodes, apps, features, screens, traverse, impact)
  - Example curl commands
- [ ] Add `.env.example` with all env vars and safe defaults
- [ ] Add `CHANGELOG.md` starting at v0.1.0
- [ ] Review and update `CLAUDE.md` for public audience (this is visible in the repo)

### Gitignore updates
- [ ] Add `.claude/` to `.gitignore`
- [ ] Add `.idea/` to `.gitignore` (JetBrains)
- [ ] Confirm `dist/`, `node_modules/`, `.env` are already covered

---

## Phase 3: Project Config — `.nexo/` Folder

New feature: when `nexo` runs, it looks for a `.nexo/` directory in the current working directory for project-specific configuration. This lets users install `@formigio/nexo` globally (or as a dev dependency) and configure it per-project.

### Config file: `.nexo/config.json` (or `.nexo/config.yaml`)
- [ ] Design the config schema:
  - `app` — app name (used by `nexo ingest`, `nexo web`, etc.)
  - `db` — SurrealDB connection (`url`, `namespace`, `database`, `user`, `pass`)
  - `ingest` — source paths (`frontendPath`, `backendPath`, parser options)
  - `web` — web server options (`port`, `host`)
- [ ] Implement config loading in CLI: check `process.cwd()/.nexo/config.json`, merge with env vars and CLI flags (precedence: CLI flags > env vars > `.nexo/config.json` > defaults)
- [ ] Add `.nexo/` to the project's own `.gitignore` (Nexo's repo), but document that consuming projects should commit their `.nexo/config.json`
- [ ] Add `nexo init` support: optionally scaffold a `.nexo/` folder with a starter config
- [ ] Document the config format in README and `docs/`

### Future possibilities (not blocking v0.1.0)
- `.nexo/seeds/` — project-specific seed files
- `.nexo/parsers/` — custom ingest parsers
- `.nexo/rules/` — custom lint rules for `nexo lint`

---

## Phase 4: Docker / Dev Environment for External Users

Support three modes for running SurrealDB:

### Option 1: Warden (recommended for macOS power users)
- [x] Keep `.warden/` config as-is
- [x] Document Warden setup in CONTRIBUTING.md (install, sign cert, env up)
- [x] Benefits: TLS, `.test` domains, Traefik routing, no port conflicts

### Option 2: Docker Compose (recommended for most users)
- [x] Add standalone `docker-compose.yml` at project root (no Warden dependency):
  - SurrealDB v3 with port `8000` exposed
  - API server (Node) with port `3001` exposed
  - Console (nginx) with port `8080` exposed
- [x] Ensure `NEXO_DB_URL` defaults to `http://localhost:8000` when no `.nexo/config.json` and no env var
- [x] Document in README quickstart: `docker compose up -d && nexo init && nexo seed`

### Option 3: No Docker (BYO SurrealDB)
- [x] Document installing SurrealDB directly (`curl -sSf https://install.surrealdb.com | sh`)
- [x] Document running `surreal start` with appropriate flags
- [x] User configures connection via `.nexo/config.json` or `NEXO_DB_URL` env var
- [x] This is the lightest path — just Node + SurrealDB, no containers

### DB URL resolution order
- [x] Implement: CLI `--db-url` flag > `NEXO_DB_URL` env var > `.nexo/config.json` db.url > default (`http://localhost:8000`) — done in Phase 3

---

## Phase 5: Fresh Repo + Publish

### Create fresh repository
- [ ] Create new public GitHub repo: `github.com/formigio/nexo`
- [ ] Copy cleaned source files into the new repo (do NOT copy `.git/`)
- [ ] Verify no Vahmos/private content leaked: `grep -ri "vahmos\|group-trip" .`
- [ ] Initial commit with clean history
- [ ] Tag `v0.1.0`

### GitHub setup
- [ ] Add repo description: "Specification graph system — make your entire app architecture queryable"
- [ ] Add topics: `specification-graph`, `architecture`, `surrealdb`, `mcp`, `developer-tools`, `typescript`
- [ ] Enable Issues
- [ ] Add branch protection on `main` (require PR reviews, status checks)
- [ ] Add `CODEOWNERS` if applicable

### CI (GitHub Actions)
- [ ] Build check (`npm run build`)
- [ ] Web console build check (`npm run web:build`)
- [ ] Lint (once configured)
- [ ] Future: test suite

### npm publish
- [ ] Package name: `@formigio/nexo`
- [ ] Configure `publishConfig` in `package.json` if needed
- [ ] `npm publish --access public` from tagged release
