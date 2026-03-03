# Nexo Product Vision

## The Problem

Building and evolving software applications requires understanding how everything connects. Today, that understanding is fragmented:

- **UX specs** live in Figma or Google Docs
- **Data schemas** live in code and migrations
- **Business rules** live in people's heads (or scattered across code comments)
- **API contracts** live in handler files or OpenAPI specs
- **Feature scope** lives in project management tools

When someone asks "what would need to change to add feature X?", the answer requires a senior engineer who holds the whole system in their head. That doesn't scale, and it doesn't work for AI agents.

## The Solution

Nexo is a **specification graph** — every meaningful element of an application (screens, components, API endpoints, data fields, business rules) is a node, and every relationship between them is a typed edge. The entire application becomes a single queryable graph.

## Who Uses Nexo and How

### Developers

**Problem:** "I need to add a 'waitlist' status to RSVPs. What do I need to change?"

**Nexo answer:**
```
nexo impact-analysis --node "RSVP.status"

Direct impacts:
  - BusinessRule: "RSVP status cycle" — needs 'waitlist' added to cycle
  - APIEndpoint: PUT /trips/{tripId}/activities/{activityId}/rsvp — needs to accept 'waitlist'

Structural impacts:
  - Component: RSVPButton — needs waitlist UI state
  - Screen: ActivityDetail — displays RSVP status
  - Screen: Schedule — displays RSVP badges
  - Screen: Today — displays RSVP indicators

Semantic matches:
  - Feature: P1-15 (Placeholders) — also has RSVP-like behavior, may need waitlist too
```

The developer gets a complete implementation checklist in seconds, including things they might not have thought of.

### Product Managers

**Problem:** "I want to propose adding calendar export. What's the scope?"

**Nexo workflow:**
1. PM creates a **changeset**: "P2-17: Calendar Integration"
2. Adds proposed nodes: new UserAction "Export to Calendar", new BusinessRule "Calendar format: iCal"
3. Adds proposed edges: links the action to existing Screen "Schedule" and DataEntity "Activity"
4. Nexo auto-detects: which existing data fields would be included in the export, which business rules (like timezone handling) apply, which API endpoints would need modification
5. The changeset shows the full scope before a line of code is written

### AI Agents (Claude Code)

**Problem:** "Build the transportation feature per the spec."

**Nexo enables:**
1. Claude Code queries the graph: `nexo feature-scope P1-10`
2. Gets back all nodes: screens to build, components to create, API endpoints to implement, data entities to define, business rules to enforce
3. For each node, gets the full spec content (stored as node description)
4. Cross-references with existing nodes to understand integration points
5. Generates implementation plan grounded in the actual system definition

The AI doesn't hallucinate about what exists — it queries the graph.

### Marketers

**Problem:** "What does our app actually do? What's new?"

**Nexo answer:**
```
nexo list-features myapp --status deployed --since 2025-01-01

Features deployed since Jan 1, 2025:
  - P1-10: Transportation — Organize carpools and travel logistics
  - P1-15: Placeholder Participants — Add guests who haven't signed up yet
  - P1-20: Help & Feedback — In-app feedback with SLA tracking
  - P2-14: Payment Links — Collect payments via Venmo, PayPal, or Stripe
```

Each feature links to its full scope of screens, user actions, and data — raw material for writing marketing copy that accurately describes what the product does.

## The Changeset System

Changesets are the killer feature for product teams. They work like git branches but for the specification graph.

### Changeset Lifecycle

```
Draft → Proposed → Approved → Applied
                 ↘ Rejected
```

1. **Draft:** Someone creates a changeset with proposed graph modifications (add node, modify node, add edge, etc.)
2. **Proposed:** The changeset is shared for review. Nexo auto-calculates impacts — nodes that would be affected but aren't explicitly included.
3. **Approved:** Stakeholders sign off on the scope.
4. **Applied:** The changes are merged into the live graph. Downstream teams are notified of affected nodes.

### Impact Classification

When a changeset is proposed, each auto-detected impact is classified:

- **Breaking:** A node that would stop working without updates (e.g., an API endpoint that validates against an enum that's being changed)
- **Needs Update:** A node that should be updated to support the change (e.g., a component that displays a field being extended)
- **Informational:** A node that's related but may not need changes (e.g., a semantically similar feature)

## Use Case: Native Mobile App

One of the driving use cases for Nexo is creating native iOS/Android apps from an existing web application.

### Without Nexo

A team building a native mobile app for your application would need to:
1. Read all the source code to understand what screens exist
2. Map out the API endpoints by reading handler files
3. Understand business rules by reading validation logic scattered across frontend and backend
4. Discover edge cases by trial and error or asking the original developer

### With Nexo

```
nexo list-screens myapp --format tree

Application Screens:
├── Public
│   ├── Welcome (/)
│   ├── Enter Email (/enter-email)
│   ├── Verify Code (/verify-code)
│   ├── Join Trip (/join/:code)
│   └── Trip Preview (/trips/:id/preview)
├── Authenticated
│   ├── My Trips (/)
│   ├── Trip
│   │   ├── Today (/trips/:id/today)
│   │   ├── Schedule (/trips/:id/schedule)
│   │   │   ├── Activity Detail (/trips/:id/activities/:aid)
│   │   │   └── Add/Edit Activity (organizer only)
│   │   ├── People (/trips/:id/people)
│   │   │   └── Person Detail
│   │   ├── Stay (/trips/:id/stay)
│   │   │   └── Room Detail
│   │   └── Transport (/trips/:id/transport)
│   ├── Profile (/profile)
│   └── Help & Feedback (/help)
└── Admin
    └── Feedback Dashboard (/admin/feedback)
```

Then for each screen:
```
nexo traverse --from "scr_schedule" --depth 2

Schedule Screen
├── RENDERS → ActivityCard (compact, medium, expanded variants)
├── RENDERS → DaySelector
├── RENDERS → ActivityTypeIcon
├── REQUIRES_STATE → Authenticated, Profile Complete
├── REQUIRES_STATE → Trip: Live
│
├── ActivityCard
│   ├── TRIGGERS → Navigate to Activity Detail
│   ├── TRIGGERS → RSVP to Activity
│   ├── DISPLAYS → Activity.title
│   ├── DISPLAYS → Activity.date
│   ├── DISPLAYS → Activity.startTime
│   └── DISPLAYS → Activity.type
│
└── RSVP to Activity
    ├── CALLS → PUT /trips/{tripId}/activities/{activityId}/rsvp
    └── CONSTRAINED_BY → "RSVP status cycle" (going → maybe → not_going → none)
```

The native mobile team now has a complete, accurate specification for every screen without reading a line of React code.

## Roadmap

### Phase 1: Foundation (Current)
- Define schema (node types, edge types, properties)
- Document architecture decisions
- Map a real application as the first test case

### Phase 2: CLI + Database
- Set up SurrealDB (local first)
- Build `nexo` CLI for CRUD operations
- Manually populate the application graph via CLI
- Validate query patterns (impact analysis, traversal, search)

### Phase 3: MCP Server
- Build MCP server wrapping the query engine
- Claude Code can query the spec graph natively
- Test with real development workflows (feature planning, code review)

### Phase 4: Ingestion Automation
- Build source code parsers (React Router → Screens, SAM template → Endpoints)
- Semi-automated graph population from code
- Delta detection: what changed since last ingestion

### Phase 5: Changesets
- Implement changeset creation, impact analysis, and application
- Build approval workflow
- This is where PMs start using the system

### Phase 6: Web UI
- Visual graph navigator
- Changeset proposal and review interface
- Feature scope visualization
- Search and filtering

### Phase 7: Continuous Sync
- CI/CD integration: graph updates on code deploy
- Drift detection: spec graph vs. actual code
- Bidirectional: changesets that generate code scaffolding

## What Makes Nexo Different

| Existing Tool | What It Does | What It Doesn't Do |
|--------------|-------------|-------------------|
| Kiro / Spec Kit | Spec-driven development (flat files) | No graph relationships between specs |
| Backstage | Software catalog (service-level) | Not spec-level; can't model UX or business rules |
| Structurizr / C4 | Architecture diagrams | Structural only; no behavior, no business logic |
| ADR Tools | Decision records | Isolated records; no downstream impact tracking |
| OpenAPI / Swagger | API documentation | Only API contracts; not connected to UX or business rules |

Nexo connects all of these layers into a single traversable graph. That's the gap.

## Long-Term Vision

Nexo becomes the **operating system for application definition**. Every application starts as a Nexo spec graph, and code is generated from (and validated against) the graph. The graph is the source of truth; code is an implementation detail.

- **Design a feature** in the graph → auto-generate implementation tasks
- **Change a business rule** in the graph → see every code change needed
- **Add a platform** (iOS, Android) → the graph already contains every screen, action, and rule
- **Onboard a new developer** → they navigate the graph instead of reading all the code
- **Train an AI agent** → point it at the graph instead of the codebase
