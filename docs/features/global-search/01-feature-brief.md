# Feature Brief: Global Node Search

| Field       | Value                  |
|-------------|------------------------|
| Feature ID  | N7                     |
| Status      | Deployed               |
| Priority    | P1                     |
| Author      | PM (simulated)         |
| Date        | 2026-03-02             |

## Summary

Add a global node search to the web console toolbar that searches across all node types within the active app scope. The existing toolbar search — which currently filters the sidebar list by the selected node type — moves into the sidebar itself, becoming a local filter for sidebar content.

## Problem

Today the toolbar search input is tightly coupled to the sidebar's selected type. If a user has "Screens" selected, the search only finds screens. To find an API endpoint, they must first switch the type selector, then search. There is no way to quickly find any node by name regardless of type.

For a graph with 500+ nodes, users need a fast way to jump to any node from anywhere in the console.

## Proposed Change

### 1. Toolbar search becomes global

- The top-right search input searches **all node types** in the active app
- Placeholder changes from "Search screens..." to "Search nodes..."
- Results appear in a **dropdown/overlay** below the input (not in the sidebar)
- Each result shows the node name, type, and a colored type indicator
- Clicking a result navigates to that node's detail view
- Keyboard navigation: arrow keys to move through results, Enter to select, Escape to close

### 2. Sidebar gets its own local search

- A new search input is added to the sidebar, below the type selector
- This input filters the sidebar list exactly as the current toolbar search does today
- Scoped to the currently selected node type
- Same search behavior: real-time filtering, highlight matches

## Current State (what exists today)

- **Toolbar** (`Toolbar.tsx`): Contains a search input that passes `searchQuery` up to `App.tsx`, which forwards it to the `Navigator` sidebar component
- **Navigator** (`Navigator.tsx`): Receives `searchQuery` and `selectedType`, passes to `ScreenTree` or `NodeList`
- **Backend** (`/api/nodes/search`): Accepts `q`, `app`, and `type` params. Returns top 30 results sorted by name length
- **ScreenTree**: Client-side tree filtering on name and route
- **NodeList**: Backend-powered search via `/api/nodes/search?q=&app=&type=`

## Acceptance Criteria

1. A user can type in the toolbar search and see results from all node types in the active app
2. Results display in a dropdown overlay with node name, type badge, and colored indicator
3. Clicking a result navigates to the appropriate detail view for that node type
4. Pressing Escape or clicking outside closes the results dropdown
5. The sidebar has its own search input that filters the sidebar list by the selected type
6. The sidebar search behaves identically to how the toolbar search works today
7. Removing text from either search clears results / resets the list
8. Both searches are real-time (debounced, not requiring Enter to submit)

## Out of Scope

- Search syntax or filters (e.g., `type:Screen name:Schedule`)
- Search history or recent searches
- Fuzzy matching (current substring match is sufficient)
- Changes to the backend search API beyond removing the `type` filter requirement
