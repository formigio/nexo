# Test Plan: Global Node Search (N7)

| Field       | Value                  |
|-------------|------------------------|
| Feature ID  | N7                     |
| Author      | QA Tester (simulated)  |
| Date        | 2026-03-02             |
| Inputs      | 01-feature-brief.md, global-search.graph.yaml |

## Test Approach

Tests are derived from the **feature brief acceptance criteria** and the **declarative YAML spec**. The tester has not read the implementation source code. Selectors are based on `testId` values from the YAML spec and existing `data-testid` attributes from the deployed graph.

### Inputs Used

From `global-search.graph.yaml`:
- `cmp_global_search_input` → testId: `global-search-input`
- `cmp_search_results_dropdown` → testId: `global-search-dropdown`
- `cmp_sidebar_search_input` → testId: `sidebar-search-input`
- `act_search_all_nodes` → calls `GET /nodes/search` (no type filter)
- `act_navigate_to_node` → navigates to Screen Detail or Feature Detail
- `act_filter_sidebar` → filters sidebar content by selected type

From `01-feature-brief.md`:
- 8 acceptance criteria → 8 test scenarios

## Test Scenarios

### TS-1: Global search returns cross-type results
**Acceptance Criteria:** #1
**Spec Nodes:** `cmp_global_search_input`, `act_search_all_nodes`

| Step | Action | Expected |
|------|--------|----------|
| 1 | Navigate to `https://nexo.test` | Page loads with toolbar and sidebar |
| 2 | Click `[data-testid=global-search-input]` | Input is focused |
| 3 | Type "schedule" | Dropdown appears with results from multiple node types |
| 4 | Verify results | At least one Screen, one Action, and one Feature appear (based on known example graph data containing "Schedule" screen, "View Schedule" action, "Schedule Activities" feature) |

### TS-2: Results display with type indicators
**Acceptance Criteria:** #2
**Spec Nodes:** `cmp_search_results_dropdown`
**Spec Displays:** `Node.name`, `Node.type`

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type "schedule" in `[data-testid=global-search-input]` | Dropdown `[data-testid=global-search-dropdown]` appears |
| 2 | Inspect each result row | Each row contains: a colored dot, the node name with matching text highlighted, and a type label badge |
| 3 | Verify type badge text | Badge text matches node type (e.g., "Screen", "Action", "Feature", "Source File") |

### TS-3: Clicking result navigates to detail view
**Acceptance Criteria:** #3
**Spec Nodes:** `act_navigate_to_node`
**Spec Navigates To:** Screen Detail, Feature Detail

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type "schedule" in global search | Dropdown shows results |
| 2 | Click the Screen result ("Schedule") | URL changes to `/screens/scr_schedule`, Screen Detail view loads |
| 3 | Verify global search input is cleared | Input shows placeholder "Search nodes..." |
| 4 | Repeat: search "schedule", click Feature result | URL changes to `/features/ftr_schedule_activities`, Feature Detail view loads |

### TS-4: Escape and click-outside close dropdown
**Acceptance Criteria:** #4

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type "trip" in global search | Dropdown appears with results |
| 2 | Press Escape | Dropdown closes, input text is cleared |
| 3 | Type "trip" again | Dropdown reappears |
| 4 | Click anywhere outside the dropdown/input | Dropdown closes |

### TS-5: Sidebar has its own search input
**Acceptance Criteria:** #5
**Spec Nodes:** `cmp_sidebar_search_input`, `act_filter_sidebar`

| Step | Action | Expected |
|------|--------|----------|
| 1 | Navigate to `https://nexo.test` | Sidebar shows type selector and `[data-testid=sidebar-search-input]` |
| 2 | Verify placeholder | Shows "Filter screens..." (default type is Screens) |
| 3 | Type "trip" in sidebar search | Screen tree filters to only show screens containing "trip" |
| 4 | Verify group counts update | PUBLIC and AUTHENTICATED counts decrease to reflect filtered results |

### TS-6: Sidebar search mirrors original behavior
**Acceptance Criteria:** #6
**Spec Edges:** Sidebar Search Input → Node List (RENDERS), Sidebar Search Input → Screen Tree (RENDERS)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Select "API Endpoints" in type selector | Sidebar shows API endpoint list, placeholder changes to "Filter api endpoints..." |
| 2 | Type "nodes" in sidebar search | List filters to endpoints containing "nodes" |
| 3 | Verify results are grouped | Results grouped by HTTP method (GET, POST, etc.) |
| 4 | Select "Screens" in type selector | Sidebar search clears, full screen tree is shown |
| 5 | Type "welcome" | Screen tree filters to screens containing "welcome" |

### TS-7: Clearing text resets results
**Acceptance Criteria:** #7

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type "schedule" in global search | Dropdown shows results |
| 2 | Select all text and delete | Dropdown closes, no results shown |
| 3 | Type "trip" in sidebar search | Sidebar list filters |
| 4 | Select all text and delete | Full sidebar list is restored |

### TS-8: Both searches are real-time
**Acceptance Criteria:** #8

| Step | Action | Expected |
|------|--------|----------|
| 1 | Focus global search, type "s" | Results appear without pressing Enter |
| 2 | Continue typing "ch" (now "sch") | Results update to narrower set |
| 3 | Focus sidebar search, type "t" | Sidebar filters without pressing Enter |
| 4 | Continue typing "ri" (now "tri") | Sidebar updates to narrower set |

### TS-9: Independence of search contexts
**Acceptance Criteria:** Implied by #1 + #5

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type "trip" in sidebar search | Sidebar filters to trip-related screens |
| 2 | Type "schedule" in global search | Dropdown shows schedule results; sidebar still shows trip-filtered screens |
| 3 | Click a global search result | Navigates to detail; sidebar filter ("trip") persists |

### TS-10: No results state
**Acceptance Criteria:** Derived from #1 (edge case)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type "xyznonexistent" in global search | Dropdown appears with "No results found" message |
| 2 | Type "xyznonexistent" in sidebar search | Sidebar shows empty state message |

## Coverage Matrix

| Acceptance Criteria | Test Scenarios |
|----|----------------|
| AC-1: Cross-type search | TS-1, TS-8 |
| AC-2: Type indicators | TS-2 |
| AC-3: Click navigates | TS-3 |
| AC-4: Escape / click-outside | TS-4 |
| AC-5: Sidebar search | TS-5 |
| AC-6: Original behavior | TS-6 |
| AC-7: Clear resets | TS-7 |
| AC-8: Real-time | TS-8 |
| Independence (implied) | TS-9 |
| Edge case: no results | TS-10 |

## Notes for E2E Implementation

- All selectors use `data-testid` attributes from the YAML spec — no CSS class or DOM structure assumptions
- Tests assume the example app is seeded (`npm run seed:example`) with known data (559 nodes)
- Result row selectors follow pattern `[data-testid=global-search-result-{nodeId}]` for specific node assertions
- The API endpoint `GET /nodes/search` can be intercepted to verify the `type` param is absent for global search calls
