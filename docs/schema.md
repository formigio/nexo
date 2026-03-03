# Nexo Spec Graph Schema

This document defines the complete node and edge type system for Nexo specification graphs.

## Design Philosophy

Every node and edge has a **type** and a **properties** object. Types are strict enums. Properties vary by type but share a common base. The schema is designed to be:

- **Exhaustive enough** to model real applications completely
- **Simple enough** that a PM can understand the node types without training
- **Precise enough** that an AI agent can traverse it to answer arbitrary questions

## Common Node Properties

All nodes share these base properties:

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier (auto-generated) |
| `type` | NodeType | The node's type (see below) |
| `app` | string | Application this node belongs to (e.g., "myapp") |
| `name` | string | Human-readable name |
| `description` | string? | Detailed description / spec content |
| `tags` | string[] | Freeform tags for categorization |
| `metadata` | object? | Type-specific structured data |
| `embedding` | vector? | Semantic embedding of name + description |
| `createdAt` | datetime | When this node was created |
| `updatedAt` | datetime | When this node was last modified |
| `createdBy` | string? | Who created this node |
| `version` | number | Monotonically increasing version counter |

---

## Node Types

### Screen

A user-facing view/page in the application. Represents a distinct URL route or navigational destination.

| Property | Type | Description |
|----------|------|-------------|
| `route` | string? | URL path (e.g., `/trips/:tripId/schedule`) |
| `platform` | string[] | Platforms this screen exists on: `["web", "ios", "android"]` |
| `accessLevel` | string | `"public"`, `"authenticated"`, `"role:organizer"`, etc. |
| `parentScreen` | string? | ID of parent screen (for nested navigation) |

**Example:** `Schedule`, `ActivityDetail`, `JoinTrip`, `Welcome`

### Component

A reusable UI element within screens. Can be interactive (buttons, forms) or presentational (cards, lists).

| Property | Type | Description |
|----------|------|-------------|
| `componentType` | string | `"interactive"`, `"presentational"`, `"layout"`, `"navigation"` |
| `platform` | string[] | Platforms: `["web", "ios", "android"]` |
| `variants` | string[]? | Named variants (e.g., `["compact", "medium", "expanded"]`) |
| `sourceFile` | string? | Path to source code file |

**Example:** `RSVPButton`, `ActivityCard`, `BottomNav`, `PaywallModal`

### UserState

A distinct state a user can be in within the application. Represents a combination of authentication status, permissions, and contextual conditions.

| Property | Type | Description |
|----------|------|-------------|
| `stateType` | string | `"auth"`, `"permission"`, `"contextual"`, `"composite"` |
| `conditions` | string[] | Human-readable conditions that define this state |
| `isTerminal` | boolean | Whether this is an end state (no transitions out) |

**Example:**
- `Unauthenticated` (stateType: "auth")
- `Authenticated, Profile Incomplete` (stateType: "composite", conditions: ["has valid token", "profile.name is null"])
- `Trip Organizer` (stateType: "permission", conditions: ["authenticated", "tripMember.role == organizer"])
- `Offline` (stateType: "contextual", conditions: ["no network connection"])

### UserAction

Something a user can do. Represents an intent that triggers system behavior.

| Property | Type | Description |
|----------|------|-------------|
| `actionType` | string | `"navigate"`, `"mutate"`, `"query"`, `"authenticate"`, `"configure"` |
| `inputType` | string? | `"tap"`, `"form"`, `"gesture"`, `"automatic"` |
| `requiresConfirmation` | boolean | Whether the action requires user confirmation |

**Example:**
- `RSVP to Activity` (actionType: "mutate", inputType: "tap")
- `Join Trip via Code` (actionType: "mutate", inputType: "form")
- `View Schedule` (actionType: "navigate", inputType: "tap")
- `Sign In with Email OTP` (actionType: "authenticate", inputType: "form")

### APIEndpoint

A backend API route that accepts requests and returns responses.

| Property | Type | Description |
|----------|------|-------------|
| `method` | string | HTTP method: `"GET"`, `"POST"`, `"PUT"`, `"DELETE"` |
| `path` | string | URL path with parameters: `/trips/{tripId}/activities/{activityId}/rsvp` |
| `authRequired` | boolean | Whether authentication is required |
| `requiredRole` | string? | Minimum role required (e.g., `"organizer"`) |
| `requestSchema` | object? | JSON schema of request body |
| `responseSchema` | object? | JSON schema of response body |
| `rateLimit` | string? | Rate limiting rules |

**Example:** `PUT /trips/{tripId}/activities/{activityId}/rsvp` (method: "PUT", authRequired: true)

### DataEntity

A persistent data structure / database table / document type.

| Property | Type | Description |
|----------|------|-------------|
| `storageType` | string | `"dynamodb"`, `"s3"`, `"cognito"`, `"stripe"`, `"cache"` |
| `keyPattern` | string? | Primary key pattern (e.g., `PK: TRIP#{tripId}, SK: ACTIVITY#{activityId}`) |
| `indexes` | string[]? | Secondary indexes |
| `ttl` | boolean | Whether records have TTL/auto-expiry |

