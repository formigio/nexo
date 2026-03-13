# N8 Graph Management — UX Design Specification

> **Status:** Approved
> **Feature ID:** N8
> **Priority:** P0
> **Date:** 2026-03-10

## Overview

In-browser CRUD for nodes and edges — create, edit, and delete graph elements from the Nexo web console. The design follows **contextual, non-disruptive, progressive disclosure** — management actions appear where users are already working, forms adapt to the node type selected, and destructive actions require explicit confirmation.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Permissions | All authenticated users | No role-gating; anyone logged in can manage |
| Deletion | 30-second soft-delete with undo | Reduces risk of accidental data loss |
| Type mutability | Immutable after creation | Avoids data loss from type-specific props changes |

---

## Design Principles

1. **Context is king.** Actions appear where users are looking at related data.
2. **Forms adapt to type.** Selecting a node type reveals only relevant fields.
3. **Destructive actions earn their friction.** Deletion requires reading impact before confirming.
4. **Inline where possible, modal only when necessary.** Quick edits in the panel; structural edits in a full form.
5. **The graph stays live.** Write operations update affected views without full page reload.

---

## Global Entry Points

```
Toolbar (top)
├── [+ New Node] button — rightmost before user menu
│   Opens: Create Node Dialog

Slide-In Panel (right, node drill-in)
├── Header action row (below node title)
│   ├── [Edit] — panel enters edit mode
│   ├── [Add Edge] — opens Create Edge Dialog (source pre-filled)
│   └── [Delete] — opens Delete Confirmation Modal
└── Edges section
    └── Each edge row: [...] menu → [Delete Edge]

Graph Visualization (/graph)
└── Right-click context menu on node
    ├── [Edit Node]
    ├── [Add Edge from here]
    └── [Delete Node]

Node List (sidebar navigator)
└── Hover state: [...] menu on each row
    ├── [Edit]
    └── [Delete]

Screen Detail (/screens/:screenId)
└── Action row in header
    ├── [Edit]
    ├── [Add Edge]
    └── [Delete]
```

---

## 1. Node Creation Flow

### Interaction Flow

```
USER CLICKS [+ New Node]
│
▼
Create Node Dialog opens (center modal, 560px wide)
│
├── [App] — auto-filled from current app context, editable dropdown
│
├── [Node Type] — visual grid of 11 types with colored dots
│   │
│   └── USER SELECTS TYPE
│       ├── Name field appears (required)
│       ├── Description field appears (optional)
│       ├── Tags field appears (optional)
│       └── TYPE-SPECIFIC FIELDS appear (progressive reveal)
│
├── USER FILLS REQUIRED FIELDS
│   └── Inline validation on blur
│
├── USER CLICKS [Create Node]
│   ├── Loading: "Creating..." + spinner, inputs disabled
│   ├── SUCCESS → dialog closes, toast "Node created" with [View] link
│   └── ERROR → dialog stays open, error banner at top of form
│
└── USER CLICKS [Cancel] or Escape
    └── "Discard changes?" if form has data
```

### Create Node Dialog Wireframe

```
┌──────────────────────────────────────────────────────────┐
│  Create Node                                        [✕]  │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  App context    [vahmos              ▼]                   │
│                                                           │
│  Node Type                                                │
│  ┌───────────┬───────────┬───────────┬───────────┐       │
│  │ ● Screen  │ ● Comp    │ ● Action  │ ● API     │       │
│  ├───────────┼───────────┼───────────┼───────────┤       │
│  │ ● Data    │ ● Field   │ ● Rule    │ ● Feature │       │
│  ├───────────┴───────────┼───────────┼───────────┤       │
│  │ ● Infra               │ ● Source  │ ● State   │       │
│  └───────────────────────┴───────────┴───────────┘       │
│  Selected type gets highlighted border in type color      │
│                                                           │
│  ── Fields appear after type selection ─────────────────  │
│                                                           │
│  Name *                                                   │
│  [                                           ]            │
│                                                           │
│  Description                                              │
│  [                                           ]            │
│  [                                           ]            │
│                                                           │
│  Tags                                                     │
│  [auth ×] [mobile ×] [add tag...]                         │
│                                                           │
│  ── Type-specific fields ──────────────────────────────── │
│  (example: Screen)                                        │
│                                                           │
│  Route *             Platform        Access Level         │
│  [/path/to/screen]   [web    ▼]      [public   ▼]        │
│                                                           │
│  Parent Screen (optional)                                 │
│  [Search for a screen...           ]                      │
│                                                           │
├──────────────────────────────────────────────────────────┤
│                        [Cancel]  [Create Node  ▶]         │
└──────────────────────────────────────────────────────────┘
```

