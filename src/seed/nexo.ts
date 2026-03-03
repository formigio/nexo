/**
 * Nexo Self-Description Seed Script
 *
 * Nexo eats its own dog food — this seeds a "nexo" app into the spec graph,
 * modeling its own CLI commands, MCP tools, web routes, and data model.
 *
 * Usage: npm run build && node dist/seed/nexo.js
 */

import { getDb, closeDb } from "../db/client.js";
import { createNode } from "../db/nodes.js";
import { createEdge } from "../db/edges.js";
import type { CreateNodeInput, CreateEdgeInput } from "../schema/types.js";

const APP = "nexo";

// ── Node Helpers ─────────────────────────────────────────────

function scr(name: string, props: Record<string, unknown>, desc?: string): CreateNodeInput {
  return { type: "Screen", app: APP, name, props: { platform: ["web"], ...props }, description: desc, tags: [] };
}

function cmp(name: string, props: Record<string, unknown>, desc?: string): CreateNodeInput {
  return { type: "Component", app: APP, name, props: { platform: ["cli"], ...props }, description: desc, tags: [] };
}

function act(name: string, props: Record<string, unknown>, desc?: string): CreateNodeInput {
  return { type: "UserAction", app: APP, name, props, description: desc, tags: [] };
}

function api(name: string, props: Record<string, unknown>, desc?: string): CreateNodeInput {
  return { type: "APIEndpoint", app: APP, name, props, description: desc, tags: [] };
}

function ent(name: string, props: Record<string, unknown>, desc?: string): CreateNodeInput {
  return { type: "DataEntity", app: APP, name, props, description: desc, tags: [] };
}

function ftr(name: string, props: Record<string, unknown>, desc?: string): CreateNodeInput {
  return { type: "Feature", app: APP, name, props, description: desc, tags: [] };
}

function inf(name: string, props: Record<string, unknown>, desc?: string): CreateNodeInput {
  return { type: "InfraResource", app: APP, name, props, description: desc, tags: [] };
}

function edge(type: string, from: string, to: string): CreateEdgeInput {
  return { type, from, to };
}

// ══════════════════════════════════════════════════════════════
// NODE DEFINITIONS
// ══════════════════════════════════════════════════════════════

// ── Features (8) ─────────────────────────────────────────────

const featureNodes: CreateNodeInput[] = [
  ftr("Node Management", { featureId: "N1", status: "deployed", priority: "P0" }, "CRUD operations for spec graph nodes"),
  ftr("Edge Management", { featureId: "N2", status: "deployed", priority: "P0" }, "Create and manage typed relationships between nodes"),
  ftr("Graph Traversal", { featureId: "N3", status: "deployed", priority: "P0" }, "BFS traversal across the spec graph"),
  ftr("Impact Analysis", { featureId: "N4", status: "deployed", priority: "P0" }, "Analyze change impact across connected nodes"),
  ftr("Ingest Pipeline", { featureId: "N5", status: "deployed", priority: "P1" }, "Parse source code and sync nodes into the graph"),
  ftr("Spec Validation", { featureId: "N6", status: "deployed", priority: "P1" }, "AI-powered compliance checking of spec vs source"),
  ftr("Web Visualization", { featureId: "N7", status: "deployed", priority: "P1" }, "D3 force-directed graph visualization in the browser"),
  ftr("MCP Interface", { featureId: "N8", status: "deployed", priority: "P0" }, "MCP server exposing graph tools to AI agents"),
];

// ── Infrastructure Resources (1) ─────────────────────────────

const infraNodes: CreateNodeInput[] = [
  inf("SurrealDB", { provider: "surrealdb", service: "database" }, "Multi-model database storing the spec graph"),
];

// ── Data Entities (2) ────────────────────────────────────────

const entityNodes: CreateNodeInput[] = [
  ent("Node Table", { storageType: "surrealdb", keyPattern: "node:{type_prefix}_{slug}" }, "SCHEMAFULL table storing all spec graph nodes"),
  ent("Edge Table", { storageType: "surrealdb", keyPattern: "edge:{in}_{type}_{out}" }, "RELATION table storing typed edges between nodes"),
];

