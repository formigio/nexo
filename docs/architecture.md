# Nexo Architecture

## System Overview

```
┌─────────────────────────────────────────────────────┐
│                    Consumers                         │
│                                                      │
│  Claude Code ←→ MCP Server                           │
│  Developer   ←→ CLI (`nexo`)                         │
│  PM / Anyone ←→ Web UI                               │
│  CI/CD       ←→ REST API                             │
│                                                      │
├─────────────────────────────────────────────────────┤
│                  Interface Layer                      │
│                                                      │
│  MCP Server    REST API    WebSocket (live queries)   │
│       ↓            ↓              ↓                  │
│  ┌─────────────────────────────────────┐             │
│  │          Query Engine               │             │
│  │  (graph traversal + vector search   │             │
│  │   + document retrieval + filtering) │             │
│  └─────────────────────────────────────┘             │
│                      ↓                               │
├─────────────────────────────────────────────────────┤
│                 Storage Layer                         │
│                                                      │
│  ┌─────────────────────────────────────┐             │
│  │            SurrealDB                │             │
│  │                                     │             │
│  │  Graph:    node → edge → node       │             │
│  │  Vector:   KNN search on embeddings │             │
│  │  Document: full spec content        │             │
│  │  Temporal: version history          │             │
│  └─────────────────────────────────────┘             │
│                                                      │
├─────────────────────────────────────────────────────┤
│              Ingestion Pipeline                       │
│                                                      │
│  Source Code Parsers → Node/Edge Extraction           │
│  Manual Entry (CLI/API) → Direct Node Creation        │
│  Embedding Pipeline (Claude API) → Vector Index       │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Technology Decisions

### Decision 1: SurrealDB as Unified Store

**Status:** Decided

**Context:** Nexo needs graph traversal (impact analysis), vector search (semantic queries), document storage (spec content), and relational filtering (temporal queries). The options were:

1. **Neo4j + Weaviate + S3** — Best-in-class for each concern, but three systems to sync
2. **SurrealDB** — Multi-model engine handling all four in one database
3. **Neo4j with native vectors** — Graph-first with adequate vector support

**Decision:** SurrealDB

**Rationale:**
- A single query in SurrealQL can combine vector search, graph traversal, document retrieval, and relational filtering. This is the primary access pattern for Nexo.
- Operational simplicity: one database, one backup strategy, one deployment.
- SurrealDB's graph model uses `->` arrow syntax for relationships, which maps directly to the spec graph's typed edges.
- Native vector indexes support semantic search without a sidecar.
- If graph traversal performance becomes a bottleneck at scale, we can add Neo4j as a read replica without changing the data model.

**Risks:**
- SurrealDB is younger than Neo4j. Monitor stability carefully.
- No existing MCP server — we build our own (this is also an opportunity to tailor the interface).
- Deep graph algorithms (PageRank, community detection) are less mature than Neo4j's.

**Fallback:** If SurrealDB proves insufficient, the data model (typed nodes + typed edges) maps cleanly to Neo4j's labeled property graph. Migration is mechanical, not architectural.

### Decision 2: MCP Server as Primary AI Interface

**Status:** Decided

**Context:** AI agents (Claude Code, future integrations) need to query and modify the spec graph. Options were:

1. **File-based** — Dump the graph to markdown files, let Claude Code read them
2. **MCP server** — Purpose-built tool interface with semantic operations
3. **Direct database access** — Let agents query SurrealDB directly

**Decision:** MCP Server

**Rationale:**
- MCP is the standard for Claude Code tool integration. Building an MCP server makes Nexo immediately usable from Claude Code.
- A purpose-built tool interface (e.g., `impact_analysis(node_id)`) is more useful to an AI agent than raw Cypher/SurrealQL queries. The MCP server encapsulates complex operations.
- The same tool interface works for the CLI and REST API (shared query engine, different transports).

**MCP Tool Design:**

```
# Read operations
nexo:get_node(id) → Node with edges
nexo:search(query, filters?) → Semantically similar nodes
nexo:traverse(from_id, edge_types?, depth?) → Connected subgraph
nexo:impact_analysis(node_id) → All potentially affected nodes
nexo:feature_scope(feature_id) → All nodes in a feature's scope

# Write operations
nexo:create_node(type, properties) → New node
nexo:create_edge(type, source, target) → New edge
nexo:update_node(id, properties) → Modified node
nexo:delete_node(id) → Confirmation

# Changeset operations
nexo:propose_changeset(title, operations) → Changeset with auto-detected impacts
nexo:get_changeset(id) → Changeset details
nexo:apply_changeset(id) → Apply changes to graph

