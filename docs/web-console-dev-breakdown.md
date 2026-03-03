# Nexo Web Console: Development Breakdown

**Scope:** Phase 1 (App Navigator sidebar + Screen Detail view) and Phase 2 (Component Drill-In panel with Data Accessed)

**Date:** 2026-02-27

---

## Table of Contents

1. [Architectural Decisions](#1-architectural-decisions)
2. [Project Structure](#2-project-structure)
3. [API Layer: Existing Endpoints and New Requirements](#3-api-layer)
4. [Component Tree](#4-component-tree)
5. [Phase 1 Implementation Steps](#5-phase-1-implementation-steps)
6. [Phase 2 Implementation Steps](#6-phase-2-implementation-steps)
7. [Data Fetching Strategy](#7-data-fetching-strategy)
8. [Test ID Strategy](#8-test-id-strategy)
9. [Parallelization Plan](#9-parallelization-plan)
10. [Open Decisions](#10-open-decisions)

---

## 1. Architectural Decisions

### 1a. Where does the React app live?

**Recommendation: New `web-console/` directory at the project root.**

Rationale:
- The React app has its own dependency tree (React, Vite, TanStack Query, Tailwind) completely separate from the Node/SurrealDB backend in `src/`.
- Vite projects need their own `package.json`, `vite.config.ts`, `tsconfig.json`, and `index.html`.
- Placing it inside `src/` would conflict with the existing `tsconfig.json` that targets `ES2022` with `NodeNext` module resolution (not appropriate for browser code).
- The existing `src/web/` server remains the API server. In development, Vite proxies API requests to it. In production, the API server serves the built assets from `web-console/dist/`.

```
nexo/
  src/                        # Existing backend (unchanged)
    web/
      routes.ts               # API routes (extended with new endpoints)
      index.ts                # HTTP server
      html.ts                 # Legacy D3 page (kept for Graph view link)
  web-console/                # NEW: React + Vite app
    package.json
    vite.config.ts
    tsconfig.json
    index.html
    src/
      main.tsx
      App.tsx
      api/                    # API client functions
      components/             # Shared components
      features/               # Feature-sliced modules
      hooks/                  # Custom hooks
      lib/                    # Utilities, constants, types
      styles/                 # Global styles, Tailwind config
```

**Why not replace `src/web/`?** The Express-like server in `src/web/` does two things: serves API routes and serves the HTML page. The API routes are still needed. The HTML page becomes the legacy graph view accessible from the toolbar's `[Graph]` link. The new React app is a separate build artifact.

### 1b. CSS approach

**Recommendation: Tailwind CSS v4 with a custom theme.**

The UX spec defines a precise design system (colors, typography, spacing, surfaces). Tailwind's utility classes map directly to these values. No component library -- the design is custom enough that a library like shadcn would need heavy overriding. The dark theme is the only theme.

Custom theme values extracted from the spec:

```
Colors:
  node-screen:       #58a6ff    node-api:          #3fb950
  node-rule:         #f85149    node-component:    #d2a8ff
  node-feature:      #ffa657    node-entity:       #79c0ff
  node-field:        #a8d8f0    node-action:       #ffd700
  node-state:        #ff7b72    node-infra:        #8b949e
  node-file:         #56d364

  status-deployed:   #3fb950    status-progress:   #ffa657
  status-proposed:   #8b949e    status-deprecated: #6e7681

  impact-breaking:   #f85149    impact-update:     #ffa657
  impact-info:       #8b949e

  bg-body:           #0f1117    surface-1:         #161b22
  surface-2:         #21262d    border-default:    #30363d
  border-subtle:     #21262d

  text-primary:      #e1e4e8    text-secondary:    #8b949e
  text-dim:          #6e7681

Typography:
  Font family: system-ui (system font stack)
  Sizes: 10px, 11px, 12px, 13px, 16px (per spec)

Spacing:
  Base unit: 4px. Scale: 4, 8, 12, 16, 24, 32, 48
```

### 1c. State management

**Recommendation: URL state + TanStack Query. No global state library.**

- **Server state**: TanStack React Query for all API data (node lists, edges, traversals). This handles caching, refetching, loading/error states.
- **Navigation state**: URL-driven via React Router. The selected screen, the active drill-in node, and the panel stack are all encoded in the URL. This makes the app deep-linkable and back-button navigable.
- **UI state**: React local state (useState) for collapse toggles, hover states, search input. No Redux, Zustand, or Jotai needed.

### 1d. How the API server and Vite dev server coexist

In development:
- The existing API server runs on port 3000 (`nexo web --port 3000`).
- Vite dev server runs on port 5173 (default) with a proxy rule: `/api/*` forwards to `http://localhost:3000`.
- The developer works against `http://localhost:5173`.

In production:
- `npm run build` inside `web-console/` produces static assets in `web-console/dist/`.
- The API server in `src/web/routes.ts` gains a static file serving route that serves `web-console/dist/` for all non-`/api/` routes. This replaces the current `GET /` handler that serves the inline D3 HTML.
- The legacy D3 graph remains accessible at a dedicated route, e.g., `GET /graph` or `GET /legacy`.

---

## 2. Project Structure

```
web-console/
  package.json                    # React, Vite, TanStack Query, React Router, Tailwind
  vite.config.ts                  # Proxy config, path aliases
  tsconfig.json                   # Browser-appropriate TS config
  index.html                      # Vite entry point
  src/
    main.tsx                      # ReactDOM.createRoot, QueryClientProvider, RouterProvider
    App.tsx                       # Root layout: Toolbar + Sidebar + MainArea

    api/
      client.ts                   # fetch wrapper with base URL, error handling
      nodes.ts                    # getNode(), listNodes(), getNodeEdges()
      edges.ts                    # listEdges()
      screens.ts                  # getScreenTree() -- calls listNodes + listEdges to build hierarchy
      traversal.ts                # traverse(), impact() -- new endpoints

    lib/
      types.ts                    # TypeScript types mirroring schema (Node, Edge, NodeType, etc.)
      constants.ts                # TYPE_COLORS, EDGE_LABELS, TYPE_PREFIXES, STATUS_COLORS
      edge-labels.ts              # Human-readable edge labels map
      url.ts                      # URL encoding/decoding helpers for node IDs in routes

    hooks/
      useScreenTree.ts            # Builds hierarchical screen tree from flat node + edge data
      useScreenDetail.ts          # Fetches all data for a screen detail view (parallel queries)
      useComponentDetail.ts       # Fetches component detail with DISPLAYS, ACCEPTS_INPUT, TRIGGERS
      useDataAccessed.ts          # 2-hop traversal: Screen -> Components -> DataFields -> DataEntities

    components/
      layout/
        Toolbar.tsx               # 52px top bar: logo, app selector, search, graph link
        Sidebar.tsx               # Left sidebar container with screen tree
        MainArea.tsx              # Main content area (right of sidebar)
        SlideInPanel.tsx          # Right slide-in panel with breadcrumb stack

      shared/
        NodePill.tsx              # Inline node reference: colored dot + name, clickable
        TypeBadge.tsx             # Small pill: [Screen], [Component], etc.
        EdgeLabel.tsx             # Human-readable edge type display
        ExpandableSection.tsx     # Collapsible section with "Show N more" pattern
        LoadingState.tsx          # Skeleton/spinner for loading
        ErrorState.tsx            # Error display with retry
        EmptyState.tsx            # "No items" placeholder
        SearchInput.tsx           # Search input with typeahead

      sidebar/
        ScreenTree.tsx            # Hierarchical screen list (Public/Auth/Admin groups)
        ScreenTreeItem.tsx        # Individual screen entry with expand/collapse for children
        ScreenTreeGroup.tsx       # Group header (Public, Authenticated, Admin)

      screen-detail/
        ScreenDetailView.tsx      # Main panel for selected screen
        ComponentsSection.tsx     # List of rendered components with type badges
        DataAccessedSection.tsx   # Derived data fields from component traversal
        UserActionsSection.tsx    # User actions triggered by components
        BusinessRulesSection.tsx  # Rules that constrain/validate related items
        RequiredStatesSection.tsx # User states required by this screen
        SourceFileSection.tsx     # Implementation source file link
        FeatureSection.tsx        # Feature membership

      drill-in/                   # Phase 2
        ComponentPanel.tsx        # Component detail slide-in
        ActionPanel.tsx           # UserAction detail slide-in
        EndpointPanel.tsx         # APIEndpoint detail slide-in
        EntityPanel.tsx           # DataEntity detail slide-in
        FieldPanel.tsx            # DataField detail slide-in
        RulePanel.tsx             # BusinessRule detail slide-in
        DrillInBreadcrumb.tsx     # Breadcrumb trail for nested panels

    styles/
      globals.css                 # Tailwind directives, custom properties, base reset
```

---

## 3. API Layer

### Existing Endpoints (from `src/web/routes.ts`)

| Method | Path | Returns | Used By |
|--------|------|---------|---------|
| GET | `/api/graph?app=` | `{ nodes: Node[], edges: Edge[] }` | D3 graph (full dump) |
| GET | `/api/nodes/:id` | `Node` | Node detail |
| GET | `/api/nodes/:id/edges` | `Edge[]` | Edges for a node (both directions) |
| GET | `/api/features?app=` | `Node[]` (type=Feature) | Feature list |

### New Endpoints Needed

**3a. Screen tree endpoint** -- `GET /api/screens?app=`

Returns all Screen nodes for an app plus the CHILD_OF edges between them. The client needs this to build the sidebar hierarchy without fetching the entire graph.

```typescript
// Response shape:
{
  screens: Node[],           // All nodes where type = "Screen"
  childEdges: Edge[]         // All edges where type = "CHILD_OF"
}
```

Implementation: Two parallel queries in `listNodes(db, { app, type: "Screen" })` and `listEdges(db, { type: "CHILD_OF" })`, then filter CHILD_OF edges to only those connecting returned screens.

**3b. Screen detail endpoint** -- `GET /api/screens/:id/detail`

Returns all the data needed to render the Screen Detail view in a single request, avoiding multiple round trips.

```typescript
// Response shape:
{
  screen: Node,
  components: Node[],        // via RENDERS edges
  userStates: Node[],        // via REQUIRES_STATE edges
  userActions: Node[],       // via Component -> TRIGGERS -> UserAction
  businessRules: Node[],     // via rules that CONSTRAINS actions or VALIDATES fields touched by components
  feature: Node | null,      // via BELONGS_TO edge
  sourceFile: Node | null,   // via IMPLEMENTED_IN edge
  edges: Edge[]              // All edges connecting the above nodes
}
```

Implementation: This is a compound query. Start from the screen node ID, follow RENDERS edges to get components, then follow TRIGGERS from components to get user actions, follow BELONGS_TO to get the feature, follow IMPLEMENTED_IN to get the source file, follow REQUIRES_STATE to get user states. Also collect relevant business rules by checking CONSTRAINS edges targeting user actions and VALIDATES edges targeting data fields displayed by components.

This endpoint prevents the client from making 6+ separate API calls on every screen navigation. Alternative: keep it as parallel client-side fetches using `GET /api/nodes/:id/edges` plus individual node lookups. The trade-off is latency (one request vs many) versus backend complexity (compound query vs simple routes).

**Recommendation: Start with client-side parallel fetches for Phase 1, add the compound endpoint as an optimization if latency is noticeable.** The existing `/api/nodes/:id/edges` endpoint already returns all edges for a node, and the client can batch resolve connected node IDs.

**3c. Node batch endpoint** -- `GET /api/nodes?ids=id1,id2,id3`

Returns multiple nodes by ID in a single request. The screen detail view discovers connected node IDs from edges, then needs to fetch those nodes. Without this endpoint, each connected node requires a separate `GET /api/nodes/:id` call.

```typescript
// Response shape:
Node[]
```

Implementation: `SELECT * FROM node WHERE id IN [$id1, $id2, ...]` with RecordId construction.

**3d. Data accessed endpoint** -- `GET /api/screens/:id/data-accessed`

Returns the "Data Accessed" derived view: Screen -> RENDERS -> Component -> (DISPLAYS | ACCEPTS_INPUT) -> DataField, then group by the DataField's parent DataEntity (via HAS_FIELD edge from entity to field).

```typescript
// Response shape:
{
  entities: Array<{
    entity: Node,              // DataEntity node
    fields: Array<{
      field: Node,             // DataField node
      accessType: "DISPLAYS" | "ACCEPTS_INPUT",
      component: Node          // Which component accesses this field
    }>
  }>
}
```

Implementation: Multi-hop traversal starting from the screen. This is the 2-hop query described in the UX spec. It requires: (1) get RENDERS edges from screen -> component IDs, (2) get DISPLAYS and ACCEPTS_INPUT edges from those components -> field IDs, (3) get HAS_FIELD edges where `out` is one of those field IDs -> entity IDs, (4) batch fetch entities.

**Recommendation: Build this as a backend endpoint because the multi-hop traversal is inefficient to do client-side.** The existing `traverse()` function can be adapted but it does bidirectional BFS, not the targeted directional traversal needed here. A dedicated query function is cleaner.

**3e. Traverse endpoint** -- `GET /api/traverse/:id?depth=&edgeTypes=`

Exposes the existing `traverse()` function from `src/db/queries.ts` via HTTP. Already implemented in the DB layer, just needs an API route.

```typescript
// Response shape:
TraversalResult  // { nodes, edges, startId, depth }
```

**3f. Impact endpoint** -- `GET /api/impact/:id?hops=`

Exposes the existing `impactAnalysis()` function via HTTP. Already implemented in the DB layer, just needs an API route.

```typescript
// Response shape:
ImpactResult  // { directImpacts, structuralImpacts, edges, startNode, hops }
```

### Priority of New Endpoints

| Endpoint | Phase | Blocking? | Notes |
|----------|-------|-----------|-------|
| `GET /api/screens?app=` | 1 | Yes | Sidebar depends on it |
| `GET /api/nodes?ids=` | 1 | Yes | Screen detail depends on it |
| `GET /api/traverse/:id` | 1 | No | Impact button needs it later |
| `GET /api/impact/:id` | 1 | No | Impact sidebar needs it |
| `GET /api/screens/:id/data-accessed` | 2 | Yes | Data Accessed section |
| `GET /api/screens/:id/detail` | 2 (opt.) | No | Optimization, not required |

---

## 4. Component Tree

### Phase 1 Render Tree

```
<App>
  <QueryClientProvider>
    <BrowserRouter>
      <div className="h-screen flex flex-col bg-bg-body">
        <Toolbar />                                           # 52px fixed top
        <div className="flex flex-1 overflow-hidden">
          <Sidebar>                                           # 240px fixed left
            <SearchInput />
            <ScreenTree>
              <ScreenTreeGroup label="Public">
                <ScreenTreeItem />
                <ScreenTreeItem />
              </ScreenTreeGroup>
              <ScreenTreeGroup label="Authenticated">
                <ScreenTreeItem>                              # Expandable
                  <ScreenTreeItem />                          # Child screen
                </ScreenTreeItem>
              </ScreenTreeGroup>
              <ScreenTreeGroup label="Admin">
                <ScreenTreeItem />
              </ScreenTreeGroup>
            </ScreenTree>
          </Sidebar>
          <MainArea>                                           # Flex-1, scrollable
            <Routes>
              <Route path="/" element={<WelcomeView />} />
              <Route path="/screens/:screenId" element={<ScreenDetailView />} />
            </Routes>
          </MainArea>
        </div>
      </div>
    </BrowserRouter>
  </QueryClientProvider>
</App>
```

### Phase 2 Addition

```
<MainArea>
  <ScreenDetailView />
  <SlideInPanel>                                              # Overlays from right
    <DrillInBreadcrumb />
    <ComponentPanel />                                        # or ActionPanel, EndpointPanel, etc.
  </SlideInPanel>
</MainArea>
```

The `SlideInPanel` is positioned absolutely over the main area. It supports stacking (clicking a node inside a panel opens another panel on top). The breadcrumb shows the navigation chain: `Schedule > ActivityCard > RSVP to Activity`. Clicking any breadcrumb item pops the stack back to that level.

### Key Component Responsibilities

**Toolbar**: Logo, app selector dropdown (populated from a future `/api/apps` endpoint or hardcoded to the `--app` flag value for now), global search input (filters sidebar), `[Graph]` link (opens legacy D3 view in new tab).

**ScreenTree**: Receives flat list of Screen nodes + CHILD_OF edges. Builds a tree using `parentScreen` prop and `CHILD_OF` edges. Groups screens into access level categories (Public, Authenticated, Admin) based on `props.accessLevel`. Each item shows the screen name, with a colored dot indicating it is selected.

**ScreenDetailView**: The main content when a screen is selected. Contains stacked sections: header (name, route, access badges), Components, Data Accessed, User Actions, Business Rules, Required States, Source File, Feature. Each section uses `ExpandableSection` and renders items as clickable rows (opening the drill-in panel in Phase 2).

**SlideInPanel**: A container that slides in from the right edge. Manages a stack of panels. Each panel is a React component for a specific node type. The stack is maintained in URL state (query parameter encoding the breadcrumb chain). Escape key closes the top panel. Clicking outside the panel closes the entire stack.

---

## 5. Phase 1 Implementation Steps

### Step 1: Scaffold the Vite + React project

- Create `web-console/` directory
- Initialize with `npm create vite@latest . -- --template react-ts`
- Install dependencies: `react-router-dom`, `@tanstack/react-query`, `tailwindcss`
- Configure `vite.config.ts` with API proxy to `http://localhost:3000`
- Configure Tailwind with the custom theme values from the UX spec
- Set up path aliases: `@/` for `src/`, `@specs/` for `../specs/`
- Create `globals.css` with Tailwind directives and CSS custom properties for the color system
- Verify the dev server starts and renders a "Hello Nexo" page

**Estimated effort:** 1-2 hours

### Step 2: Add new backend API endpoints

Work in `src/web/routes.ts`:

- Add `GET /api/screens?app=` -- list Screen nodes + CHILD_OF edges
- Add `GET /api/nodes?ids=id1,id2,...` -- batch node fetch
- Add `GET /api/traverse/:id?depth=&edgeTypes=` -- expose traverse()
- Add `GET /api/impact/:id?hops=` -- expose impactAnalysis()
- Add CORS headers for development (Vite runs on a different port)

**Estimated effort:** 2-3 hours

### Step 3: Build the API client layer

In `web-console/src/api/`:

- `client.ts` -- base fetch wrapper with error handling, base URL from env
- `nodes.ts` -- `fetchNode(id)`, `fetchNodesBatch(ids[])`, `fetchNodeEdges(id)`
- `screens.ts` -- `fetchScreenTree(app)` returning `{ screens, childEdges }`
- `traversal.ts` -- `fetchTraversal(id, opts)`, `fetchImpact(id, hops)`

In `web-console/src/lib/`:

- `types.ts` -- TypeScript interfaces for Node, Edge, NodeType, EdgeType (mirrored from `src/schema/types.ts` but as plain TS types, not Zod schemas, since this is browser code)
- `constants.ts` -- TYPE_COLORS, EDGE_LABELS mapping, TYPE_PREFIXES

**Estimated effort:** 2-3 hours

### Step 4: Build shared UI components

- `NodePill` -- colored dot + name, accepts `node` prop, clickable
- `TypeBadge` -- small pill with type color background at 15% opacity
- `EdgeLabel` -- maps raw edge type to human-readable label
- `ExpandableSection` -- section with header, child content, "Show N more" pattern
- `LoadingState` -- skeleton loader matching the layout
- `ErrorState` -- error message with retry button
- `EmptyState` -- placeholder with icon and message

All components get `data-testid` attributes from the test ID registry.

**Estimated effort:** 3-4 hours

### Step 5: Build the Layout Shell

- `App.tsx` -- QueryClientProvider, BrowserRouter, layout grid
- `Toolbar.tsx` -- 52px top bar with logo, app name, search input, graph link
- `Sidebar.tsx` -- 240px left panel container
- `MainArea.tsx` -- scrollable content area
- Global CSS: body background, font stack, scrollbar styling

**Estimated effort:** 2-3 hours

### Step 6: Build the Screen Tree Sidebar

- `useScreenTree` hook -- fetches screen tree data, builds hierarchical structure
  - Groups by `props.accessLevel`: "public" -> Public, "authenticated" -> Authenticated, "role:*" -> Admin
  - Uses CHILD_OF edges to nest children under parents
  - Sorts screens within groups alphabetically
- `ScreenTreeGroup` -- collapsible group header with count
- `ScreenTreeItem` -- screen name with indentation for nesting, expand/collapse for children, active/selected state tied to current URL
- `ScreenTree` -- orchestrates groups and items

Navigation: clicking a screen navigates to `/screens/:screenId` via React Router.

**Estimated effort:** 4-5 hours

### Step 7: Build the Screen Detail View

- `ScreenDetailView` -- route component at `/screens/:screenId`
- Header: screen name (16px/600), route badge, access level badges, feature badge
- `useScreenDetail` hook -- given a screen ID:
  1. Fetch all edges for the screen via `/api/nodes/:id/edges`
  2. Separate edges by type: RENDERS, REQUIRES_STATE, BELONGS_TO, IMPLEMENTED_IN
  3. Batch fetch connected nodes via `/api/nodes?ids=...`
  4. For components: additionally fetch their TRIGGERS edges to find user actions
  5. Return structured data: `{ screen, components, userStates, userActions, feature, sourceFile }`
- `ComponentsSection` -- lists components with type badge (interactive/presentational/etc.), shows TRIGGERS summary per component
- `UserActionsSection` -- lists actions with action type badge, shows CALLS chain to API endpoint
- `BusinessRulesSection` -- lists rules with rule type + enforcement badges
- `RequiredStatesSection` -- lists user states with state type badge
- `SourceFileSection` -- shows repo + path, clickable (no-op for now, future: open in editor)
- `FeatureSection` -- shows feature name, status badge, priority badge

Every item in every section is rendered as a clickable row (click handler is a no-op in Phase 1, becomes drill-in navigation in Phase 2).

**Estimated effort:** 6-8 hours

### Step 8: Wire up search filtering

- Global search in toolbar filters the sidebar screen tree in real-time
- Filter logic: screen name or route matches the search term (case-insensitive)
- When searching, all groups expand to show matching results
- Highlight matching text in results

**Estimated effort:** 1-2 hours

### Step 9: Polish and integration testing

- Verify all loading states render correctly
- Verify error states render correctly (DB down, no screens)
- Verify empty states render correctly (app with no screens)
- Test with the example seeded data (`npm run seed:example`)
- Test keyboard navigation in sidebar (arrow keys, Enter to select)
- Verify URL-driven navigation works (direct link to `/screens/scr_schedule`)

**Estimated effort:** 2-3 hours

**Phase 1 total estimated effort: 23-31 hours**

---

## 6. Phase 2 Implementation Steps

### Step 10: Build the Data Accessed section

- Add `GET /api/screens/:id/data-accessed` backend endpoint
  - Implementation: Screen -> RENDERS -> Components -> DISPLAYS/ACCEPTS_INPUT -> DataFields, then resolve parent DataEntities via HAS_FIELD edges (reversed)
- `useDataAccessed` hook -- calls the new endpoint
- `DataAccessedSection` component:
  - Groups fields by parent entity
  - Each row shows: entity name dot + field name, field type, access type badge (DISPLAYS/ACCEPTS_INPUT)
  - Entity headers show entity name with storage type badge

**Estimated effort:** 4-5 hours

### Step 11: Build the SlideInPanel container

- `SlideInPanel.tsx` -- positioned fixed, right: 0, slides in with CSS transition
- Panel stack state: maintained as URL search params (e.g., `?panel=cmp_activity_card,act_rsvp_to_activity`)
- `DrillInBreadcrumb` -- shows the panel stack as clickable breadcrumb items
- Close behavior: Escape key closes top panel, clicking outside closes all
- Focus trap: when panel is open, Tab key cycles within the panel
- Animation: 300ms slide from right, with backdrop overlay at 50% opacity

**Estimated effort:** 3-4 hours

### Step 12: Build the Component Drill-In Panel

- `ComponentPanel.tsx` -- shown when a component is clicked from the screen detail
- `useComponentDetail` hook:
  1. Fetch component node
  2. Fetch DISPLAYS edges -> DataField nodes -> resolve parent DataEntity via HAS_FIELD
  3. Fetch ACCEPTS_INPUT edges -> DataField nodes -> resolve parent DataEntity
  4. Fetch TRIGGERS edges -> UserAction nodes
  5. For each UserAction, fetch CALLS edges -> APIEndpoint nodes
  6. Fetch IMPLEMENTED_IN edge -> SourceFile node
- Panel layout:
  - Header: component name, type badge (interactive/presentational/etc.)
  - "Displays" section: grouped by entity, each field with type and entity context
  - "Accepts Input" section: same structure
  - "Triggers" section: each action with expandable CALLS chain showing endpoint method + path
  - "Implemented In" section: source file link

All items in the panel are clickable, opening nested panels (action -> endpoint -> entity).

**Estimated effort:** 5-6 hours

### Step 13: Build secondary drill-in panels

- `ActionPanel.tsx` -- UserAction detail: action type, input type, CALLS -> endpoints, CONSTRAINS <- rules
- `EndpointPanel.tsx` -- APIEndpoint detail: method, path, auth info, READS/WRITES -> entities
- `EntityPanel.tsx` -- DataEntity detail: storage type, key pattern, HAS_FIELD -> fields
- `FieldPanel.tsx` -- DataField detail: field type, required, validation, DISPLAYS/ACCEPTS_INPUT <- components, VALIDATES <- rules
- `RulePanel.tsx` -- BusinessRule detail: rule type, enforcement, pseudocode, CONSTRAINS -> actions, VALIDATES -> fields

Each panel follows the same pattern: fetch node + edges, resolve connected nodes, render sections.

**Estimated effort:** 6-8 hours

### Step 14: Connect everything

- Update `ComponentsSection` to open `ComponentPanel` on click
- Update `UserActionsSection` to open `ActionPanel` on click
- Update `BusinessRulesSection` to open `RulePanel` on click
- Update all `NodePill` and clickable items in panels to push onto the panel stack
- Verify the breadcrumb trail works for 3+ levels of nesting
- Verify back navigation (clicking breadcrumb items pops the stack)

**Estimated effort:** 2-3 hours

### Step 15: Polish Phase 2

- Keyboard navigation within panels (Tab cycles through items)
- Focus trap implementation
- Animation refinement
- Screen reader labels for close button, breadcrumb items
- Test with example data: navigate Schedule -> ActivityCard -> RSVP to Activity -> PUT /rsvp -> RSVP entity

**Estimated effort:** 2-3 hours

**Phase 2 total estimated effort: 22-29 hours**

---

## 7. Data Fetching Strategy

### TanStack React Query Configuration

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 minutes -- graph data changes rarely
      gcTime: 30 * 60 * 1000,      // 30 minutes cache
      retry: 1,
      refetchOnWindowFocus: false,  // Explicit refresh, not auto-refetch
    },
  },
});
```

### Query Key Strategy

```typescript
const queryKeys = {
  screens: (app: string) => ['screens', app] as const,
  node: (id: string) => ['node', id] as const,
  nodeEdges: (id: string) => ['node', id, 'edges'] as const,
  nodesBatch: (ids: string[]) => ['nodes', 'batch', ids.sort().join(',')] as const,
  screenDetail: (id: string) => ['screen', id, 'detail'] as const,
  dataAccessed: (id: string) => ['screen', id, 'data-accessed'] as const,
  traversal: (id: string, depth: number) => ['traversal', id, depth] as const,
  impact: (id: string, hops: number) => ['impact', id, hops] as const,
};
```

### Fetching Pattern per View

**Sidebar (ScreenTree):**
- Single query: `fetchScreenTree(app)` -> cache as `['screens', app]`
- Refetch: manual via toolbar refresh button

**Screen Detail View:**
- Query 1: `fetchNodeEdges(screenId)` -> get all edges
- Query 2: `fetchNodesBatch(connectedNodeIds)` -> resolve connected nodes
- These run sequentially (Q2 depends on Q1's result)
- Use `useQuery` with `enabled: !!edgesData` for the dependent query
- The `useScreenDetail` hook composes these internally

**Data Accessed (Phase 2):**
- Single query to the compound backend endpoint: `fetchDataAccessed(screenId)`
- Backend does the multi-hop traversal, client receives pre-structured data

**Drill-In Panels (Phase 2):**
- Same pattern as screen detail: fetch edges, batch resolve connected nodes
- Individual node data is likely already cached from the screen detail view
- TanStack Query handles this automatically via cache hits

### Optimistic Updates

Not applicable for Phase 1-2 (read-only interface). Will be relevant when write operations are added in later phases.

---

## 8. Test ID Strategy

### Naming Convention

Pattern: `{area}-{element}-{qualifier}`

Suffixes:
- `-btn` for buttons and clickable controls
- `-input` for form inputs
- `-section` for content sections
- `-item` for list items
- `-badge` for badges and tags
- `-link` for navigation links
- `-panel` for overlay panels
- `-tree` for tree structures
- `-group` for grouping containers
- `-header` for section headers
- `-text` for text content areas

### Test ID Registry

```typescript
// specs/test-ids.ts (or web-console/src/test-ids.ts)

export const TestIds = {
  toolbar: {
    root: 'toolbar-root',
    logo: 'toolbar-logo-link',
    appSelector: 'toolbar-app-selector',
    searchInput: 'toolbar-search-input',
    graphLink: 'toolbar-graph-link',
    refreshBtn: 'toolbar-refresh-btn',
  },

  sidebar: {
    root: 'sidebar-root',
    screenTree: 'sidebar-screen-tree',
    searchInput: 'sidebar-search-input',
    group: (accessLevel: string) => `sidebar-group-${accessLevel}`,
    groupHeader: (accessLevel: string) => `sidebar-group-${accessLevel}-header`,
    screenItem: (screenId: string) => `sidebar-screen-${screenId}-item`,
    screenExpandBtn: (screenId: string) => `sidebar-screen-${screenId}-expand-btn`,
  },

  screenDetail: {
    root: 'screen-detail-root',
    header: 'screen-detail-header',
    screenName: 'screen-detail-name-text',
    routeBadge: 'screen-detail-route-badge',
    accessBadge: 'screen-detail-access-badge',
    impactBtn: 'screen-detail-impact-btn',

    componentsSection: 'screen-detail-components-section',
    componentItem: (componentId: string) => `screen-detail-component-${componentId}-item`,

    dataAccessedSection: 'screen-detail-data-accessed-section',
    dataEntityGroup: (entityId: string) => `screen-detail-entity-${entityId}-group`,
    dataFieldItem: (fieldId: string) => `screen-detail-field-${fieldId}-item`,

    actionsSection: 'screen-detail-actions-section',
    actionItem: (actionId: string) => `screen-detail-action-${actionId}-item`,

    rulesSection: 'screen-detail-rules-section',
    ruleItem: (ruleId: string) => `screen-detail-rule-${ruleId}-item`,

    statesSection: 'screen-detail-states-section',
    stateItem: (stateId: string) => `screen-detail-state-${stateId}-item`,

    sourceSection: 'screen-detail-source-section',
    featureSection: 'screen-detail-feature-section',

    loadingState: 'screen-detail-loading',
    errorState: 'screen-detail-error',
    emptyState: 'screen-detail-empty',
  },

  drillIn: {
    panel: 'drill-in-panel',
    breadcrumb: 'drill-in-breadcrumb',
    breadcrumbItem: (index: number) => `drill-in-breadcrumb-${index}-item`,
    closeBtn: 'drill-in-close-btn',
    backBtn: 'drill-in-back-btn',

    componentPanel: {
      root: 'drill-in-component-root',
      displaysSection: 'drill-in-component-displays-section',
      inputsSection: 'drill-in-component-inputs-section',
      triggersSection: 'drill-in-component-triggers-section',
      sourceSection: 'drill-in-component-source-section',
    },

    actionPanel: {
      root: 'drill-in-action-root',
      callsSection: 'drill-in-action-calls-section',
      constrainedBySection: 'drill-in-action-constrained-section',
    },

    endpointPanel: {
      root: 'drill-in-endpoint-root',
      readsSection: 'drill-in-endpoint-reads-section',
      writesSection: 'drill-in-endpoint-writes-section',
    },

    entityPanel: {
      root: 'drill-in-entity-root',
      fieldsSection: 'drill-in-entity-fields-section',
    },

    fieldPanel: {
      root: 'drill-in-field-root',
      displayedBySection: 'drill-in-field-displayed-by-section',
      validatedBySection: 'drill-in-field-validated-by-section',
    },

    rulePanel: {
      root: 'drill-in-rule-root',
      constrainsSection: 'drill-in-rule-constrains-section',
      validatesSection: 'drill-in-rule-validates-section',
    },
  },

  shared: {
    nodePill: (nodeId: string) => `node-pill-${nodeId}`,
    typeBadge: (nodeType: string) => `type-badge-${nodeType}`,
    expandableToggle: (sectionId: string) => `expandable-${sectionId}-toggle`,
    loadingSpinner: 'loading-spinner',
    errorRetryBtn: 'error-retry-btn',
  },
};
```

### E2E Test Scenarios to Cover

**Phase 1:**
1. App loads and shows sidebar with screen tree grouped by access level
2. Clicking a screen in sidebar navigates to its detail view
3. Screen detail shows components, actions, rules, states sections
4. Expanding a parent screen in sidebar reveals child screens
5. Search filters sidebar items in real-time
6. Direct URL navigation to `/screens/scr_schedule` works
7. Error state shows when API is unreachable
8. Empty state shows when no screens exist for the app
9. Refresh button reloads data

**Phase 2:**
10. Clicking a component in screen detail opens the drill-in panel
11. Component panel shows displays, inputs, triggers sections
12. Clicking an action in the component panel opens a nested action panel
13. Breadcrumb shows the full navigation chain
14. Clicking a breadcrumb item navigates back to that level
15. Escape key closes the top panel
16. Clicking outside the panel closes all panels
17. Data Accessed section groups fields by entity
18. Three-level drill-in works: component -> action -> endpoint

---

## 9. Parallelization Plan

### What Can Be Built in Parallel

**Stream A: Backend API endpoints (Step 2)**
No dependency on the React app. Can be built and tested with curl/httpie independently.

**Stream B: Project scaffold + shared components (Steps 1, 3, 4, 5)**
The Vite project setup, API client layer, and shared components have no dependency on the backend endpoints (they can be built against mock data or the existing `/api/graph` endpoint).

**Stream C: Independent of A and B**
The test ID registry (Step 8 prep) can be defined upfront.

### Sequential Dependencies

```
Step 1 (scaffold) ──┬── Step 3 (API client)
                    ├── Step 4 (shared components)
                    └── Step 5 (layout shell)

Step 2 (backend endpoints) ─── needed before ─── Step 6 (screen tree, needs /api/screens)

Step 3 + Step 4 + Step 5 ─── all needed before ─── Step 6 (screen tree sidebar)

Step 6 (screen tree) ─── needed before ─── Step 7 (screen detail)

Step 7 (screen detail) ─── needed before ─── Phase 2 steps

Phase 2:
Step 10 (data accessed) ── can parallel with ── Step 11 (slide-in panel container)
Step 11 (panel container) ─── needed before ─── Step 12 (component panel)
Step 12 ─── needed before ─── Step 13 (secondary panels)
Step 13 ─── needed before ─── Step 14 (wiring)
```

### Recommended Developer Assignment

If two developers are available:

**Developer 1 (Backend + Data):**
- Step 2 (backend endpoints)
- Step 10 (data accessed endpoint)
- Backend optimizations

**Developer 2 (Frontend):**
- Step 1 (scaffold)
- Steps 3-5 (API client, shared components, layout)
- Steps 6-9 (sidebar, screen detail, search, polish)
- Steps 11-15 (Phase 2 UI)

Developer 2 can use mock data until Developer 1's endpoints are ready.

---

## 10. Open Decisions

### 10a. Sidebar width

The UX spec wireframe suggests approximately 240px. The existing D3 detail panel is 320px. The sidebar content (screen names with indentation) should fit comfortably in 240px. Consider making it resizable (drag handle) as a future enhancement.

**Recommendation: 240px fixed for Phase 1.**

### 10b. App selector behavior

The toolbar has an `[App: example]` dropdown. Currently, the `--app` flag is passed to the server and filters all queries. Options:

1. **Server-side only**: The app filter stays as a server startup flag. The dropdown is read-only, showing the current app name. Simplest.
2. **Client-side switching**: The dropdown lists available apps (via a new `GET /api/apps` endpoint that returns `SELECT DISTINCT app FROM node`). Selecting an app updates all queries. More flexible but requires all queries to accept an `app` parameter.

**Recommendation: Option 1 for Phase 1. The app name is passed from the server as a config value in a `<meta>` tag or `/api/config` endpoint.**

### 10c. Legacy D3 graph integration

The `[Graph]` link in the toolbar should open the D3 visualization. Options:

1. **New tab to legacy page**: Keep `src/web/html.ts` served at `/graph`, link opens in new tab. Simplest.
2. **Embedded route**: Mount the D3 visualization as a React route at `/graph` using a `<div ref>` and D3 imperative code. More integrated but complex.
3. **Scoped graph**: The UX spec says the graph should be "pre-filtered to the current screen and its 2-hop neighborhood." This requires passing context (current screen ID) to the graph view.

**Recommendation: Option 1 for Phase 1, with the app query parameter forwarded. Option 3 as a Phase 5 enhancement.** Serve the legacy HTML at `GET /graph?app=myapp`. The toolbar link includes the current screen's ID as a query parameter for future use: `/graph?app=myapp&focus=scr_schedule`.

### 10d. Production build serving

How should the built React app be served in production?

1. **API server serves static files**: Modify `src/web/routes.ts` to serve `web-console/dist/` for non-API routes. Simple, single process.
2. **Separate static server**: Use nginx or a CDN for the React app, with API requests proxied. More scalable but overkill for a developer tool.

**Recommendation: Option 1.** Add a catch-all route to `routes.ts` that serves `index.html` for any non-`/api/` path, and serves static assets from `web-console/dist/assets/`.

### 10e. Monorepo tooling

Adding a second `package.json` (in `web-console/`) means two install steps and two build steps. Options:

1. **Manual**: Developer runs `npm install` in both root and `web-console/`. Root `package.json` gets convenience scripts: `"web:dev": "cd web-console && npm run dev"`, `"web:build": "cd web-console && npm run build"`.
2. **npm workspaces**: Convert to a workspace monorepo with `packages: [".", "web-console"]`. Shared TypeScript types can be linked.

**Recommendation: Option 1 for Phase 1, migrate to workspaces when/if a third package appears.** Keep it simple. The only shared code is type definitions, which can be duplicated (browser types vs Node types have different import constraints anyway).

### 10f. Edge direction semantics in the UI

The SurrealDB RELATE model uses `in` and `out` where `in` is the source node and `out` is the target. This is counterintuitive. The existing `routes.ts` and `edges.ts` follow this convention. The UI needs to map these correctly.

For a RENDERS edge from Screen to Component: `in = Screen, out = Component`. When displaying edges for a Screen node, outbound RENDERS edges show "renders ComponentX". When displaying edges for a Component node, inbound RENDERS edges show "rendered by ScreenX".

The `edge-labels.ts` map should include both directions:

```typescript
export const EDGE_LABELS: Record<string, { outbound: string; inbound: string }> = {
  RENDERS:        { outbound: 'renders',         inbound: 'rendered by' },
  CHILD_OF:       { outbound: 'child of',        inbound: 'parent of' },
  TRIGGERS:       { outbound: 'triggers',        inbound: 'triggered by' },
  CALLS:          { outbound: 'calls',           inbound: 'called by' },
  REQUIRES_STATE: { outbound: 'requires state',  inbound: 'required by' },
  READS:          { outbound: 'reads',           inbound: 'read by' },
  WRITES:         { outbound: 'writes',          inbound: 'written by' },
  HAS_FIELD:      { outbound: 'has field',       inbound: 'field of' },
  VALIDATES:      { outbound: 'validates',       inbound: 'validated by' },
  CONSTRAINS:     { outbound: 'constrains',      inbound: 'constrained by' },
  BELONGS_TO:     { outbound: 'belongs to',      inbound: 'includes' },
  DISPLAYS:       { outbound: 'displays',        inbound: 'displayed by' },
  ACCEPTS_INPUT:  { outbound: 'accepts input',   inbound: 'input for' },
  IMPLEMENTED_IN: { outbound: 'implemented in',  inbound: 'implements' },
  NAVIGATES_TO:   { outbound: 'navigates to',    inbound: 'navigated from' },
  DEPENDS_ON:     { outbound: 'depends on',      inbound: 'depended on by' },
  TRANSITIONS_TO: { outbound: 'transitions to',  inbound: 'transitioned from' },
  AUTHORIZES:     { outbound: 'authorizes',      inbound: 'authorized by' },
  REFERENCES:     { outbound: 'references',      inbound: 'referenced by' },
  HOSTED_ON:      { outbound: 'hosted on',       inbound: 'hosts' },
  STORED_IN:      { outbound: 'stored in',       inbound: 'stores' },
};
```

---

## Summary

| Phase | Steps | Estimated Hours | Key Deliverable |
|-------|-------|-----------------|-----------------|
| 1 | Steps 1-9 | 23-31 | Sidebar with screen tree + screen detail view |
| 2 | Steps 10-15 | 22-29 | Component drill-in panel + data accessed section |
| **Total** | **15 steps** | **45-60 hours** | **Fully navigable App Navigator** |

The critical path runs through: scaffold (1) -> API client + shared components (3,4,5) -> screen tree (6) -> screen detail (7) -> slide-in panel (11) -> component panel (12) -> secondary panels (13) -> wiring (14).

Backend endpoints (Step 2) should be built early and in parallel so they are ready when the frontend needs them.
