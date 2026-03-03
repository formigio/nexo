# Nexo Web Console — UX Design Concepts

## Overview

The current web console is a single D3 force-directed graph visualization with type filters, search, and a 320px detail sidebar. It is functional for exploring raw graph topology but does not support the three primary use cases the product demands: navigating through an application by screen, drilling into component-level data, and running impact queries without writing query syntax.

This document presents four UX concepts for a richer graph management interface. Each concept takes a different primary navigation model, from structured hierarchy to freeform traversal. All four share a common set of data capabilities backed by the existing API.

---

## Context: What the Data Supports

Before designing screens, it helps to enumerate what the existing graph and API can answer today, because the UI should expose these as first-class interactions, not power-user features.

**Screen-level questions (answerable now)**
- What components does this screen render? (RENDERS edges from Screen)
- What user states does this screen require? (REQUIRES_STATE edges from Screen)
- What screens are children of this screen? (CHILD_OF edges)
- Which feature does this screen belong to? (BELONGS_TO edges)
- What source file implements this screen? (IMPLEMENTED_IN edges)

**Component-level questions (answerable now)**
- What data fields does this component display? (DISPLAYS edges from Component)
- What data fields does this component accept as input? (ACCEPTS_INPUT edges)
- What user actions does this component trigger? (TRIGGERS edges)
- What API endpoints does each triggered action call? (CALLS edges from UserAction)
- What data entities does each endpoint read or write? (READS / WRITES edges from APIEndpoint)
- What business rules constrain or validate related fields? (VALIDATES, CONSTRAINS edges)

**Impact questions (answerable now)**
- If I change this data field, what components display it?
- If I change this API endpoint, what user actions call it?
- If I change this business rule, what actions does it constrain?

The existing `traverse` and `impactAnalysis` query functions in `src/db/queries.ts` power all of these. The web API already exposes `/api/nodes/:id/edges`. The design problem is purely how to present this power without requiring users to understand graph concepts.

---

## Concept 1 — App Navigator

**"Browse your app like you use it"**

### Primary Navigation Model

A persistent left sidebar lists screens in the same hierarchy a user would navigate the real app: grouped into Public, Authenticated, Admin, and then by logical section (Trip sub-screens grouped under their parent). Selecting a screen opens that screen's detail view in the main area. Everything else is secondary.