# Navigation
nexo:list_apps() → Available applications
nexo:app_overview(app) → High-level stats and structure
nexo:list_screens(app) → All screens
nexo:list_features(app, status?) → Features by status
```

### Decision 3: Claude API for Embeddings

**Status:** Decided

**Context:** Semantic search requires vector embeddings of node content. Options:

1. **Claude API** — Use Claude's embedding model
2. **OpenAI embeddings** — Widely used, well-documented
3. **Local model** — Run embedding model locally

**Decision:** Claude API (voyage embeddings via Anthropic)

**Rationale:**
- We're already in the Claude ecosystem. Using Claude embeddings keeps the stack consistent.
- Embeddings are generated on node creation/update, so latency isn't critical.
- Cost is minimal for the volume we'll produce (hundreds to low thousands of nodes per application).

### Decision 4: CLI-First Development

**Status:** Decided

**Context:** Build order for the interface layer.

**Decision:** Build the CLI first, then MCP server, then Web UI.

**Rationale:**
- The CLI is the fastest way to validate the data model and query patterns.
- Populating the graph manually via CLI proves out the schema before building ingestion automation.
- The MCP server reuses the same query engine as the CLI.
- The Web UI is the most complex to build and benefits from a stable query engine underneath.

## Deployment Architecture

### Phase 1: Local Development

```
SurrealDB (local, file-backed or in-memory)
  ↕
CLI tool (`nexo`)
  ↕
Developer's terminal
```

SurrealDB runs locally via Docker or direct binary. No cloud infrastructure needed.

### Phase 2: Shared Instance

```
SurrealDB (cloud or self-hosted, TLS + auth)
  ↕
MCP Server (Node.js, runs alongside Claude Code)
  ↕
CLI + Claude Code
```

A single SurrealDB instance accessible over the network. MCP server connects to it.

### Phase 3: Production

```
SurrealDB Cloud (or self-hosted on AWS)
  ↕
API Gateway (REST + WebSocket)
  ↕
MCP Server | CLI | Web UI
```

Full stack with authentication, rate limiting, and a web interface.

## Data Flow: Node Creation

```
1. User (via CLI, API, or ingestion pipeline):
   "Create a Screen node: name='Schedule', route='/trips/:tripId/schedule'"

2. Query Engine:
   a. Validate node type and properties against schema
   b. Generate node ID: scr_schedule
   c. Compute embedding: embed(name + description) via Claude API
   d. Write node to SurrealDB

3. SurrealDB:
   a. Store node document (all properties)
   b. Index embedding in vector index
   c. Node is now queryable via graph traversal AND semantic search
```

## Data Flow: Impact Analysis

```
1. User: "What's affected if I change RSVP.status to add 'waitlist'?"

2. Query Engine:
   a. Find node: DataField where name="RSVP.status"
   b. BFS traversal from that node, following edges:
      - ← VALIDATES ← BusinessRule
      - ← HAS_FIELD ← DataEntity("RSVP")
      - ← WRITES ← APIEndpoint
      - ← CALLS ← UserAction
      - ← TRIGGERS ← Component
      - ← RENDERS ← Screen
      - → DISPLAYS → Component (reverse direction)
   c. Also: semantic search for "rsvp status waitlist" to find
      nodes not structurally connected but semantically related
   d. Combine structural + semantic results
   e. Classify each impact: breaking / needs-update / informational

3. Return:
   {
     direct_impacts: [BusinessRule, APIEndpoint],
     structural_impacts: [Component, Screen, Screen, Screen],
     semantic_impacts: [Feature("P1-15: Placeholders")],
     summary: "1 business rule, 1 API endpoint, 1 component, 3 screens affected"
   }
```

## Security Considerations

- **Authentication:** SurrealDB supports namespace/database-level auth. MCP server and REST API add application-level auth.
- **Multi-tenancy:** Applications are isolated by SurrealDB namespace. Cross-app queries are explicitly opted into.
- **PII:** DataField nodes can be flagged `pii: true`. Impact analysis highlights when changes touch PII fields.
- **Audit trail:** All modifications are timestamped and attributed. SurrealDB's event system can log all changes.

## Performance Expectations

For a typical application graph (~200-500 nodes, ~1000-3000 edges):

- **Node lookup:** < 1ms
- **Impact analysis (3-hop BFS):** < 10ms
- **Semantic search (top 20):** < 50ms
- **Full changeset impact:** < 100ms

These are well within interactive CLI and MCP tool response times. Performance optimization becomes relevant at 10,000+ nodes, which would represent a very large application or multi-application deployment.
