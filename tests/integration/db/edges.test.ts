import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { getTestDb, cleanTestDb, closeTestDb } from "../../setup/db.js";
import { createNode } from "../../../src/db/nodes.js";
import { createEdge, listEdges, deleteEdge } from "../../../src/db/edges.js";
import {
  makeScreen,
  makeComponent,
  makeDataEntity,
  makeDataField,
  makeFeature,
  makeBusinessRule,
  makeUserAction,
  makeApiEndpoint,
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

describe("createEdge", () => {
  it("creates a valid edge", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    await createNode(db, makeComponent({ name: "Header" }));

    const edge = await createEdge(db, {
      type: "RENDERS",
      from: "scr_home",
      to: "cmp_header",
    });
    expect(edge.type).toBe("RENDERS");
    expect(edge.in).toBe("scr_home");
    expect(edge.out).toBe("cmp_header");
    expect(edge.id).toBeDefined();
  });

  it("stores metadata", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    await createNode(db, makeComponent({ name: "Header" }));

    const edge = await createEdge(db, {
      type: "RENDERS",
      from: "scr_home",
      to: "cmp_header",
      metadata: { conditional: true, priority: 1 },
    });
    expect(edge.metadata).toEqual({ conditional: true, priority: 1 });
  });

  it("rejects edge when source node does not exist", async () => {
    await createNode(db, makeComponent({ name: "Header" }));

    await expect(
      createEdge(db, { type: "RENDERS", from: "scr_nonexistent", to: "cmp_header" })
    ).rejects.toThrow("Source node not found");
  });

  it("rejects edge when target node does not exist", async () => {
    await createNode(db, makeScreen({ name: "Home" }));

    await expect(
      createEdge(db, { type: "RENDERS", from: "scr_home", to: "cmp_nonexistent" })
    ).rejects.toThrow("Target node not found");
  });

  it("rejects edge with invalid source type", async () => {
    // RENDERS only allows Screen → Component
    await createNode(db, makeComponent({ name: "A" }));
    await createNode(db, makeComponent({ name: "B" }));

    await expect(
      createEdge(db, { type: "RENDERS", from: "cmp_a", to: "cmp_b" })
    ).rejects.toThrow("cannot originate from");
  });

  it("rejects edge with invalid target type", async () => {
    // RENDERS: Screen → Component only
    await createNode(db, makeScreen({ name: "Home" }));
    await createNode(db, makeScreen({ name: "Settings" }));

    await expect(
      createEdge(db, { type: "RENDERS", from: "scr_home", to: "scr_settings" })
    ).rejects.toThrow("cannot target");
  });

  it("allows various valid constraint combinations", async () => {
    // HAS_FIELD: DataEntity → DataField
    await createNode(db, makeDataEntity({ name: "User" }));
    await createNode(db, makeDataField({ name: "email" }));
    const edge = await createEdge(db, {
      type: "HAS_FIELD",
      from: "ent_user",
      to: "fld_email",
    });
    expect(edge.type).toBe("HAS_FIELD");

    // BELONGS_TO: Screen → Feature
    await createNode(db, makeScreen({ name: "Home" }));
    await createNode(db, makeFeature({ name: "Dashboard" }));
    const e2 = await createEdge(db, {
      type: "BELONGS_TO",
      from: "scr_home",
      to: "ftr_dashboard",
    });
    expect(e2.type).toBe("BELONGS_TO");
  });
});

describe("listEdges", () => {
  it("lists all edges", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    await createNode(db, makeComponent({ name: "A" }));
    await createNode(db, makeComponent({ name: "B" }));
    await createEdge(db, { type: "RENDERS", from: "scr_home", to: "cmp_a" });
    await createEdge(db, { type: "RENDERS", from: "scr_home", to: "cmp_b" });

    const edges = await listEdges(db);
    expect(edges).toHaveLength(2);
  });

  it("filters by type", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    await createNode(db, makeComponent({ name: "A" }));
    await createNode(db, makeDataEntity({ name: "User" }));
    await createNode(db, makeFeature({ name: "F1" }));
    await createEdge(db, { type: "RENDERS", from: "scr_home", to: "cmp_a" });
    await createEdge(db, { type: "BELONGS_TO", from: "scr_home", to: "ftr_f1" });

    const edges = await listEdges(db, { type: "RENDERS" });
    expect(edges).toHaveLength(1);
    expect(edges[0].type).toBe("RENDERS");
  });

  it("filters by from node", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    await createNode(db, makeScreen({ name: "Settings" }));
    await createNode(db, makeComponent({ name: "A" }));
    await createEdge(db, { type: "RENDERS", from: "scr_home", to: "cmp_a" });
    await createEdge(db, { type: "RENDERS", from: "scr_settings", to: "cmp_a" });

    const edges = await listEdges(db, { from: "scr_home" });
    expect(edges).toHaveLength(1);
    expect(edges[0].in).toBe("scr_home");
  });

  it("filters by to node", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    await createNode(db, makeComponent({ name: "A" }));
    await createNode(db, makeComponent({ name: "B" }));
    await createEdge(db, { type: "RENDERS", from: "scr_home", to: "cmp_a" });
    await createEdge(db, { type: "RENDERS", from: "scr_home", to: "cmp_b" });

    const edges = await listEdges(db, { to: "cmp_a" });
    expect(edges).toHaveLength(1);
    expect(edges[0].out).toBe("cmp_a");
  });

  it("returns empty array when no matches", async () => {
    const edges = await listEdges(db, { type: "RENDERS" });
    expect(edges).toEqual([]);
  });
});

describe("deleteEdge", () => {
  it("deletes an edge by ID", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    await createNode(db, makeComponent({ name: "A" }));
    const edge = await createEdge(db, { type: "RENDERS", from: "scr_home", to: "cmp_a" });

    const result = await deleteEdge(db, edge.id);
    expect(result).toBe(true);

    const edges = await listEdges(db);
    expect(edges).toHaveLength(0);
  });

  it("throws when edge ID does not exist", async () => {
    await expect(deleteEdge(db, "nonexistent_id")).rejects.toThrow("Edge not found: nonexistent_id");
  });
});
