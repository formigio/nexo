# Nexo Backlog

## Proposed Features

### N8 — Graph Hygiene Rules

**Priority:** P2
**Status:** Idea

A set of logical/mathematical queries that run against the graph to detect structural holes and soft spots. Think of it as a linter for the spec graph.

**Example rules:**

| Rule | What it catches |
|------|-----------------|
| Orphaned nodes | Nodes with zero edges (e.g., `cmp_toolbar`, `cmp_sidebar` today) |
| Disconnected APIs | APIEndpoint nodes missing READS/WRITES edges to DataEntity |
| Blind components | Components with no DISPLAYS edges to DataField |
| Dangling actions | UserActions that don't CALL any endpoint or NAVIGATE_TO any screen |
| Unowned nodes | Nodes missing BELONGS_TO a Feature |
| One-way edges | Screens that RENDER components which trigger nothing |
| Dead-end navigation | UserActions with `actionType: navigate` but no `navigates_to` |

**Envisioned UX:** `nexo lint` or `nexo hygiene` CLI command that reports findings with severity levels (error, warning, info). Could also surface in the web console as a dashboard.

**Origin:** Discovered during N7 impact analysis — `cmp_toolbar` and `cmp_sidebar` had zero edges, causing `nexo impact` to underreport blast radius.