This model works best for the "navigate through the app by page" use case because it mirrors how both developers and PMs already think about the product.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Nexo  [App: MyApp ▾]                     [Search] [Graph ↗]  │  ← 52px toolbar
├──────────────────┬──────────────────────────────────────────────┤
│                  │                                              │
│  SCREENS         │   Schedule                          [Impact] │
│  ─────────────   │   Screen · /trips/:tripId/schedule          │
│  Public          │   Requires: Authenticated, Trip: Live        │
│    Welcome       │                                              │
│    Enter Email   │   ┌── Components (4) ──────────────────────┐ │
│    Verify Code   │   │                                        │ │
│    Join Trip     │   │  ActivityCard        [presentational]  │ │
│    Trip Preview  │   │  Displays: title, date, startTime      │ │
│                  │   │  Triggers: RSVP to Activity            │ │
│  Authenticated   │   │  Triggers: Navigate to Activity Detail │ │
│  ▶ My Trips      │   │                                ──────  │ │
│  ▼ Trip          │   │  BottomNav           [navigation]      │ │
│    ▼ Schedule ●  │   │  Triggers: Navigate Between Sections   │ │
│      Activity    │   │                                ──────  │ │
│      Add/Edit    │   │  [+ 2 more components]                 │ │
│    Today         │   └────────────────────────────────────────┘ │
│    People        │                                              │
│      Person      │   ┌── Data Accessed (via components) ──────┐ │
│    Stay          │   │                                        │ │
│      Room        │   │  Activity.title       string  DISPLAYS │ │
│    Transport     │   │  Activity.date        string  DISPLAYS │ │
│                  │   │  Activity.startTime   string  DISPLAYS │ │
│  Admin           │   │  Activity.isOptional  boolean DISPLAYS │ │
│    Feedback      │   │  RSVP.status          enum    READS    │ │
│                  │   │                                        │ │
│                  │   └────────────────────────────────────────┘ │
│                  │                                              │
│                  │   ┌── User Actions (2) ────────────────────┐ │
│                  │   │  RSVP to Activity    → PUT /rsvp       │ │
│                  │   │  Navigate to Detail  → Schedule child  │ │
│                  │   └────────────────────────────────────────┘ │
│                  │                                              │
│                  │   ┌── Business Rules (1) ──────────────────┐ │
│                  │   │  RSVP status cycle   [behavior·client] │ │
│                  │   │  Constrains: RSVP to Activity          │ │
│                  │   └────────────────────────────────────────┘ │
└──────────────────┴──────────────────────────────────────────────┘
```

### Key Screens / Views

**Screen Detail View (the main panel)**
- Purpose: Show everything relevant about a single screen in one view, organized by concern
- Sections stack vertically with collapse toggles: Components, Data Accessed, User Actions, Business Rules, Required User States, Source File, Feature membership
- "Data Accessed" is a derived view — it traverses Component DISPLAYS and ACCEPTS_INPUT edges, then follows those DataField nodes back to their DataEntity, giving a complete picture of what data this screen touches, even though Screens don't directly touch data
- Each item in every section is tappable and opens a slide-in detail panel on the right

**Component Drill-In Panel (slide-in from right)**
- Slides in over the main area when you click a component name
- Shows: component type badge, all DISPLAYS fields (with entity context), all ACCEPTS_INPUT fields, all TRIGGERS actions (each expandable to show the CALLS chain down to API and data), source file link
- Back button returns to the screen detail
- This panel can keep nesting — clicking an API endpoint from within a component drill-in shows that endpoint's detail

**Impact Sidebar (triggered from [Impact] button)**
- Replaces the right column with an impact analysis view for the selected screen
- Shows direct connections, then 2-hop structural impacts, with badge colors: Breaking / Needs Update / Informational
- "What changes if I modify this screen?" framing

**Graph View (linked from [Graph ↗] in toolbar)**
- Opens the existing D3 visualization in a new tab, pre-filtered to the current screen and its 2-hop neighborhood
- The graph view becomes a supplementary lens, not the default

### How Drill-Down Works

Every item in every section is an entry point. Clicking ActivityCard from the Schedule screen opens the component panel. Within that panel, clicking "RSVP to Activity" opens the action panel showing the API call. Clicking "PUT /trips/{tripId}/activities/{activityId}/rsvp" opens the endpoint panel showing READS/WRITES to the RSVP data entity. Clicking the RSVP entity shows its fields. The navigation history is a breadcrumb trail at the top of the slide-in panel.

### How It Leverages the Graph

The sidebar screen tree is built by querying all Screen nodes, then using CHILD_OF edges to build the hierarchy. The main panel for a screen executes four parallel queries on load: `RENDERS` edges for components, `REQUIRES_STATE` for user states, `BELONGS_TO` for feature, `IMPLEMENTED_IN` for source file. The "Data Accessed" section requires a 2-hop traversal: Screen → (RENDERS) → Component → (DISPLAYS) → DataField → (part of) → DataEntity.

### Trade-offs

This model is excellent for developers and PMs who think in screens. It is less useful for infrastructure engineers who think in API endpoints or data entities first. Adding a parallel sidebar mode ("API View" or "Data View") in a later iteration would address this.

---

## Concept 2 — Entity Inspector

**"Start with data, follow the connections"**

### Primary Navigation Model

A three-column layout where the leftmost column is a browsable, filterable list of all nodes grouped by type. The middle column shows the selected node's detail. The right column shows the currently traversed relationship chain. No graph visualization by default — everything is text and structure.

This model is inspired by tools like Sequel Pro's table browser or Xcode's file inspector. It works well for power users who want to explore the graph systematically.

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Nexo  [MyApp ▾]   [All Types ▾]   [Search nodes...]   [Graph] │
├───────────────┬──────────────────────────┬───────────────────────┤
│               │                          │                       │
│  NODE LIST    │  RSVP                    │  TRAVERSAL            │
│  ──────────   │  DataEntity              │  ─────────            │
│  Screens (19) │  ─────────────────────   │  ← RSVP              │
│  > Schedule   │                          │     ↑ HAS_FIELD (3)   │
│  > Today      │  Storage: dynamodb       │     · status (enum)   │
│  > People     │  Key: TRIP#..RSVP#..     │     · note (string)   │
│  > Stay       │                          │     · updatedAt       │
│  > Transport  │  ── Fields (3)           │                       │
│  ...          │                          │     ↑ WRITES (1)      │
│               │  status   enum  required │     · PUT /rsvp       │
│  Components   │  note     str   optional │       ↑ CALLS (1)     │
│  > ActivityCard│ updatedAt date          │       · RSVP to Act.  │
│  > RSVPButton │                          │         ↑ TRIGGERS (1)│
│  > BottomNav  │  ── Written by (1)       │         · RSVPButton  │
│  ...          │                          │                       │
│               │  PUT /trips/{id}/        │     ↑ READS (1)       │
│  APIEndpoints │    activities/{id}/rsvp  │     · GET /trips/{id} │
│  > GET /trips │                          │                       │
│  > POST /trips│  ── Read by (2)          │  [Expand deeper]      │
│  > PUT /rsvp  │                          │                       │
│  ...          │  GET /trips/{tripId}     │                       │
│               │  GET /trips/{id}/        │                       │
│  DataEntities │    activities/{id}/rsvps │                       │
│  > Trip       │                          │                       │
│  > Activity   │  ── Validated by (1)     │                       │
│  > RSVP  ●   │                          │                       │
│  > User       │  RSVP status cycle       │                       │
│  ...          │  [behavior · client]     │                       │
│               │  Constrains: RSVP Action │                       │
│  BusinessRules│                          │                       │
│  > RSVP cycle │  ── Feature              │                       │
│  ...          │  F3.2 · RSVP System      │                       │
│               │  [deployed · P0]         │                       │
└───────────────┴──────────────────────────┴───────────────────────┘
```

