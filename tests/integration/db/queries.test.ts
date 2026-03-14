import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { getTestDb, cleanTestDb, closeTestDb } from "../../setup/db.js";
import { createNode } from "../../../src/db/nodes.js";
import { createEdge } from "../../../src/db/edges.js";
import { traverse, impactAnalysis } from "../../../src/db/queries.js";
import {
  makeScreen,
  makeComponent,
  makeDataEntity,
  makeDataField,
  makeFeature,
  makeApiEndpoint,
  makeUserAction,
} from "../../setup/fixtures.js";
import type { Surreal } from "surrealdb";

let db: Surreal;

beforeAll(async () => {
  db = await getTestDb();
});

beforeEach(async () => {
  await cleanTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

// Helper to build a small graph:
// Screen(Home) -RENDERS-> Component(Header) -BELONGS_TO-> Feature(Dashboard)
// Screen(Home) -BELONGS_TO-> Feature(Dashboard)
async function buildSmallGraph() {
  await createNode(db, makeScreen({ name: "Home" }));
  await createNode(db, makeComponent({ name: "Header" }));
  await createNode(db, makeFeature({ name: "Dashboard" }));

  await createEdge(db, { type: "RENDERS", from: "scr_home", to: "cmp_header" });
  await createEdge(db, { type: "BELONGS_TO", from: "cmp_header", to: "ftr_dashboard" });
  await createEdge(db, { type: "BELONGS_TO", from: "scr_home", to: "ftr_dashboard" });
}

describe("traverse", () => {
  it("returns start node and direct neighbors at depth 1", async () => {
    await buildSmallGraph();

    const result = await traverse(db, "scr_home", { depth: 1 });
    expect(result.startId).toBe("scr_home");
    expect(result.depth).toBe(1);

    const nodeIds = result.nodes.map((n) => n.id).sort();
    expect(nodeIds).toContain("scr_home");
    expect(nodeIds).toContain("cmp_header");
    expect(nodeIds).toContain("ftr_dashboard");
    expect(result.edges.length).toBeGreaterThanOrEqual(2);
  });

  it("follows edges in both directions", async () => {
    await buildSmallGraph();

    // Traverse from Component — should find Screen (incoming RENDERS) and Feature (outgoing BELONGS_TO)
    const result = await traverse(db, "cmp_header", { depth: 1 });
    const nodeIds = result.nodes.map((n) => n.id);
    expect(nodeIds).toContain("scr_home");
    expect(nodeIds).toContain("ftr_dashboard");
  });

  it("respects depth limit", async () => {
    // Chain: Screen → Component → Feature (via BELONGS_TO)
    await buildSmallGraph();

    // Depth 0 should return only start node
    const result = await traverse(db, "scr_home", { depth: 0 });
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe("scr_home");
    expect(result.edges).toHaveLength(0);
  });

  it("filters by edge types", async () => {
    await buildSmallGraph();

    // Only follow RENDERS edges
    const result = await traverse(db, "scr_home", {
      depth: 2,
      edgeTypes: ["RENDERS"],
    });
    const nodeIds = result.nodes.map((n) => n.id);
    expect(nodeIds).toContain("cmp_header");
    // Feature should NOT be reached (BELONGS_TO is filtered out)
    expect(nodeIds).not.toContain("ftr_dashboard");
  });

  it("defaults to depth 2", async () => {
    await buildSmallGraph();
    const result = await traverse(db, "scr_home");
    expect(result.depth).toBe(2);
  });
});

describe("impactAnalysis", () => {
  it("separates direct and structural impacts", async () => {
    // Build a longer chain: Screen → Component → Feature → (nothing more)
    await buildSmallGraph();

    const result = await impactAnalysis(db, "scr_home", 2);
    expect(result.startNode.id).toBe("scr_home");
    expect(result.hops).toBe(2);

    // Direct impacts are 1-hop neighbors
    const directIds = result.directImpacts.map((n) => n.id).sort();
    expect(directIds).toContain("cmp_header");
    expect(directIds).toContain("ftr_dashboard");
  });

  it("throws for non-existent start node", async () => {
    await expect(impactAnalysis(db, "scr_nonexistent", 1)).rejects.toThrow(
      "Node not found"
    );
  });

  it("returns empty impacts for isolated node", async () => {
    await createNode(db, makeScreen({ name: "Lonely" }));

    const result = await impactAnalysis(db, "scr_lonely", 3);
    expect(result.directImpacts).toHaveLength(0);
    expect(result.structuralImpacts).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });
});
