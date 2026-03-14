import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { getTestDb, cleanTestDb, closeTestDb } from "../../setup/db.js";
import { createNode, getNode, listNodes, updateNode, deleteNode } from "../../../src/db/nodes.js";
import { makeScreen, makeComponent, makeDataEntity } from "../../setup/fixtures.js";
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

describe("createNode", () => {
  it("creates a node and returns normalized result", async () => {
    const node = await createNode(db, makeScreen({ name: "Home" }));
    expect(node.id).toBe("scr_home");
    expect(node.type).toBe("Screen");
    expect(node.app).toBe("test-app");
    expect(node.name).toBe("Home");
    expect(node.version).toBe(1);
    expect(node.props).toMatchObject({ route: "/test" });
  });

  it("generates deterministic ID from type + name", async () => {
    const node = await createNode(db, makeScreen({ name: "My Dashboard" }));
    expect(node.id).toBe("scr_my_dashboard");
  });

  it("uses provided ID when given", async () => {
    const node = await createNode(db, makeScreen({ id: "custom_id", name: "Custom" }));
    expect(node.id).toBe("custom_id");
  });

  it("validates type-specific props via Zod", async () => {
    await expect(
      createNode(db, {
        type: "Screen",
        app: "test-app",
        name: "Bad",
        props: { route: 123 }, // route should be string
      })
    ).rejects.toThrow();
  });

  it("upserts on duplicate ID", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    const updated = await createNode(db, makeScreen({ name: "Home", description: "updated" }));
    expect(updated.id).toBe("scr_home");
    expect(updated.description).toBe("updated");
  });

  it("stores description when provided", async () => {
    const node = await createNode(db, makeScreen({ name: "About", description: "About page" }));
    expect(node.description).toBe("About page");
  });
});

describe("getNode", () => {
  it("returns a node by ID", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    const node = await getNode(db, "scr_home");
    expect(node).not.toBeNull();
    expect(node!.name).toBe("Home");
  });

  it("returns null for non-existent ID", async () => {
    const node = await getNode(db, "scr_nonexistent");
    expect(node).toBeNull();
  });
});

describe("listNodes", () => {
  it("lists all nodes", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    await createNode(db, makeComponent({ name: "Header" }));
    const nodes = await listNodes(db);
    expect(nodes).toHaveLength(2);
  });

  it("filters by app", async () => {
    await createNode(db, makeScreen({ name: "Home", app: "app-a" }));
    await createNode(db, makeScreen({ name: "Settings", app: "app-b" }));
    const nodes = await listNodes(db, { app: "app-a" });
    expect(nodes).toHaveLength(1);
    expect(nodes[0].app).toBe("app-a");
  });

  it("filters by type", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    await createNode(db, makeComponent({ name: "Header" }));
    const nodes = await listNodes(db, { type: "Component" });
    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe("Component");
  });

  it("filters by tag", async () => {
    await createNode(db, makeScreen({ name: "Home", tags: ["core"] }));
    await createNode(db, makeScreen({ name: "Settings", tags: ["admin"] }));
    const nodes = await listNodes(db, { tag: "core" });
    expect(nodes).toHaveLength(1);
    expect(nodes[0].name).toBe("Home");
  });

  it("returns empty array when no matches", async () => {
    const nodes = await listNodes(db, { app: "nonexistent" });
    expect(nodes).toEqual([]);
  });
});

describe("updateNode", () => {
  it("updates name and bumps version", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    const updated = await updateNode(db, "scr_home", { name: "Home Page" });
    expect(updated.name).toBe("Home Page");
    expect(updated.version).toBe(2);
  });

  it("updates description", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    const updated = await updateNode(db, "scr_home", { description: "Main page" });
    expect(updated.description).toBe("Main page");
  });

  it("updates tags", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    const updated = await updateNode(db, "scr_home", { tags: ["core", "v2"] });
    expect(updated.tags).toEqual(["core", "v2"]);
  });

  it("validates props on update", async () => {
    await createNode(db, makeComponent({ name: "Header" }));
    // componentType must be a valid enum value
    await expect(
      updateNode(db, "cmp_header", {
        props: { componentType: "invalid" },
      })
    ).rejects.toThrow();
  });

  it("merges props with existing", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    const updated = await updateNode(db, "scr_home", {
      props: { route: "/home-new" },
    });
    expect(updated.props).toMatchObject({ route: "/home-new" });
  });

  it("throws for non-existent node", async () => {
    await expect(
      updateNode(db, "scr_nonexistent", { name: "X" })
    ).rejects.toThrow("Node not found");
  });
});

describe("deleteNode", () => {
  it("deletes a node", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    const result = await deleteNode(db, "scr_home");
    expect(result).toBe(true);
    const node = await getNode(db, "scr_home");
    expect(node).toBeNull();
  });

  it("deletes connected edges when node is deleted", async () => {
    const { createEdge, listEdges } = await import("../../../src/db/edges.js");
    await createNode(db, makeScreen({ name: "Home" }));
    await createNode(db, makeComponent({ name: "Header" }));
    await createEdge(db, { type: "RENDERS", from: "scr_home", to: "cmp_header" });

    await deleteNode(db, "scr_home");
    const edges = await listEdges(db);
    expect(edges).toHaveLength(0);
  });
});