### Key Screens / Views

**Node List (left column)**
- Grouped by node type with counts
- Each group is collapsible
- Clicking a type header shows only that type; clicking again expands the group
- Search filters all groups simultaneously, showing only matching nodes with their type header preserved
- Small colored dot per node type using the established color system from the current visualization

**Node Detail (middle column)**
- Adapts to node type — a Screen shows its route, access level, rendered components; a DataEntity shows storage type, key pattern, fields; an APIEndpoint shows method, path, auth requirements, request/response schema
- All related nodes shown as tappable links grouped by edge type
- Edge type labels use readable language: "Written by" instead of "WRITES (in)", "Read by" instead of "READS (in)"
- Expandable sections to avoid overwhelming the view when a node has 20+ connections

**Traversal Chain (right column)**
- Builds up as you click through connections in the middle column
- Each step shows the edge type and the connected node
- Clicking any node in the chain navigates back to that node in the middle column and clears the chain forward from that point
- "Expand deeper" button at the bottom executes a BFS traversal from the current node and adds the next hop level to the chain
- The chain is copyable as a path string: `RSVP → HAS_FIELD → status → VALIDATES → RSVP status cycle`

**Search Results Mode**
- When text is entered in the global search, the middle column shifts to show a ranked results list across all node types
- Results show node name, type badge, and a snippet of description
- Selecting a result enters the normal 3-column view at that node

### How Drill-Down Works

Select RSVP (DataEntity) in the left column. The middle column shows its fields, the APIs that write to it, the APIs that read from it, and the business rules that validate its fields. Click "PUT /trips/{id}/activities/{id}/rsvp" — that becomes the middle column and a WRITES edge appears in the traversal chain. From the endpoint, click "RSVP to Activity" (the user action that calls it) — now you can see what component triggers that action, and click RSVPButton to see what screen renders it. You have just traversed: DataEntity → APIEndpoint → UserAction → Component → Screen in four clicks.

### How It Leverages the Graph

This concept exposes the graph's bidirectionality explicitly. Every node detail view shows both outbound and inbound edges, labeled with natural language (not raw edge type names). The traversal chain is essentially a visual BFS path that the user controls step by step.

### Trade-offs

This concept has a steeper learning curve because it requires users to understand node types before they can navigate. It is the most powerful for exploration. The three-column layout requires 1200px minimum to be comfortable; it should collapse to a single-column drill-down on narrower viewports.

---

## Concept 3 — Feature Lens

**"See the app through features, not screens"**

### Primary Navigation Model

Features are the top-level entry point. The home view shows the full feature list with status and priority. Selecting a feature shows its complete scope: every node that belongs to it, grouped by type and visualized as a mini-graph. This concept is designed for product managers and for the changeset workflow described in the product vision.

### Layout — Feature List (Home)

