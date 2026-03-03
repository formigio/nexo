# Technical Solution: Global Node Search (N7)

| Field       | Value                  |
|-------------|------------------------|
| Feature ID  | N7                     |
| Author      | Tech Lead (simulated)  |
| Date        | 2026-03-02             |
| Inputs      | 01-feature-brief.md, 02-impact-analysis.md |

## Overview

Split the current single search flow into two independent search contexts:

1. **Global search** — lives in the Toolbar, searches all node types, results in a dropdown overlay
2. **Sidebar search** — lives in the Navigator, filters the sidebar list by selected type (current behavior relocated)

The backend API already supports both use cases. The work is primarily frontend component refactoring.

## Architecture

### State Management Changes (App.tsx)

**Current state:**
```
App.tsx owns:
  searchQuery ──→ Toolbar (displays input)
                ──→ Navigator (filters sidebar)
  selectedType ──→ Toolbar (placeholder text)
                ──→ Navigator (type selector + content)
```

**New state:**
```
App.tsx owns:
  globalSearchQuery ──→ Toolbar (new global search)
  selectedType      ──→ Navigator (unchanged)

Navigator internally owns:
  sidebarSearchQuery ──→ ScreenTree / NodeList (local filter)
```

Key change: The sidebar search query becomes **local state inside Navigator**, not lifted to App. This decouples the two search contexts cleanly.

### Component Changes

#### 1. Toolbar.tsx — Modified

Remove: `searchQuery`, `onSearchChange`, `selectedType` props (search-related)
Add: `globalSearchQuery`, `onGlobalSearchChange`, `onNodeSelect` props

The input changes from a passive text field to a search-with-dropdown:

```
┌─────────────────────────────────────────────────────────────┐
│ Nexo │ AppSwitcher │ Nav tabs         🔍 Search nodes... │
└─────────────────────────────────────────────────────────────┘
                                        ┌──────────────────┐
                                        │ 🟣 Toolbar       │
                                        │    Component     │
                                        │ 🟢 GET /nodes    │
                                        │    API Endpoint   │
                                        │ 🔵 Screen Detail │
                                        │    Screen         │
                                        └──────────────────┘
```

Implementation approach:
- Wrap the search input + dropdown in a container with `relative` positioning
- Dropdown is an absolutely positioned div below the input
- Dropdown only renders when `globalSearchQuery.length > 0` and results exist
- Each result row shows: colored dot (from `NODE_TYPE_COLORS`) + node name + type label (from `NODE_TYPE_LABELS`)
- Click or Enter on a result calls `onNodeSelect(node)` (reuses existing `handleNodeSelect` from App.tsx)
- Escape clears the query and closes the dropdown
- Click outside closes the dropdown (useRef + useEffect click-outside pattern)

#### 2. New: GlobalSearchDropdown.tsx

Extracted component for the results dropdown. Responsible for:
- Fetching results via `searchNodes(query, { app })` — note: **no `type` param**
- Keyboard navigation state (highlighted index)
- Rendering the result list with type badges
- Debounce via `useDeferredValue` (same pattern as NodeList today)

Props:
```typescript
interface GlobalSearchDropdownProps {
  query: string
  app: string
  onSelect: (node: Node) => void
  onClose: () => void
}
```

Query hook:
```typescript
const { data: results } = useQuery({
  queryKey: ['global-search', app, deferredQuery],
  queryFn: () => searchNodes(deferredQuery, { app }),
  enabled: deferredQuery.length > 0,
  staleTime: 10_000,
})
```

This reuses the existing `searchNodes` API client function and the existing `GET /api/nodes/search` endpoint. The only difference from today: `type` is not passed, so the backend returns matches across all types.

#### 3. Navigator.tsx — Modified

Add: Internal `sidebarSearchQuery` state + search input below type selector

```
┌──────────────────┐
│ ▼ Screens        │  ← Type selector (unchanged)
├──────────────────┤
│ 🔍 Filter...     │  ← NEW: sidebar search input
├──────────────────┤
│ ┌──────────────┐ │
│ │ ScreenTree   │ │  ← Receives sidebarSearchQuery
│ │ or NodeList  │ │
│ └──────────────┘ │
└──────────────────┘
```

Changes:
- Add `useState('')` for `sidebarSearchQuery`
- Render a search input between the type selector and content area
- Pass `sidebarSearchQuery` to ScreenTree/NodeList instead of the former `searchQuery` prop
- Remove `searchQuery` from NavigatorProps (no longer received from parent)
- Clear `sidebarSearchQuery` when `selectedType` changes (so switching types resets the filter)
- Placeholder: `Filter ${NODE_TYPE_PLURALS[selectedType].toLowerCase()}...`

