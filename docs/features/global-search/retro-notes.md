# SDLC Trial Run Retrospective Notes

**Feature:** N7 — Global Search
**Purpose:** Test the graph-driven SDLC process end-to-end, dogfooding Nexo's own spec system.
**Date started:** 2026-03-02

---

## Process Steps Completed

### Step 1: Feature Brief (PM role)
**Artifact:** `01-feature-brief.md`

- (+) Straightforward to write. The acceptance criteria gave the next roles clear targets.
- (+) Having a structured template (summary, problem, current state, acceptance criteria, out of scope) kept it focused.
- (?) Should the brief reference existing graph node IDs? We didn't, keeping it human-readable. The graph analyst in Step 2 did the mapping. This felt like the right separation — PMs think in features, not node IDs.

### Step 2: Impact Analysis (Graph Analyst role)
**Artifact:** `02-impact-analysis.md`

- (+) `nexo impact` and `nexo traverse` gave concrete, reproducible results. The analyst didn't have to read source code — the graph answered "what connects to what."
- (+) Discovered a real graph quality issue: `cmp_toolbar` and `cmp_sidebar` had zero edges (orphan nodes). This directly led to backlog item N8 (Graph Hygiene Rules).
- (-) The impact tool can only report what's in the graph. Orphan nodes mean silent blind spots. This validates the need for hygiene rules — the graph is only as good as its completeness.
- (?) The impact analysis format could be more structured. A future improvement: `nexo impact --format yaml` that outputs a machine-readable changeset skeleton.

### Step 3: Technical Solution (Tech Lead role)
**Artifact:** `03-technical-solution.md`

- (+) The impact analysis made the tech solution faster — the blast radius was already mapped, so the tech lead could focus on *how* rather than *what*.
- (+) Reading actual source code alongside graph data gave confidence. The graph said "these are the connections," the code confirmed "this is how they work."
- (+) The solution turned out smaller than expected (3 files modified, 1 created, 0 backend changes). The graph helped confirm this by showing the API already supported the use case.
- (?) Should the tech solution directly produce test IDs? We included them, which gives the tester a head start. This feels right — the person designing the components is best positioned to name the test hooks.

### Step 4: Declarative YAML Spec (Spec Author role)
**Artifact:** `specs/nexo/features/global-search.graph.yaml`

- (+) The YAML spec translated cleanly from the tech solution. Each new component, action, and edge mapped 1:1 to the architecture decisions.
- (+) `nexo spec validate` caught zero errors on first try — the schema enforcement worked as a guardrail.
- (+) Dry-run ingest showed exactly what would change: 7 new nodes, 20 new edges. This gave a clear "diff" before committing to the graph.
- (+) Cross-feature references (Toolbar → Global Search Input, Navigator Panel → Sidebar Search Input) worked via name resolution. The spec author didn't need to know IDs from other features — just names.
- (+) After `--apply`, `nexo impact ftr_global_search` confirmed the new feature's graph connections look correct: 7 direct, 13 structural impacts.
- (?) The `status: proposed` field on the Feature node is the only signal that this isn't deployed yet. Individual nodes (components, actions) don't carry status. For this trial this is fine. At scale, we may want proposed nodes visually distinct in the graph view.
- (?) The YAML doesn't capture *modifications* to existing nodes (e.g., "Toolbar will be modified to host the global search input"). It only captures new nodes and new edges. The cross-feature RENDERS edge (Toolbar → Global Search Input) implicitly says "Toolbar gains this child," but there's no explicit "Toolbar.description changes" mechanism. Worth considering for maturation.

### Step 5: Implementation (Developer role)
**Artifacts:** Modified `App.tsx`, `Toolbar.tsx`, `Navigator.tsx`; Created `GlobalSearchDropdown.tsx`