```
┌──────────────────────────────────────────────────────────────────┐
│  Nexo  [MyApp ▾]                         [+ New Feature]       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Features                                                        │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  [Deployed ●] [In Progress ◐] [Proposed ○] [Deprecated ×]  All │
│                                                                  │
│  P0 ──────────────────────────────────────────────────────────   │
│                                                                  │
│  ██████████ F1 · Authentication (Email OTP)         DEPLOYED     │
│             5 screens · 3 components · 8 API endpoints           │
│             4 business rules · 2 data entities                   │
│                                                                  │
│  ██████████ F3 · Schedule & Activities              DEPLOYED     │
│             3 screens · 6 components · 12 API endpoints          │
│             8 business rules · 3 data entities                   │
│                                                                  │
│  P1 ──────────────────────────────────────────────────────────   │
│                                                                  │
│  ▓▓▓▓▓▓░░░░ P1-10 · Transportation                 DEPLOYED     │
│             2 screens · 4 components · 9 API endpoints           │
│                                                                  │
│  ░░░░░░░░░░ P2-12 · Demote Organizer               IN PROGRESS   │
│             1 screen · 1 API endpoint · 2 business rules         │
│                                                                  │
│  P2 ──────────────────────────────────────────────────────────   │
│                                                                  │
│  ○○○○○○○○○○ P2-17 · Calendar Integration           PROPOSED      │
│             0 nodes yet · [Define Scope]                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Layout — Feature Detail

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Features   F3.2 · RSVP System                    DEPLOYED P0 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────── Scope Overview ───────────────────────────────────┐   │
│  │                                                           │   │
│  │     [Screens: 3]──►[Components: 4]──►[Actions: 2]         │   │
│  │                                           │               │   │
│  │                                    [API Endpoints: 1]     │   │
│  │                                           │               │   │
│  │                                 [Data: RSVP entity]       │   │
│  │                                           │               │   │
│  │                            [Business Rules: 2]            │   │
│  │                                                           │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Screens (3)                                                     │
│  ──────────                                                      │
│  Schedule · /trips/:tripId/schedule         [Open Screen →]      │
│  Today · /trips/:tripId/today               [Open Screen →]      │
│  Activity Detail · /trips/:tripId/activities/:activityId [→]     │
│                                                                  │
│  Components (4)                                                  │
│  ─────────────                                                   │
│  RSVPButton · interactive                   [Open Component →]   │
│  ActivityCard · presentational              [Open Component →]   │
│                                                                  │
│  User Actions (2)                                                │
│  ────────────────                                                │
│  RSVP to Activity · mutate · tap                                 │
│    └─ CALLS → PUT /trips/{id}/activities/{id}/rsvp               │
│  Navigate to Activity Detail · navigate · tap                    │
│                                                                  │
│  Data Entities (1)                                               │
│  ─────────────────                                               │
│  RSVP · dynamodb                            [Open Entity →]      │
│    Fields: status (enum · required), note (string), updatedAt    │
│                                                                  │
│  Business Rules (2)                                              │
│  ──────────────────                                              │
│  RSVP status cycle · behavior · client · important               │
│    Constrains: RSVP to Activity                                  │
│  Offline RSVP queue · behavior · client · important              │
│    Affects: RSVP to Activity                                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Key Screens / Views

**Feature List (home)**
- Grouped by priority (P0, P1, P2, P3)
- Status filter tabs at top
- Each feature card shows: name, status badge, node count summary ("5 screens · 3 components")
- Progress bar-style visual for partial deployments
- Proposed features with zero nodes show a "Define Scope" call to action

**Feature Detail**
- Scope overview as a simplified flow diagram showing the node type groups and their connections (not a physics simulation — a structured left-to-right Screens → Components → Actions → APIs → Data → Rules layout)
- Each section is expandable with all belonging nodes listed
- Each node row has an "Open" link that opens the Entity Inspector (Concept 2) at that node in a slide-in panel

**Impact Preview Panel**
- Accessible from any node within the feature detail via a "What depends on this?" button
- Shows which other features share nodes with this feature, and which nodes are shared
- This answers "if we change this feature, what other features might be affected?"

**Proposed Feature Builder (future)**
- The "Define Scope" entry point for proposed features opens a step-by-step builder
- Step 1: Describe the feature in natural language
- Step 2: Select existing nodes that are in scope (multi-select from browsable lists)
- Step 3: Add new nodes (the system suggests types based on what's missing from a typical feature)
- Step 4: Review auto-detected impacts from the existing graph
- Step 5: Publish as a proposed changeset

### How Drill-Down Works

Select "RSVP System" from the feature list. The feature detail shows all belonging nodes grouped by type. Click "RSVPButton" component — a slide-in panel opens showing that component's full detail using the same view as Concept 2. From there, click a data field it displays to drill into the field's validation rules. The slide-in panel stacks (can go 3 deep) with a breadcrumb at the top.

### How It Leverages the Graph

The feature scope view is built by querying all nodes with BELONGS_TO edges pointing to the selected feature. The scope overview diagram uses RENDERS, TRIGGERS, CALLS, READS, and WRITES edges to show the data flow within the feature. The impact preview uses BFS from all nodes in the feature to find nodes outside the feature that connect to them.

### Trade-offs

This concept is the best fit for product managers and for the changeset workflow. It is not well suited for developers doing infrastructure exploration or impact analysis on low-level nodes. The feature list becomes unwieldy if an app has hundreds of features — search and filtering become critical.

---

## Concept 4 — Query Studio

**"Ask questions, get answers, without learning a query language"**

### Primary Navigation Model

A split view with a question builder on the left and structured results on the right. The left panel offers a set of pre-built query templates, parameterized by node selection. No raw query syntax. Users pick a template, fill in the subject node, and get a formatted result. The D3 graph is one possible output format among several.

This concept is designed to make the impact analysis and traversal capabilities of `src/db/queries.ts` accessible to non-technical users.

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Nexo  [MyApp ▾]   Query Studio                                │
├──────────────────┬───────────────────────────────────────────────┤
│                  │                                               │
│  QUERY TEMPLATES │  Impact: RSVP.status                         │
│  ─────────────   │  ─────────────────────────────────────────── │
│                  │                                               │
│  What does this  │  [Table] [Cards] [Graph] [Export JSON]        │
│  screen render?  │                                               │
│  ─────────────   │  Direct Impacts (1-hop)                      │
│  Screen: [────]  │  ──────────────────────                      │
│                  │  APIEndpoint  PUT /trips/{id}/../rsvp         │
│  What data does  │    ↑ Endpoint accepts RSVP.status as input   │
│  this component  │                                               │
│  access?         │  BusinessRule  RSVP status cycle              │
│  ─────────────   │    ↑ Validates RSVP.status field             │
│  Component: [──] │                                               │
│                  │  Structural Impacts (2-3 hops)               │
│  What changes if │  ─────────────────────────────               │
│  I modify this   │  UserAction  RSVP to Activity                 │
│  node?           │    ← calls the impacted endpoint             │
│  ─────────────   │                                               │
│  Node: [──────]  │  Component  RSVPButton                       │
│  [Run Impact ▶]  │    ← triggers the impacted user action       │
│                  │                                               │
│  What is the     │  Screen  Schedule                            │
│  scope of this   │    ← renders the impacted component          │
│  feature?        │                                               │
│  ─────────────   │  Screen  Today                               │
│  Feature: [────] │    ← renders the impacted component          │
│                  │                                               │
│  Who calls this  │  Screen  Activity Detail                     │
│  API endpoint?   │    ← renders the impacted component          │
│  ─────────────   │                                               │
│  Endpoint: [───] │                                               │
│                  │                                               │
│  Show me all     │  Informational (semantic matches)            │
│  [Screen ▾]      │  ──────────────────────────────              │
│  nodes           │  Feature  P1-15 (Placeholders)               │
│                  │    Has RSVP-like behavior — may need same     │
│                  │    change applied                             │
│                  │                                               │
└──────────────────┴───────────────────────────────────────────────┘
```