// ── Screen (1) ───────────────────────────────────────────────

const screenNodes: CreateNodeInput[] = [
  scr("Graph Viewer", { route: "/", accessLevel: "public" }, "D3v7 force-directed interactive graph visualization"),
];

// ── Components (10) — CLI command groups ─────────────────────

const componentNodes: CreateNodeInput[] = [
  cmp("nexo init", { componentType: "interactive", sourceFile: "src/cli/commands/init.ts" }, "Initialize DB namespace, database, and run migrations"),
  cmp("nexo node", { componentType: "interactive", sourceFile: "src/cli/commands/node.ts" }, "Node CRUD subcommands: create, get, list, update, delete"),
  cmp("nexo edge", { componentType: "interactive", sourceFile: "src/cli/commands/edge.ts" }, "Edge subcommands: create, list, delete"),
  cmp("nexo traverse", { componentType: "interactive", sourceFile: "src/cli/commands/traverse.ts" }, "BFS graph traversal from a starting node"),
  cmp("nexo impact", { componentType: "interactive", sourceFile: "src/cli/commands/impact.ts" }, "Impact analysis showing change propagation"),
  cmp("nexo app", { componentType: "interactive", sourceFile: "src/cli/commands/app.ts" }, "App-level queries: list apps, show overview"),
  cmp("nexo feature", { componentType: "interactive", sourceFile: "src/cli/commands/feature.ts" }, "Feature queries: list features, show scope"),
  cmp("nexo ingest", { componentType: "interactive", sourceFile: "src/cli/commands/ingest.ts" }, "Parse source code and sync nodes into the graph"),
  cmp("nexo validate", { componentType: "interactive", sourceFile: "src/cli/commands/validate.ts" }, "AI-powered spec vs source compliance checking"),
  cmp("nexo web", { componentType: "interactive", sourceFile: "src/cli/commands/web.ts" }, "Start the web visualization server"),
];

// ── User Actions (10) — key CLI subcommands ──────────────────

const actionNodes: CreateNodeInput[] = [
  act("node create", { actionType: "mutate", inputType: "form" }, "Create a new node in the spec graph"),
  act("node get", { actionType: "query", inputType: "form" }, "Retrieve a node by its ID"),
  act("node list", { actionType: "query", inputType: "form" }, "List nodes with optional filters"),
  act("node update", { actionType: "mutate", inputType: "form" }, "Update a node's fields"),
  act("node delete", { actionType: "mutate", inputType: "form" }, "Delete a node and its connected edges"),
  act("edge create", { actionType: "mutate", inputType: "form" }, "Create a typed relationship between two nodes"),
  act("edge list", { actionType: "query", inputType: "form" }, "List edges with optional filters"),
  act("traverse graph", { actionType: "query", inputType: "form" }, "BFS walk from a starting node"),
  act("analyze impact", { actionType: "query", inputType: "form" }, "Analyze change propagation from a node"),
  act("run ingest", { actionType: "mutate", inputType: "form" }, "Parse source and sync graph nodes"),
];

// ── API Endpoints — MCP tools (14) ──────────────────────────

const mcpEndpointNodes: CreateNodeInput[] = [
  api("MCP get_node", { method: "POST", path: "mcp://get_node" }, "Get a node by ID via MCP"),
  api("MCP list_nodes", { method: "POST", path: "mcp://list_nodes" }, "List nodes with filters via MCP"),
  api("MCP create_node", { method: "POST", path: "mcp://create_node" }, "Create a node via MCP"),
  api("MCP update_node", { method: "POST", path: "mcp://update_node" }, "Update a node via MCP"),
  api("MCP delete_node", { method: "POST", path: "mcp://delete_node" }, "Delete a node via MCP"),
  api("MCP list_edges", { method: "POST", path: "mcp://list_edges" }, "List edges with filters via MCP"),
  api("MCP create_edge", { method: "POST", path: "mcp://create_edge" }, "Create a typed edge via MCP"),
  api("MCP delete_edge", { method: "POST", path: "mcp://delete_edge" }, "Delete an edge via MCP"),
  api("MCP app_list", { method: "POST", path: "mcp://app_list" }, "List all applications in the graph"),
  api("MCP app_overview", { method: "POST", path: "mcp://app_overview" }, "Show app overview with node/edge counts"),
  api("MCP feature_list", { method: "POST", path: "mcp://feature_list" }, "List features with status and priority"),
  api("MCP feature_scope", { method: "POST", path: "mcp://feature_scope" }, "Show all nodes belonging to a feature"),
  api("MCP traverse", { method: "POST", path: "mcp://traverse" }, "BFS traversal from a starting node via MCP"),
  api("MCP impact_analysis", { method: "POST", path: "mcp://impact_analysis" }, "Analyze change impact via MCP"),
];