**Example:** `Trip`, `Activity`, `RSVP`, `TripMembership`, `Room`

### DataField

A specific field/attribute within a data entity.

| Property | Type | Description |
|----------|------|-------------|
| `fieldType` | string | `"string"`, `"number"`, `"boolean"`, `"enum"`, `"datetime"`, `"object"`, `"array"`, `"reference"` |
| `required` | boolean | Whether the field is required |
| `enumValues` | string[]? | Allowed values for enum fields |
| `defaultValue` | any? | Default value |
| `maxLength` | number? | Maximum length for strings |
| `validation` | string? | Human-readable validation rule |
| `pii` | boolean | Whether this field contains personally identifiable information |

**Example:**
- `RSVP.status` (fieldType: "enum", enumValues: ["going", "maybe", "not_going"], required: true)
- `Trip.inviteCode` (fieldType: "string", maxLength: 6, required: true)
- `User.email` (fieldType: "string", required: true, pii: true)

### BusinessRule

A constraint, validation, workflow, or behavioral rule that governs how the system works. These are the "why" behind the "what."

| Property | Type | Description |
|----------|------|-------------|
| `ruleType` | string | `"validation"`, `"authorization"`, `"workflow"`, `"computation"`, `"constraint"`, `"behavior"` |
| `priority` | string | `"critical"`, `"important"`, `"nice-to-have"` |
| `enforcement` | string | `"server"`, `"client"`, `"both"` |
| `pseudocode` | string? | Pseudocode or logic description |

**Example:**
- `"Only organizers can edit activities"` (ruleType: "authorization", enforcement: "both")
- `"RSVP cycles: none -> going -> maybe -> not_going -> none"` (ruleType: "behavior", enforcement: "client")
- `"Trips with > 8 members require payment"` (ruleType: "constraint", enforcement: "server")
- `"OTP codes expire after 5 minutes"` (ruleType: "workflow", enforcement: "server")

### Feature

A named product feature that groups related nodes. Features have IDs (e.g., P1-10) and lifecycle states.

| Property | Type | Description |
|----------|------|-------------|
| `featureId` | string | Feature identifier (e.g., `"P1-10"`, `"F12"`) |
| `status` | string | `"proposed"`, `"in-progress"`, `"deployed"`, `"deprecated"` |
| `priority` | string | `"P0"`, `"P1"`, `"P2"`, `"P3"` |
| `deployedVersion` | string? | Version where this feature shipped |
| `specUrl` | string? | Link to external spec document |

**Example:** `P1-10: Transportation`, `F12: Seamless Join Flow`, `P1-1: Organizer Paywall`

### InfraResource

A cloud/infrastructure resource that backs part of the system.

| Property | Type | Description |
|----------|------|-------------|
| `provider` | string | `"aws"`, `"stripe"`, `"sendgrid"`, `"google"` |
| `service` | string | `"dynamodb"`, `"lambda"`, `"cognito"`, `"s3"`, `"cloudfront"`, `"ses"` |
| `resourceId` | string? | AWS resource ID or ARN |
| `environment` | string | `"dev"`, `"prod"`, `"both"` |

**Example:** `DynamoDB:JourneyJuntos-prod`, `Cognito:UserPool`, `S3:ProfilePhotos`

### SourceFile

A source code file that implements part of the specification. Makes implementation traceable back to spec nodes via IMPLEMENTED_IN edges.

| Property | Type | Description |
|----------|------|-------------|
| `repo` | string | Repository name (e.g., `"my-frontend"`, `"my-backend"`) |
| `relativePath` | string | Path relative to repo root (e.g., `"src/pages/schedule/SchedulePage.jsx"`) |
| `language` | string | File language: `"jsx"`, `"tsx"`, `"js"`, `"ts"`, `"yaml"`, `"json"`, `"css"`, `"surql"`, `"other"` |
| `layer` | string | Architectural layer: `"page"`, `"component"`, `"hook"`, `"context"`, `"api-handler"`, `"auth-handler"`, `"webhook"`, `"scheduled"`, `"config"`, `"utility"`, `"style"`, `"test"`, `"other"` |

**Example:** `web/src/pages/Schedule.jsx`, `infra/unified-stack/src/api/trips.js`, `infra/unified-stack/template.yaml`

---

## Edge Types

Edges are directional and typed. Each edge connects a source node to a target node.

### Common Edge Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `type` | EdgeType | The edge's type (see below) |
| `source` | string | Source node ID |
| `target` | string | Target node ID |
| `metadata` | object? | Additional context |
| `createdAt` | datetime | When this edge was created |

### Edge Type Definitions