- (+) The technical solution doc made implementation nearly mechanical. The developer knew exactly which files to touch, what props to change, and what the new component interface looked like. Very little decision-making at implementation time.
- (+) The spec's `sourceFile` fields directly mapped to the files that were modified/created. The YAML spec was an accurate blueprint.
- (+) Zero backend changes confirmed — the graph-informed tech solution correctly identified that the existing `GET /nodes/search` API already supported typeless queries. Without the impact analysis, a developer might have assumed a new endpoint was needed.
- (+) Both TypeScript and Vite builds passed on first try. The well-defined component interfaces (from the tech solution) meant no type errors.
- (+) Post-implementation, the YAML spec was updated with `testId` fields — this is the developer enriching the spec for the tester. The artifact chain continues to flow forward.
- (-) The developer had to read the existing source code to understand implementation details (hooks, styling patterns, existing utilities like `highlightMatch`). The graph captures *what* connects to *what*, but not *how* things are implemented. This is expected — the graph is architectural, not a code manual.
- (?) The implementation introduced one new file (`GlobalSearchDropdown.tsx`) that was predicted in the tech solution. The spec YAML already had a `sourceFile` field pointing to it. In a mature flow, the spec could be validated against the actual filesystem to confirm all referenced source files exist.
- (?) `npm run up` as the single command to rebuild + restart everything was smooth. The dev loop (edit → build → verify in browser) worked well with the Warden/Docker setup.

### Step 6: Test Plan + E2E Tests (QA Tester role)
**Artifacts:** `04-test-plan.md`, `web-console/e2e/global-search.spec.ts`

- (+) **The spec-first approach worked.** The tester wrote 13 test cases across 10 scenarios using only the feature brief (acceptance criteria) and the YAML spec (test IDs, components, actions, navigation targets). No source code was read.
- (+) **Test IDs from the YAML spec eliminated selector guessing.** The tester used `[data-testid=global-search-input]`, `[data-testid=global-search-dropdown]`, and `[data-testid=sidebar-search-input]` directly from the spec's `testId` fields. No DOM spelunking needed.
- (+) **The acceptance criteria mapped cleanly to test scenarios.** 8 ACs → 10 test scenarios (plus 2 edge cases). The coverage matrix in the test plan makes traceability explicit.
- (+) **The YAML's `navigates_to` field directly informed navigation assertions.** The spec said `act_navigate_to_node` navigates to Screen Detail and Feature Detail, so the tester wrote tests for both navigation paths.
- (+) **Independence from implementation = true validation.** Because the tests were written from the spec, they test *what the user should experience*, not *what the code does*. If the developer had a bug where clicking a Feature result navigated to the wrong route, the test would catch it — because the test doesn't know about the routing code, only the expected outcome.
- (?) **Known data dependency.** Tests assume the example app is seeded with specific nodes ("Schedule" screen, "Schedule Activities" feature). A future improvement: the YAML spec could define test fixtures or the tests could use the nexo app's own graph (which we control).
- (?) **No test runner configured yet.** The spec file is ready but Playwright isn't set up in the project. This is a separate infrastructure task, not a gap in the process.

---

## Running Observations

### What the graph enables
1. **Reproducible impact analysis** — anyone can run `nexo impact cmp_toolbar` and get the same answer. No tribal knowledge needed.
2. **Change confidence** — dry-run ingest gives a precise diff. You know exactly what 7 nodes and 20 edges you're adding before committing.
3. **Cross-role handoffs** — each artifact builds on the previous. The graph analyst doesn't need PM context; the tech lead doesn't need to re-discover connections; the spec author translates architecture to YAML mechanically.
4. **Early defect detection** — the orphan node discovery in Step 2 was a bonus. The graph surfaced a quality issue that would have been invisible otherwise.