#### 4. App.tsx — Modified

State changes:
- Rename `searchQuery` → `globalSearchQuery`
- Remove: passing `searchQuery` to Navigator
- Remove: passing `searchQuery` and `selectedType` to Toolbar (for search purposes)
- Add: passing `globalSearchQuery`, `onGlobalSearchChange`, `onNodeSelect` to Toolbar

```typescript
// Before
<Toolbar searchQuery={searchQuery} onSearchChange={setSearchQuery} selectedType={selectedType} />
<Navigator searchQuery={searchQuery || undefined} ... />

// After
<Toolbar appName={appName} globalSearchQuery={globalSearchQuery}
  onGlobalSearchChange={setGlobalSearchQuery} onNodeSelect={handleNodeSelect} />
<Navigator app={appName} selectedType={selectedType} ... />
```

#### 5. NodeList.tsx, ScreenTree.tsx — No interface changes

These components already accept `searchQuery?: string`. The only change is the *source* of that prop shifts from App → Navigator internal state. No code changes needed in these files.

### Backend: No Changes Required

The `GET /api/nodes/search` endpoint already supports the global search use case:

```
GET /api/nodes/search?q=toolbar&app=nexo     ← global (no type)
GET /api/nodes/search?q=toolbar&app=nexo&type=Component  ← sidebar (with type)
```

When `type` is omitted, the backend searches all node types. It already returns max 30 results sorted by name length. This is sufficient for the dropdown.

### API Client: No Changes Required

`searchNodes()` in `web-console/src/api/nodes.ts` already treats `type` as optional:

```typescript
export function searchNodes(query: string, options?: { app?: string; type?: NodeType })
```

Calling `searchNodes(query, { app })` without `type` already works.

## Source Files Summary

| File | Change | Description |
|------|--------|-------------|
| `web-console/src/App.tsx` | Modify | Rename search state, update Toolbar/Navigator props |
| `web-console/src/components/layout/Toolbar.tsx` | Modify | Replace search input with global search + dropdown trigger |
| `web-console/src/components/layout/GlobalSearchDropdown.tsx` | **Create** | Results dropdown with keyboard nav and type badges |
| `web-console/src/components/sidebar/Navigator.tsx` | Modify | Add internal search state + filter input |
| `web-console/src/components/sidebar/NodeList.tsx` | None | Interface unchanged |
| `web-console/src/components/sidebar/ScreenTree.tsx` | None | Interface unchanged |
| `src/web/routes.ts` | None | API already supports typeless search |
| `web-console/src/api/nodes.ts` | None | Client already supports optional type |

**Total: 3 files modified, 1 file created, 0 backend changes.**

## Interaction Details

### Global Search Keyboard Navigation

| Key | Action |
|-----|--------|
| Type | Debounced search, dropdown opens with results |
| ArrowDown | Move highlight to next result |
| ArrowUp | Move highlight to previous result |
| Enter | Navigate to highlighted result (calls `handleNodeSelect`) |
| Escape | Clear query, close dropdown |
| Click outside | Close dropdown (preserve query text) |

### Navigation Routing

When a global search result is selected, it follows the existing `handleNodeSelect` logic in App.tsx:

| Node Type | Navigation |
|-----------|------------|
| Screen | `navigate(/screens/{id})` — shows in main area |
| Feature | `navigate(/features/{id})` — shows in main area |
| All others | `panelStack.push(...)` — opens slide-in panel |

This means selecting a search result seamlessly integrates with the existing drill-in panel system.

### Sidebar Search Behavior

Identical to today's toolbar search. When the user types in the sidebar filter:
- **Screen type selected**: Client-side tree filtering on name + route (ScreenTree)
- **Other types selected**: Backend search via `searchNodes(query, { app, type })` (NodeList)
- Clearing the input resets to full list
- Switching types clears the filter

## Test IDs (for E2E)

| Element | test-id |
|---------|---------|
| Global search input | `global-search-input` |
| Global search dropdown | `global-search-dropdown` |
| Global search result item | `global-search-result-{nodeId}` |
| Sidebar search input | `sidebar-search-input` |
| Toolbar root (existing) | `toolbar-root` |
| Sidebar root (existing) | `sidebar-root` |

## Edge Cases

1. **Empty results**: Dropdown shows "No results found" message instead of empty space
2. **Long node names**: Truncated with ellipsis in dropdown (max-width matches input width)
3. **Rapid typing**: `useDeferredValue` prevents excessive API calls
4. **App switch**: `globalSearchQuery` should clear when app changes (same as today)
5. **Hidden sidebar** (Query Studio view): Global search still works since it's in the Toolbar
6. **Same node in both searches**: Independent — user can have global search open while sidebar is filtered