**Specifications:**
- Width: 560px fixed, max-height 80vh with internal scroll
- Backdrop: `rgba(0,0,0,0.6)` blurred
- Closes on Escape; does NOT close on backdrop click (prevents data loss)
- Focus trap within dialog
- Type is immutable after creation — no type change in edit flows

### Type-Specific Field Sets

| Type | Fields |
|------|--------|
| Screen | Route *, Platform (select), Access Level (select), Parent Screen (node picker) |
| Component | Component Type * (select), Platform, Variants (tag input), Source File |
| UserAction | _(no type-specific required fields)_ |
| APIEndpoint | Method * (select), Path *, Auth Required (toggle), Required Role (conditional) |
| DataEntity | _(no type-specific required fields)_ |
| DataField | _(no type-specific required fields)_ |
| BusinessRule | _(no type-specific required fields)_ |
| Feature | _(no type-specific required fields)_ |
| InfraResource | Resource Type, Provider (select) |
| SourceFile | File Path, Language (select) |
| UserState | _(no type-specific required fields)_ |

---

## 2. Node Editing Flow

### Two-Mode Approach

- **Quick edit** in Slide-In Panel — name, description, tags. For fast corrections.
- **Advanced edit** at `/nodes/:nodeId/edit` — type-specific props, full context. For structural edits.

### Panel Edit Mode

```
VIEW MODE                           EDIT MODE
┌──────────────────────────┐        ┌──────────────────────────┐
│ ● Screen  Login Screen   │        │ ● Screen                 │
│ [Edit] [Add Edge] [Del]  │   →    │ [Login Screen         ]  │
│ /login · web · public    │        │ [Save] [Cancel] [Adv →]  │
│ Description              │        │ /login · web · public    │
│ Main auth screen...      │        │ Description              │
│ Tags                     │        │ [Main auth screen...  ]  │
│ [auth] [mobile]          │        │ Tags                     │
│ Edges (4)                │        │ [auth ×] [mobile ×] [+]  │
│ → RENDERS LoginForm      │        │ Edges (read-only)        │
└──────────────────────────┘        └──────────────────────────┘
```

**Rules:**
- Type-specific props are read-only in panel (use Advanced Edit for those)
- Dirty state: unsaved changes indicator appears
- Cancel with dirty state: "Discard unsaved changes?" inline warning

### Full-Screen Edit Page (`/nodes/:nodeId/edit`)

```
┌─────────────────────────────────────────────────────────────────┐
│ TOOLBAR                                                          │
├─────────────────────────────────────────────────────────────────┤
│ [← Back]  Screen: Login Screen  ›  Edit               [● Unsaved] │
├─────────────────────────────┬───────────────────────────────────┤
│ EDIT FORM (60%)             │ CONTEXT PANEL (40%)               │
│                             │                                    │
│ Name *                      │ Edges (read-only)                 │
│ [Login Screen          ]    │ → RENDERS LoginForm               │
│                             │ → RENDERS ErrorBanner             │
│ Description                 │ → CALLS POST /api/login           │
│ [Main auth screen...  ]    │                                    │
│ [                     ]    │ Node ID                            │
│                             │ scr_login_screen (read-only)      │
│ Tags                        │                                    │
│ [auth ×] [mobile ×] [+]    │ App                               │
│                             │ vahmos (read-only)                │
│ ── Type-specific ────────   │                                    │
│ Route *                     │ Created                           │
│ [/login               ]    │ 3 days ago                        │
│                             │                                    │
│ Platform    Access Level    │                                    │
│ [web  ▼]    [public  ▼]    │                                    │
├─────────────────────────────┴───────────────────────────────────┤
│ [Delete Node]                        [Cancel]  [Save Changes]    │
└─────────────────────────────────────────────────────────────────┘
```

- Left column: 60% width (≥1024px), full width on mobile
- Right context panel: 40%, sticky, hidden on mobile
- [Delete Node] left-aligned in footer — physically separated from Save
- Browser `beforeunload` fires if navigating away with unsaved changes

---

## 3. Node Deletion Flow (Soft Delete with Undo)

### Interaction Flow