### Query Templates (complete list)

Each template is a named question with one or two node-selector inputs. All produce structured results with a graph view option.

| Template | Input | What it queries |
|----------|-------|-----------------|
| What does this screen render? | Screen | RENDERS edges → Components, REQUIRES_STATE → UserStates |
| What data does this component access? | Component | DISPLAYS + ACCEPTS_INPUT → DataFields → DataEntities |
| What changes if I modify this? | Any node | Impact analysis (BFS, 3 hops, classified by severity) |
| What is the full scope of this feature? | Feature | BELONGS_TO (inbound) → all member nodes |
| Who calls this API endpoint? | APIEndpoint | CALLS (inbound) → UserActions → Components → Screens |
| What does this API endpoint read and write? | APIEndpoint | READS + WRITES → DataEntities → DataFields |
| What business rules apply to this node? | Any node | VALIDATES + CONSTRAINS (inbound) → BusinessRules |
| What is the auth chain for this screen? | Screen | REQUIRES_STATE → UserStates → TRANSITIONS_TO chain |
| Where is this node implemented? | Any node | IMPLEMENTED_IN → SourceFile |
| What features use this component? | Component | BELONGS_TO → Feature, then grouped by feature |
| Show me all nodes of a type | Node type selector | List of all nodes of that type with props |
| What depends on this data field? | DataField | DISPLAYS (inbound) → Components → Screens, VALIDATES (inbound) → BusinessRules |