// ── API Endpoints — Web routes (5) ──────────────────────────

const webEndpointNodes: CreateNodeInput[] = [
  api("GET / graph viewer", { method: "GET", path: "/" }, "Serve the D3 force-directed graph HTML page"),
  api("GET /api/graph", { method: "GET", path: "/api/graph" }, "Full graph data: all nodes and edges for an app"),
  api("GET /api/nodes/:id", { method: "GET", path: "/api/nodes/:id" }, "Get a single node by ID"),
  api("GET /api/nodes/:id/edges", { method: "GET", path: "/api/nodes/:id/edges" }, "Get all edges connected to a node"),
  api("GET /api/features", { method: "GET", path: "/api/features" }, "List feature nodes for an app"),
];

// ══════════════════════════════════════════════════════════════
// EDGE DEFINITIONS
// ══════════════════════════════════════════════════════════════

// ── TRIGGERS (Component → UserAction) ───────────────────────

const triggersEdges: CreateEdgeInput[] = [
  edge("TRIGGERS", "cmp_nexo_node", "act_node_create"),
  edge("TRIGGERS", "cmp_nexo_node", "act_node_get"),
  edge("TRIGGERS", "cmp_nexo_node", "act_node_list"),
  edge("TRIGGERS", "cmp_nexo_node", "act_node_update"),
  edge("TRIGGERS", "cmp_nexo_node", "act_node_delete"),
  edge("TRIGGERS", "cmp_nexo_edge", "act_edge_create"),
  edge("TRIGGERS", "cmp_nexo_edge", "act_edge_list"),
  edge("TRIGGERS", "cmp_nexo_traverse", "act_traverse_graph"),
  edge("TRIGGERS", "cmp_nexo_impact", "act_analyze_impact"),
  edge("TRIGGERS", "cmp_nexo_ingest", "act_run_ingest"),
];

// ── READS (APIEndpoint → DataEntity) ────────────────────────

const readsEdges: CreateEdgeInput[] = [
  // MCP read tools → data
  edge("READS", "api_mcp_get_node", "ent_node_table"),
  edge("READS", "api_mcp_list_nodes", "ent_node_table"),
  edge("READS", "api_mcp_list_edges", "ent_edge_table"),
  edge("READS", "api_mcp_app_list", "ent_node_table"),
  edge("READS", "api_mcp_app_overview", "ent_node_table"),
  edge("READS", "api_mcp_app_overview", "ent_edge_table"),
  edge("READS", "api_mcp_feature_list", "ent_node_table"),
  edge("READS", "api_mcp_feature_scope", "ent_node_table"),
  edge("READS", "api_mcp_feature_scope", "ent_edge_table"),
  edge("READS", "api_mcp_traverse", "ent_node_table"),
  edge("READS", "api_mcp_traverse", "ent_edge_table"),
  edge("READS", "api_mcp_impact_analysis", "ent_node_table"),
  edge("READS", "api_mcp_impact_analysis", "ent_edge_table"),
  // Web routes → data
  edge("READS", "api_get_api_graph", "ent_node_table"),
  edge("READS", "api_get_api_graph", "ent_edge_table"),
  edge("READS", "api_get_api_nodes_id", "ent_node_table"),
  edge("READS", "api_get_api_nodes_id_edges", "ent_edge_table"),
  edge("READS", "api_get_api_features", "ent_node_table"),
];