```
USER CLICKS [Delete]
│
▼
API: GET /api/nodes/:id/edges (fetch affected edges)
│
▼
Delete Confirmation Modal opens
│
├── Impact summary: "Deleting Login Screen will remove this node
│   and cascade-delete 3 edges."
│
├── Edge list (scrollable if >5):
│   ├── RENDERS → LoginForm
│   ├── RENDERS → ErrorBanner
│   └── CALLS → POST /api/login
│
├── If ≥5 edges: confirmation input required
│   "Type the node name to confirm: [____________]"
│   Delete button disabled until input matches
│
├── USER CLICKS [Delete Permanently]
│   ├── SUCCESS:
│   │   ├── Modal closes
│   │   ├── Toast: "Login Screen deleted" with [Undo] button (30 seconds)
│   │   ├── Node hidden from all views immediately
│   │   └── If [Undo] clicked within 30s → node restored, toast "Restored"
│   └── ERROR: error message in modal
│
└── [Cancel] or Escape → modal closes
```

### Delete Confirmation Modal Wireframe

```
┌──────────────────────────────────────────────────────┐
│  Delete Node                                    [✕]  │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ⚠  This action can be undone within 30 seconds.     │
│                                                       │
│  Deleting "Login Screen" will remove this node and   │
│  cascade-delete the following edges:                  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │ → RENDERS       LoginForm Component            │  │
│  │ → RENDERS       ErrorBanner Component          │  │
│  │ → CALLS         POST /api/login                │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  3 edges will be deleted.                             │
│                                                       │
│                       [Cancel]  [Delete Permanently]  │
└──────────────────────────────────────────────────────┘
```

**For ≥5 edges, add name confirmation input:**
```
│  Type "Login Screen" to confirm:                      │
│  [                                              ]     │
│               [Cancel]  [Delete Permanently]          │
│                          ↑ disabled until match       │
```

**Visual design:**
- [Delete Permanently]: `#f85149` (danger red) background
- Warning icon: `#d29922` (yellow)
- Edge list: max-height 200px with scroll
- After deletion: toast with [Undo] stays for 30 seconds

### Soft Delete Backend Requirements

The API needs a soft-delete mechanism:
1. `DELETE /api/nodes/:id` marks the node as `_deleted: true` (or moves to a `deleted_nodes` table)
2. All query endpoints filter out soft-deleted nodes
3. `POST /api/nodes/:id/restore` endpoint to undo within the window
4. A background job or TTL mechanism permanently purges after 30 seconds
5. Edges connected to soft-deleted nodes are also soft-deleted

---

## 4. Edge Creation Flow

### Design Decision

Edge creation is **always contextual** — launched from a node's context with the source pre-filled. No standalone "Create Edge" in the toolbar (edges require two nodes, so cold creation is awkward UX).

### Interaction Flow

```
USER CLICKS [Add Edge] from node context (source = Login Screen)
│
▼
Create Edge Dialog opens
│
├── Source Node: [● Screen  Login Screen] (pre-filled, read-only)
│
├── Edge Type selector:
│   Shows ONLY valid types for source node type (Screen)
│   Invalid types grayed out with tooltip
│   USER SELECTS type (e.g., RENDERS)
│
├── Target Node picker:
│   Filtered by valid target types for selected edge type
│   Search input with autocomplete (debounced 200ms)
│   Results: type dot + name + app
│   USER SELECTS target
│
├── [+ Add metadata] (collapsed by default)
│
├── USER CLICKS [Add Edge]
│   ├── SUCCESS → dialog closes, toast "Edge added: Login Screen RENDERS LoginForm"
│   └── ERROR → error banner in dialog
│
└── [Cancel] → dialog closes
```

### Create Edge Dialog Wireframe

```
┌─────────────────────────────────────────────────────────┐
│  Add Edge                                          [✕]  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  From                                                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ● Screen  Login Screen                           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  Edge Type *                                             │
│  [RENDERS                                          ▼]   │
│   Filtered to valid types for Screen source              │
│                                                          │
│  To *                                                    │
│  [Search for a component...                ]             │
│                                                          │
│  Results:                                                │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ● Component  LoginForm                           │   │
│  │ ● Component  LoginButton                         │   │
│  │ ● Component  PasswordInput                       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  [+ Add metadata]                                        │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                          [Cancel]  [Add Edge]            │
└─────────────────────────────────────────────────────────┘
```

**Node picker details:**
- Search fires after 2 characters, debounced 200ms
- Max 8 results before scroll
- Selected target shows as chip (replacing the search input)
- Placeholder changes dynamically: "Search for a Component..." based on edge type

---

## 5. Edge Deletion Flow

Edge deletion uses **inline confirmation** (not a full modal) since edges have no cascade:

```
BEFORE: [→ RENDERS LoginForm Component]  [···]
AFTER:  "Delete this edge?" [Delete] [Cancel]
```

- Row transforms in-place
- [Delete] → row shows "Deleting..." → row fades out on success
- Error → row restores, error toast
- Toast with [Undo] (30 seconds, same soft-delete pattern)