### Result Display Modes

**Table view**: Each result node as a row. Columns: Name, Type, Connection (how it relates to the source), Path (the edge chain that led here). Sortable and filterable.

**Cards view**: Each result as a card showing name, type badge, description, and the edge chain label. Better for reading descriptions.

**Graph view**: The D3 force graph, but scoped to the query result nodes and edges. Because the node set is small and relevant, the graph is legible — unlike the full app graph which is overwhelming. Clicking a node in the graph view auto-runs a new query ("What changes if I modify this?") with that node selected.

**Export**: JSON or CSV of the result for use in other tools.

### Key Screens / Views

**Query Studio (home)**
- Left panel: scrollable list of template cards. Clicking a template expands it in place to show its inputs.
- Node selector inputs use typeahead search — start typing a node name and matching nodes appear with type badges
- "Run" button or Enter key executes the query
- Right panel: query results with the view mode selector at top

**Saved Queries**
- Frequently run queries can be bookmarked with a name
- Saved queries appear at the top of the template list
- A saved "What does the Schedule screen render?" is faster than navigating to the screen in Concept 1

**Query History**
- Last 20 queries accessible from a dropdown
- Each history item shows the template name, input node, and result count

**Result Node Pivot**
- Any node in a result set has a context menu with "Run query with this node" options
- This lets users chain queries: run "What does Schedule render?" → get ActivityCard → right-click → "What data does this component access?" → new result
- The query history shows the chain

### How Drill-Down Works

Drill-down in Query Studio works through query chaining. The result of one query becomes the input of the next. Each step is recorded in the query history, making it possible to backtrack. The graph view of results makes it easy to spot unexpected connections, which can then be explored by clicking the node and running a new query.

### How It Leverages the Graph

Query Studio is a UI wrapper over the `traverse` and `impactAnalysis` functions already in `src/db/queries.ts`. Each template maps to a specific traversal pattern. The impact template maps directly to `impactAnalysis`. The "What does this screen render?" template is a 1-hop traversal with edge type filter `["RENDERS"]`. This concept requires the least new backend work.

### Trade-offs

This concept is the most accessible for non-technical users because it uses natural language question framing. The limitation is that it only answers questions that have been pre-templated. Edge cases or unusual traversals are not possible without adding new templates. The template list will need to grow with usage, which requires ongoing curation.

---

## Recommendation: Layered Approach

No single concept serves all users well. The recommendation is to build Concept 1 (App Navigator) as the primary interface, Concept 4 (Query Studio) as an always-accessible mode switch, and position Concept 2 (Entity Inspector) as the slide-in panel that opens when you drill into any specific node from either of those views.

Concept 3 (Feature Lens) is the right home view for product managers and should be the default when the user is identified as a PM role, or as a tab alongside the screen navigator.

### Implementation Priority

| Phase | What to Build | Why |
|-------|---------------|-----|
| 1 | App Navigator sidebar + Screen Detail view | Immediately addresses "navigate by page" use case |
| 2 | Component Drill-In panel with Data Accessed section | Addresses "drill down into component data" use case |
| 3 | Query Studio with 5 core templates | Addresses "query the graph in useful ways" without syntax |
| 4 | Feature Lens home view | Addresses PM / changeset use cases |
| 5 | Graph view as supplementary lens, scoped to context | Existing D3 code, now exposed at the right moment |

---

## Shared Visual Design Principles

All concepts should share the following design foundation to ensure consistency as individual views are built out.

### Color System

Inherit the existing node type colors from `html.ts` — they are already established and visually distinct. Add semantic meaning:

```
Node type colors (existing):
  Screen:        #58a6ff  (blue)
  APIEndpoint:   #3fb950  (green)
  BusinessRule:  #f85149  (red)
  Component:     #d2a8ff  (purple)
  Feature:       #ffa657  (orange)
  DataEntity:    #79c0ff  (light blue)
  DataField:     #a8d8f0  (pale blue)
  UserAction:    #ffd700  (yellow)
  UserState:     #ff7b72  (salmon)
  InfraResource: #8b949e  (gray)
  SourceFile:    #56d364  (light green)

Status colors (new):
  Deployed:      #3fb950  (same as APIEndpoint green — intentional)
  In-progress:   #ffa657  (amber)
  Proposed:      #8b949e  (gray)
  Deprecated:    #6e7681  (dark gray)

Impact severity (new):
  Breaking:      #f85149  (red)
  Needs Update:  #ffa657  (amber)
  Informational: #8b949e  (gray)
```

### Typography

- **Font**: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif (matches current)
- **Screen/view titles**: 16px, weight 600, #e1e4e8
- **Section headers**: 11px, weight 600, #8b949e, uppercase, 0.5px letter-spacing
- **Node names**: 13px, weight 500, #e1e4e8
- **Edge type labels**: 10px, weight 500, node type color at 70% opacity
- **Descriptions**: 12px, weight 400, #8b949e, line-height 1.6
- **Props/metadata**: 11px monospace for values, 11px weight 500 for keys

### Spacing System

Base unit: 4px. Use multiples: 4, 8, 12, 16, 24, 32, 48. Never use odd spacings or fractional values. Consistent use ensures visual rhythm without a dedicated spacing library.

### Interactive States

All tappable nodes and links follow the same pattern:
- Default: color at full opacity
- Hover: background fill at 12% opacity of node color, text at full brightness
- Active/selected: background fill at 18% opacity, border at 1px, node color
- Focused (keyboard): same as active with 2px offset outline in #58a6ff

### Component Interaction Patterns

**Node Pills** — inline references to nodes within text, showing type color dot + name, tappable
```
  ● ActivityCard    (purple dot, tappable)
  ● RSVP.status     (pale blue dot, tappable)
```

**Edge Labels** — rendered as readable text, not raw edge type names
```
  Raw: RENDERS       → Human: "renders"
  Raw: CALLS         → Human: "calls"
  Raw: VALIDATES     → Human: "validates"
  Raw: BELONGS_TO    → Human: "belongs to feature"
  Raw: HAS_FIELD     → Human: "has field"
  Raw: IMPLEMENTED_IN→ Human: "implemented in"
```

**Type Badges** — small pill with node type color background at 15% and matching text color
```
  [Screen]  [Component]  [APIEndpoint]  [DataEntity]
```

**Expandable Sections** — sections that can contain many items (10+) start collapsed at 5 items with a "Show N more" control. No horizontal scrolling. Long lists always stack vertically.

### Background / Surface Colors

```
  Background:     #0f1117  (body)
  Surface 1:      #161b22  (sidebar, panels)
  Surface 2:      #21262d  (cards, inputs)
  Border:         #30363d
  Border subtle:  #21262d
```

### Accessibility Requirements

- All interactive elements minimum 36px height, with 44px preferred for primary actions
- Node type is never communicated by color alone — always paired with a text label or icon
- Keyboard navigation required for the sidebar tree and the slide-in panel stack
- Screen reader labels for all icon-only buttons
- Focus trap within slide-in panels when open
- WCAG AA contrast for all text on all backgrounds

---

## Open Questions

1. **Authentication**: Is the web console public or behind authentication? If multiple users with different roles (PM vs developer) will use it, personalization (saved queries, default view mode) becomes more important.

2. **Multi-app support**: The toolbar already has an app selector. Should the default view be an app selection home screen, or does the current behavior (default to `--app` flag) remain?

3. **Write access**: Concepts 3 and 4 gesture toward creating and editing nodes (feature builder, proposed changesets). Is write access in scope for this console, or is write access CLI-only?

4. **Real-time updates**: If two people have the console open and someone runs `nexo ingest --apply` from the CLI, should the web console reflect that live? The current implementation has a manual refresh button — is that sufficient?

5. **Graph view role**: The existing D3 visualization took significant effort to build. Is the intent to keep it as a primary view (just enhanced), or to demote it to a supplementary lens that opens in specific contexts? Concept 1 treats it as supplementary; Concept 4 integrates it as a result display format.

6. **Mobile**: Is mobile access a requirement? The existing console is desktop-only (overflow: hidden on body). If PMs need to reference the graph on mobile, Concept 3 (Feature Lens) is the most adaptable to small screens.