// ── WRITES (APIEndpoint → DataEntity) ───────────────────────

const writesEdges: CreateEdgeInput[] = [
  edge("WRITES", "api_mcp_create_node", "ent_node_table"),
  edge("WRITES", "api_mcp_update_node", "ent_node_table"),
  edge("WRITES", "api_mcp_delete_node", "ent_node_table"),
  edge("WRITES", "api_mcp_delete_node", "ent_edge_table"),
  edge("WRITES", "api_mcp_create_edge", "ent_edge_table"),
  edge("WRITES", "api_mcp_delete_edge", "ent_edge_table"),
];

// ── STORED_IN (DataEntity → InfraResource) ──────────────────

const storedInEdges: CreateEdgeInput[] = [
  edge("STORED_IN", "ent_node_table", "inf_surrealdb"),
  edge("STORED_IN", "ent_edge_table", "inf_surrealdb"),
];

// ── DEPENDS_ON (Feature → Feature) ──────────────────────────

const dependsOnEdges: CreateEdgeInput[] = [
  edge("DEPENDS_ON", "ftr_edge_management", "ftr_node_management"),
  edge("DEPENDS_ON", "ftr_graph_traversal", "ftr_node_management"),
  edge("DEPENDS_ON", "ftr_graph_traversal", "ftr_edge_management"),
  edge("DEPENDS_ON", "ftr_impact_analysis", "ftr_graph_traversal"),
  edge("DEPENDS_ON", "ftr_ingest_pipeline", "ftr_node_management"),
  edge("DEPENDS_ON", "ftr_ingest_pipeline", "ftr_edge_management"),
  edge("DEPENDS_ON", "ftr_spec_validation", "ftr_ingest_pipeline"),
  edge("DEPENDS_ON", "ftr_web_visualization", "ftr_node_management"),
  edge("DEPENDS_ON", "ftr_web_visualization", "ftr_edge_management"),
  edge("DEPENDS_ON", "ftr_mcp_interface", "ftr_node_management"),
  edge("DEPENDS_ON", "ftr_mcp_interface", "ftr_edge_management"),
];

// ── BELONGS_TO (Node → Feature) ─────────────────────────────

const belongsToMap: Record<string, string[]> = {
  ftr_node_management: [
    "cmp_nexo_init", "cmp_nexo_node",
    "act_node_create", "act_node_get", "act_node_list", "act_node_update", "act_node_delete",
    "api_mcp_get_node", "api_mcp_list_nodes", "api_mcp_create_node", "api_mcp_update_node", "api_mcp_delete_node",
    "ent_node_table", "inf_surrealdb",
  ],
  ftr_edge_management: [
    "cmp_nexo_edge",
    "act_edge_create", "act_edge_list",
    "api_mcp_list_edges", "api_mcp_create_edge", "api_mcp_delete_edge",
    "ent_edge_table",
  ],
  ftr_graph_traversal: [
    "cmp_nexo_traverse", "act_traverse_graph",
    "api_mcp_traverse",
  ],
  ftr_impact_analysis: [
    "cmp_nexo_impact", "act_analyze_impact",
    "api_mcp_impact_analysis",
  ],
  ftr_ingest_pipeline: [
    "cmp_nexo_ingest", "act_run_ingest",
  ],
  ftr_spec_validation: [
    "cmp_nexo_validate",
  ],
  ftr_web_visualization: [
    "scr_graph_viewer", "cmp_nexo_web",
    "api_get_graph_viewer", "api_get_api_graph",
    "api_get_api_nodes_id", "api_get_api_nodes_id_edges", "api_get_api_features",
  ],
  ftr_mcp_interface: [
    "cmp_nexo_app", "cmp_nexo_feature",
    "api_mcp_app_list", "api_mcp_app_overview",
    "api_mcp_feature_list", "api_mcp_feature_scope",
  ],
};

