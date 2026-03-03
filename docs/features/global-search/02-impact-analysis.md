# Impact Analysis: Global Node Search (N7)

| Field       | Value                  |
|-------------|------------------------|
| Feature ID  | N7                     |
| Analyst     | Graph Analyst (simulated) |
| Date        | 2026-03-02             |
| Method      | `nexo impact` + `nexo traverse` on affected nodes |

## Approach

Identified the nodes directly involved in the current search flow, ran `nexo impact --hops 2` and `nexo traverse --depth 2` on each, then mapped the full blast radius.

## Directly Affected Nodes

These existing nodes will be **modified** by this feature:

| Node | ID | Change |
|------|----|--------|
| Toolbar | `cmp_toolbar` | Remove search input, add global search input + results dropdown |
| Navigator Panel | `cmp_navigator_panel` | Add local sidebar search input |
| Node List | `cmp_node_list` | Receive search query from sidebar input instead of toolbar |
| Screen Tree | `cmp_screen_tree` | Receive search query from sidebar input instead of toolbar |
| GET /nodes/search | `api_get_nodes_search` | Make `type` param optional (support all-type search) |
| Select Node | `act_select_node` | Also triggered from new global search results |

## New Nodes (to be created)

| Node | Proposed ID | Type | Description |
|------|-------------|------|-------------|
| Global Search Input | `cmp_global_search_input` | Component | Toolbar search input that queries all node types |
| Search Results Dropdown | `cmp_search_results_dropdown` | Component | Overlay below toolbar showing ranked results with type badges |
| Sidebar Search Input | `cmp_sidebar_search_input` | Component | Local filter input inside Navigator sidebar |
| Search All Nodes | `act_search_all_nodes` | UserAction | Typing in global search, calls API without type filter |
| Filter Sidebar | `act_filter_sidebar` | UserAction | Typing in sidebar search, filters local list |
| Navigate To Node | `act_navigate_to_node` | UserAction | Selecting a result from global search dropdown |

## Graph Traversal Findings

### From `cmp_navigator_panel` (13 impacted nodes)

```
cmp_navigator_panel ─BELONGS_TO→ ftr_navigator
cmp_navigator_panel ─TRIGGERS→ act_select_node_type
scr_welcome ─RENDERS→ cmp_navigator_panel
```

Key: Navigator Panel is the hub of the sidebar. It belongs to `ftr_navigator`, is rendered by `scr_welcome`, and triggers the type selector. Adding a search input here is a contained change within this component.

### From `cmp_node_list` (10 impacted nodes)

```
cmp_node_list ─TRIGGERS→ act_select_node
cmp_node_list ─BELONGS_TO→ ftr_navigator
act_select_node ─CALLS→ api_get_nodes_search
```

Key: Node List triggers Select Node, which calls the search API. The data flow stays the same — only the source of the search query changes (sidebar input instead of toolbar).

### From `api_get_nodes_search` (23 impacted nodes)

```
api_get_nodes_search ─READS→ ent_node
api_get_nodes_search ─BELONGS_TO→ ftr_navigator
act_select_node ─CALLS→ api_get_nodes_search
```

Key: The search API reads from the Node entity and is called by Select Node. Making `type` optional is a backward-compatible change — existing callers that pass `type` still work. The global search will call the same endpoint without `type`.

### From `cmp_toolbar` (0 impacted nodes!)

```
(no edges)
```

Key: **Graph gap identified.** The Toolbar component has no edges in the current spec — it's an orphan node. It should have `BELONGS_TO` an existing feature and `RENDERS_ON` a screen. This gap means the impact tool underreports the true blast radius. The Toolbar is rendered by the root `App` layout and currently owns the search input that drives the entire sidebar search flow.

Similarly, `cmp_sidebar` has zero edges — another orphan.

## Feature Boundaries

### Primary feature affected: Navigator (`ftr_navigator`)

The Navigator feature owns the bulk of the affected nodes:
- `cmp_navigator_panel`, `cmp_screen_tree`, `cmp_node_list`
- `act_select_node_type`, `act_select_screen`, `act_select_node`
- `api_get_screens`, `api_get_nodes_search`

### Cross-feature touch points

| Feature | How it's touched |
|---------|-----------------|
| Screen Detail (`ftr_screen_detail`) | Global search results may navigate to screen detail |
| Feature Lens (`ftr_feature_lens`) | Global search results may navigate to feature detail |
| Query Studio (`ftr_query_studio`) | `cmp_node_selector` also calls `act_select_node` → same API |
| Graph Visualization (`ftr_graph_visualization`) | Global search could navigate to graph with node focused |

### Data layer: No schema changes

The search reads `ent_node` (fields: `name`, `type`, `app`, `props`). No new fields or entities are needed. The API change is additive (making `type` optional).

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking existing sidebar search behavior | Medium | Sidebar search should behave identically to current toolbar search |
| Search API performance without type filter | Low | Already returns max 30 results; full-table scan on 82 nodes is trivial |
| Keyboard focus conflicts (global vs sidebar) | Low | Only one search is active at a time; Escape closes global dropdown |
| Orphan nodes (`cmp_toolbar`, `cmp_sidebar`) underreport impact | Low | Address as part of spec update — add missing edges |

## Recommendation

This is a **contained, low-risk change** primarily within the Navigator feature boundary. The main work is frontend component refactoring (moving search state) and adding a dropdown overlay. The backend change is minimal (make `type` optional on an existing endpoint).

The orphan node gap (`cmp_toolbar`, `cmp_sidebar`) should be fixed in the spec as part of this work.