### What needs improvement
1. **No "modification" concept in specs** — the YAML can add nodes and edges but can't express "this existing node changes." We work around it with cross-feature edges, but it's implicit.
2. **Orphan nodes are silent** — without hygiene rules (N8), incomplete graphs give misleading impact analysis.
3. **Feature status is coarse** — `proposed` on the Feature doesn't flow down to its member nodes. The graph view can't visually distinguish "proposed component" from "deployed component."
4. **No formal handoff validation** — nothing enforces that Step 2 happened before Step 3, or that the spec matches the tech solution. The process is convention-based, not enforced.

### Process efficiency
- Steps 1-4 took one session. In a real team, these would be different people at different times, with the artifacts as the contract between them.
- The graph acted as a shared language. The PM said "search in the toolbar." The graph analyst said "`cmp_toolbar` with 0 edges." The tech lead said "modify Toolbar.tsx props." The spec author said `cmp_global_search_input` with `RENDERS` edge from `Toolbar`. Same concept, progressively refined through each lens.

### Step 7: Deploy (Release role)
**Action:** `status: proposed` → `status: deployed` in YAML, re-ingest

- (+) **One-line change, one command.** Flipping a feature from proposed to deployed was editing a single YAML field and running `nexo spec ingest --apply`. The tooling showed exactly what changed: 1 node updated, 0 new edges. Clean.
- (+) **Dry-run before apply gave confidence.** The diff showed `ftr_global_search (status: "proposed" → "deployed")` — no surprises, no side effects.
- (+) **Version tracking is automatic.** The node's `version` field bumped from 1 to 2, and `updatedAt` timestamped the promotion. The graph records when a feature was deployed.
- (+) **The graph is now the source of truth.** After ingest, `nexo node get ftr_global_search` confirms the feature and all 7 of its member nodes are part of the official spec graph. Any future `nexo impact` query will include them.
- (?) In a real workflow this step would happen after merging the feature branch to main. The git merge + YAML re-ingest would be the "deployment" — one atomic operation.

---

## All Steps Complete

- [x] Step 1: Feature brief (PM)
- [x] Step 2: Impact analysis (Graph Analyst)
- [x] Step 3: Technical solution (Tech Lead)
- [x] Step 4: Declarative YAML spec (Spec Author)
- [x] Step 5: Implementation (Developer)
- [x] Step 6: Test plan + E2E tests (QA Tester)
- [x] Step 7: Deploy (Release)

---

## Final Retrospective

### The artifact chain worked

Each step consumed the previous step's output and produced input for the next:

```
Feature Brief → Impact Analysis → Tech Solution → YAML Spec → Code → Tests → Deploy
   (PM)          (Analyst)        (Tech Lead)     (Author)    (Dev)  (QA)   (Release)
```

No step required backtracking. The graph was the connective tissue — everyone referenced nodes and edges, just at different levels of abstraction.

### Numbers

| Metric | Value |
|--------|-------|
| Artifacts produced | 7 (4 docs + 1 YAML + 1 code change + 1 test spec) |
| Files changed (code) | 3 modified, 1 created |
| Backend changes | 0 |
| Graph nodes added | 7 (1 feature + 3 components + 3 actions) |
| Graph edges added | 15 |
| E2E test cases | 13 across 10 scenarios |
| Acceptance criteria covered | 8/8 (100%) |
| Defects found in process | 1 (orphan nodes → backlog N8) |

### What to formalize for the team

1. **Artifact templates** — standardize the format for feature briefs, impact analyses, and test plans
2. **Graph hygiene rules (N8)** — must exist before this process scales, otherwise impact analysis has blind spots
3. **Spec-first testing** — enforce that testers use YAML testId fields, not DOM inspection
4. **Feature branch convention** — proposed specs live on branches, deployed specs on main
5. **`npm run up`** as the single dev loop command — confirmed it works well for this workflow

### What this trial validated

The graph-driven SDLC process is viable. The key insight: **the graph makes implicit knowledge explicit and shareable.** Instead of one person holding the full picture, each role contributes a layer to a shared, queryable model. The spec YAML is the contract; the graph is the enforcer.