// Flatten BELONGS_TO map to edges
const belongsToEdges: CreateEdgeInput[] = [];
for (const [featureId, nodeIds] of Object.entries(belongsToMap)) {
  for (const nodeId of nodeIds) {
    belongsToEdges.push(edge("BELONGS_TO", nodeId, featureId));
  }
}

// ── All edges combined ──────────────────────────────────────

const allEdges: CreateEdgeInput[] = [
  ...triggersEdges,
  ...readsEdges,
  ...writesEdges,
  ...storedInEdges,
  ...dependsOnEdges,
  ...belongsToEdges,
];

// ══════════════════════════════════════════════════════════════
// ORCHESTRATION
// ══════════════════════════════════════════════════════════════

async function main() {
  console.log("Connecting to SurrealDB...");
  const db = await getDb();

  // Step 1: Wipe existing Nexo data
  console.log("Wiping existing Nexo data...");
  await db.query(
    `DELETE edge WHERE in IN (SELECT id FROM node WHERE app = $app) OR out IN (SELECT id FROM node WHERE app = $app)`,
    { app: APP }
  );
  await db.query(`DELETE node WHERE app = $app`, { app: APP });
  console.log("  Wiped.");

  // Step 2: Create all nodes
  const allNodes: CreateNodeInput[] = [
    ...featureNodes,
    ...infraNodes,
    ...entityNodes,
    ...screenNodes,
    ...componentNodes,
    ...actionNodes,
    ...mcpEndpointNodes,
    ...webEndpointNodes,
  ];

  console.log(`\nCreating ${allNodes.length} nodes...`);
  let nodeCount = 0;
  let nodeErrors = 0;
  for (const input of allNodes) {
    try {
      await createNode(db, input);
      nodeCount++;
    } catch (err) {
      nodeErrors++;
      console.error(`  Node error [${input.type}] "${input.name}": ${(err as Error).message}`);
    }
    if ((nodeCount + nodeErrors) % 20 === 0) {
      console.log(`  ${nodeCount} created, ${nodeErrors} errors...`);
    }
  }
  console.log(`  ${nodeCount} nodes created (${nodeErrors} errors).`);

  // Step 3: Create all edges
  console.log(`\nCreating ${allEdges.length} edges...`);
  let edgeCount = 0;
  let edgeErrors = 0;
  for (const input of allEdges) {
    try {
      await createEdge(db, input);
      edgeCount++;
    } catch (err) {
      edgeErrors++;
      console.error(`  Edge error [${input.type}] ${input.from} -> ${input.to}: ${(err as Error).message}`);
    }
    if ((edgeCount + edgeErrors) % 25 === 0) {
      console.log(`  ${edgeCount} created, ${edgeErrors} errors...`);
    }
  }
  console.log(`  ${edgeCount} edges created (${edgeErrors} errors).`);

  // Step 4: Verification
  console.log("\n═══ Verification ═══");

  const [nodeCounts] = await db.query<[any[]]>(
    `SELECT type, count() as cnt FROM node WHERE app = $app GROUP BY type ORDER BY type`,
    { app: APP }
  );
  console.log("\nNode counts by type:");
  let totalNodes = 0;
  for (const row of (nodeCounts ?? [])) {
    console.log(`  ${row.type}: ${row.cnt}`);
    totalNodes += row.cnt;
  }
  console.log(`  TOTAL: ${totalNodes}`);

  const [edgeCounts] = await db.query<[any[]]>(
    `SELECT type, count() as cnt FROM edge WHERE in.app = $app GROUP BY type ORDER BY type`,
    { app: APP }
  );
  console.log("\nEdge counts by type:");
  let totalEdges = 0;
  for (const row of (edgeCounts ?? [])) {
    console.log(`  ${row.type}: ${row.cnt}`);
    totalEdges += row.cnt;
  }
  console.log(`  TOTAL: ${totalEdges}`);

  console.log(`\nSeed complete: ${totalNodes} nodes, ${totalEdges} edges`);

  await closeDb();
}

main().catch(async (err) => {
  console.error("Seed failed:", err);
  await closeDb();
  process.exit(1);
});
