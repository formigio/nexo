# Nexo Known Bugs

## BUG-1: Node ID Mismatch — `createNode` Ignores Explicit Spec IDs

**File:** `src/db/nodes.ts` (line 21)
**Severity:** High
**Found:** 2026-03-03 (Gus, graph audit session)

### Description

`createNode` regenerates node IDs from node names via `generateNodeId()`, ignoring explicit `id` fields provided in YAML spec files. This causes a cascade of issues after every `nexo spec ingest --apply`:

1. Spec declares `id: scr_dotcom_blog_get_togethers`
2. DB creates node with regenerated ID like `scr_blog_introducing_get_togethers`
3. BELONGS_TO edges from the resolver target the spec-declared IDs that don't exist in the DB
4. Edges silently fail to create
5. Result: orphan nodes (zero edges) after ingest

### Workaround

After ingest, run `nexo lint --app <appname>` to find orphan nodes. Then manually create edges using actual DB node IDs (discovered via `nexo node list --app <appname> --type <type>`).

### Fix

`createNode` should accept and use explicit `id` fields from specs when provided, falling back to `generateNodeId()` only when no explicit ID is given.

---

## BUG-2: Re-ingest Fails — CREATE Instead of UPSERT

**File:** Spec sync/ingest pipeline
**Severity:** Medium
**Found:** 2026-03-03 (Gus, graph audit session)

### Description

Running `nexo spec ingest --specs-dir <path> --apply` a second time on the same specs fails with "Database record already exists" because the sync pipeline uses SurrealDB `CREATE` statements instead of `UPSERT`.

This means:
- You can only run `--apply` once per set of new changes
- Re-running after a partial failure requires manual cleanup
- No idempotent "sync to desired state" workflow

### Workaround

Only run `--apply` once per changeset. If you need to re-ingest, manually delete the conflicting nodes first, or modify the specs to only include new/changed nodes.

### Fix

Replace `CREATE` with `UPSERT` (or `INSERT ... ON DUPLICATE KEY UPDATE` equivalent) in the ingest pipeline so that re-running is safe and idempotent.