**Graph visualization:** Edge hover shows midpoint ✕ button (24x24px, appears after 200ms). Clicking ✕ shows small popover confirm.

---

## 6. Integration with Existing Views

### Slide-In Panel

```
VIEW MODE (extended with actions)
┌──────────────────────────────────┐
│ ● Screen  Login Screen      [✕] │
│ ──────────────────────────────── │
│ [Edit]  [Add Edge]  [Delete]     │  ← action row
│ ──────────────────────────────── │
│ ... existing content ...         │
│ ──────────────────────────────── │
│ Edges (4)                        │
│ → RENDERS  LoginForm      [···] │  ← kebab menu: View Target, Delete Edge
│ → RENDERS  ErrorBanner    [···] │
│ [+ Add Edge]                     │  ← inline shortcut
└──────────────────────────────────┘
```

### Graph Visualization

Right-click context menu on nodes:
```
┌───────────────────────┐
│ Login Screen           │
│ ─────────────────────  │
│ View Details           │
│ Edit Node              │
│ Add Edge from here     │
│ ─────────────────────  │
│ Delete Node            │  ← danger text color
└───────────────────────┘
```

**Animations:**
- Node created: scale(0) → scale(1), 300ms ease-out
- Node deleted: opacity 1 → 0, 250ms, then removed from simulation
- Edge created: stroke-dashoffset draw-in, 300ms
- Edge deleted: opacity fade-out, 250ms

### Navigator Sidebar

Hover `[...]` menu on each node row: Edit, Delete.
Post-write: optimistic updates — new nodes appear immediately, deleted nodes fade out.

---

## 7. Error Handling Patterns

| Pattern | When | UX |
|---------|------|-----|
| Field validation | On blur | Red border + message below field |
| API error on submit | POST/PUT fails | Error banner at top of form, form stays open |
| Network error | Connectivity issue | Persistent toast with [Retry] button |
| Impact load error | Delete modal can't fetch edges | Warning + "Delete Anyway" option |
| Optimistic rollback | Edge delete fails after optimistic hide | Row slides back, error toast |

---

## 8. Accessibility

- **Focus management:** Dialog trap, return focus to trigger on close, logical Tab order
- **ARIA:** `role="dialog"`, `role="radiogroup"` for type selector, `role="combobox"` for node picker
- **Color independence:** All indicators use color + text/icon (never color alone)
- **Keyboard:** Arrow keys in type grid and pickers, Enter to select, Escape to dismiss
- **Screen readers:** `aria-live` regions for toasts, dynamic field reveals, and form submission results

---

## 9. New Shared Components

| Component | Description | Used By |
|-----------|-------------|---------|
| `NodeTypeSelector` | Grid of 11 radio-style type cells | Create dialog |
| `TagInput` | Chip-based multi-value input | All node forms |
| `NodePicker` | Search-with-autocomplete, returns node ID | Edge dialog, parent screen field |
| `EdgeTypeSelect` | Filtered dropdown by source type | Edge dialog |
| `ConfirmationModal` | Title, description, body, danger action | Delete flows |
| `InlineConfirm` | Row transforms to "Sure? [Yes] [No]" | Edge deletion |
| `ActionMenu` | Kebab `[...]` button with dropdown | Panel, sidebar, context menu |
| `Toast` | Notification with optional [Undo]/[Retry] | All write operations |
| `DirtyIndicator` | "Unsaved changes" dot + text | Edit modes |
| `TypeSpecificFields` | Dynamic renderer: type → field set | Create dialog, edit page |

---

## 10. Implementation Phases

### Phase 1 — Panel Edit Mode + Toast System
- Action row in Slide-In Panel ([Edit] [Add Edge] [Delete], wire Edit only)
- Panel edit mode (name, description, tags editable)
- Dirty state handling
- Toast notification system (shared by all subsequent phases)

### Phase 2 — Node Creation
- [+ New Node] toolbar button
- Create Node Dialog with type selector grid
- Type-specific field components
- Navigator sidebar updates on creation

### Phase 3 — Full-Screen Edit
- `/nodes/:nodeId/edit` route with two-column layout
- [Advanced Edit] link from panel
- Type-specific field rendering
- Browser beforeunload dirty state

### Phase 4 — Edge Creation
- [Add Edge] in panel wired to Create Edge Dialog
- Edge type constraint filtering
- Target node picker with autocomplete search

### Phase 5 — Deletion
- Delete Confirmation Modal with impact data
- Soft-delete with 30-second undo window (backend + frontend)
- Edge inline deletion
- Post-deletion routing

### Phase 6 — Graph Visualization Integration
- Right-click context menu additions
- Edge hover ✕ button
- Node/edge add/remove animations