| Edge Type | Source → Target | Description |
|-----------|----------------|-------------|
| `RENDERS` | Screen → Component | Screen contains/displays this component |
| `CHILD_OF` | Screen → Screen | Screen is a child/sub-screen of another |
| `TRIGGERS` | Component → UserAction | Interacting with this component triggers this action |
| `CALLS` | UserAction → APIEndpoint | This action results in this API call |
| `REQUIRES_STATE` | Screen → UserState | Screen requires user to be in this state |
| `TRANSITIONS_TO` | UserState → UserState | User can transition between states (via UserAction) |
| `READS` | APIEndpoint → DataEntity | Endpoint reads from this entity |
| `WRITES` | APIEndpoint → DataEntity | Endpoint writes to this entity |
| `HAS_FIELD` | DataEntity → DataField | Entity contains this field |
| `REFERENCES` | DataField → DataEntity | Field references another entity (foreign key) |
| `VALIDATES` | BusinessRule → DataField | Rule validates/constrains this field |
| `CONSTRAINS` | BusinessRule → UserAction | Rule constrains when/how this action can be performed |
| `AUTHORIZES` | BusinessRule → APIEndpoint | Rule controls access to this endpoint |
| `BELONGS_TO` | * → Feature | Node is part of this feature |
| `DEPENDS_ON` | Feature → Feature | Feature depends on another feature |
| `HOSTED_ON` | APIEndpoint → InfraResource | Endpoint runs on this infrastructure |
| `STORED_IN` | DataEntity → InfraResource | Entity is persisted in this resource |
| `NAVIGATES_TO` | UserAction → Screen | Action navigates user to this screen |
| `DISPLAYS` | Component → DataField | Component displays this data field |
| `ACCEPTS_INPUT` | Component → DataField | Component accepts input for this field |
| `IMPLEMENTED_IN` | Screen/Component/APIEndpoint/DataEntity/BusinessRule/UserAction/UserState/InfraResource → SourceFile | Spec node is implemented in this source file |

### Edge Cardinality

Most edges are many-to-many. A screen can render many components. A component can appear on many screens. A business rule can validate many fields. These relationships are all captured as individual edges.

---

## Changeset Schema

A changeset represents a proposed set of modifications to the spec graph.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `app` | string | Application this changeset applies to |
| `title` | string | Short title (like a PR title) |
| `description` | string | Detailed description of what and why |
| `status` | string | `"draft"`, `"proposed"`, `"approved"`, `"applied"`, `"rejected"` |
| `operations` | Operation[] | List of graph modifications |
| `impacts` | Impact[] | Auto-detected downstream impacts |
| `createdBy` | string | Who created this changeset |
| `createdAt` | datetime | When created |
| `appliedAt` | datetime? | When applied to the graph |

### Operation Types

| Operation | Description |
|-----------|-------------|
| `ADD_NODE` | Create a new node with specified type and properties |
| `MODIFY_NODE` | Change properties of an existing node |
| `REMOVE_NODE` | Remove a node (and all connected edges) |
| `ADD_EDGE` | Create a new edge between existing nodes |
| `MODIFY_EDGE` | Change properties of an existing edge |
| `REMOVE_EDGE` | Remove an edge |

### Impact (Auto-Detected)

When a changeset is created, the system traverses the graph to find all nodes that would be affected by the proposed changes but aren't explicitly included in the operations.

| Property | Type | Description |
|----------|------|-------------|
| `nodeId` | string | The affected node |
| `reason` | string | Why this node is impacted |
| `severity` | string | `"breaking"`, `"needs-update"`, `"informational"` |
| `path` | string[] | The edge traversal path that led to this impact |

---

## Query Patterns

These are the canonical queries the system should support efficiently:

### Traversal Queries
- **Impact analysis**: Given a node, find all nodes reachable within N hops
- **Dependency tree**: Given a feature, show all nodes it depends on
- **Reverse dependency**: Given a data field, show everything that reads/validates/displays it
- **Screen map**: Given a screen, show all components, actions, API calls, and data it touches

### Semantic Queries
- **Similar specs**: Find nodes semantically similar to a natural language query
- **Related features**: Find features that are semantically related to a proposed change

### Composite Queries
- **Full impact analysis**: Combine semantic search (find related) + traversal (find connected) for comprehensive impact assessment
- **Feature scope**: All nodes belonging to a feature + all nodes those depend on

### Temporal Queries
- **Change history**: Show all modifications to a node over time
- **State at time T**: Show the graph as it existed at a specific point in time
- **Recently modified**: Find all nodes changed in the last N days

---

## Naming Conventions

- **Node names**: Human-readable, title case (e.g., "Schedule Screen", "RSVP Button", "Trip Membership")
- **Node IDs**: Auto-generated, prefixed by type abbreviation (e.g., `scr_schedule`, `cmp_rsvp_button`, `ent_trip`)
- **Edge IDs**: Auto-generated from source, type, and target (e.g., `scr_schedule_RENDERS_cmp_activity_card`)
- **App names**: Lowercase, hyphenated (e.g., `myapp`)
- **Feature IDs**: Preserve existing conventions (e.g., `P1-10`, `F12`)
