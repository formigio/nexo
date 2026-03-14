import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { getTestDb, cleanTestDb, closeTestDb } from "../../setup/db.js";
import { DbGraphClient } from "../../../src/client/db-client.js";
import {
  makeScreen,
  makeComponent,
  makeFeature,
  makeDataEntity,
} from "../../setup/fixtures.js";
import type { Surreal } from "surrealdb";

let db: Surreal;
let client: DbGraphClient;

beforeAll(async () => {
  db = await getTestDb();
  client = new DbGraphClient(db);
});

beforeEach(async () => {
  await cleanTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

describe("DbGraphClient", () => {
  describe("node operations", () => {
    it("creates and retrieves a node", async () => {
      const created = await client.createNode(makeScreen({ name: "Home" }));
      expect(created.id).toBe("scr_home");

      const fetched = await client.getNode("scr_home");
      expect(fetched).not.toBeNull();
      expect(fetched!.name).toBe("Home");
    });

    it("lists nodes with filters", async () => {
      await client.createNode(makeScreen({ name: "Home" }));
      await client.createNode(makeComponent({ name: "Nav" }));

      const all = await client.listNodes();
      expect(all).toHaveLength(2);

      const screens = await client.listNodes({ type: "Screen" });
      expect(screens).toHaveLength(1);
    });

    it("updates a node", async () => {
      await client.createNode(makeScreen({ name: "Home" }));
      const updated = await client.updateNode("scr_home", { name: "Home Page" });
      expect(updated.name).toBe("Home Page");
      expect(updated.version).toBe(2);
    });

    it("deletes a node", async () => {
      await client.createNode(makeScreen({ name: "Home" }));
      const result = await client.deleteNode("scr_home");
      expect(result).toBe(true);

      const fetched = await client.getNode("scr_home");
      expect(fetched).toBeNull();
    });
  });

  describe("edge operations", () => {
    it("creates and lists edges", async () => {
      await client.createNode(makeScreen({ name: "Home" }));
      await client.createNode(makeComponent({ name: "Header" }));

      const edge = await client.createEdge({
        type: "RENDERS",
        from: "scr_home",
        to: "cmp_header",
      });
      expect(edge.type).toBe("RENDERS");

      const edges = await client.listEdges();
      expect(edges).toHaveLength(1);
    });

    it("filters edges", async () => {
      await client.createNode(makeScreen({ name: "Home" }));
      await client.createNode(makeComponent({ name: "A" }));
      await client.createNode(makeFeature({ name: "F1" }));
      await client.createEdge({ type: "RENDERS", from: "scr_home", to: "cmp_a" });
      await client.createEdge({ type: "BELONGS_TO", from: "scr_home", to: "ftr_f1" });

      const renders = await client.listEdges({ type: "RENDERS" });
      expect(renders).toHaveLength(1);

      const fromHome = await client.listEdges({ from: "scr_home" });
      expect(fromHome).toHaveLength(2);
    });

    it("deletes an edge", async () => {
      await client.createNode(makeScreen({ name: "Home" }));
      await client.createNode(makeComponent({ name: "A" }));
      const edge = await client.createEdge({ type: "RENDERS", from: "scr_home", to: "cmp_a" });

      await client.deleteEdge(edge.id);
      const edges = await client.listEdges();
      expect(edges).toHaveLength(0);
    });
  });

  describe("queries", () => {
    it("traverses the graph", async () => {
      await client.createNode(makeScreen({ name: "Home" }));
      await client.createNode(makeComponent({ name: "Header" }));
      await client.createEdge({ type: "RENDERS", from: "scr_home", to: "cmp_header" });

      const result = await client.traverse("scr_home", { depth: 1 });
      expect(result.nodes.length).toBeGreaterThanOrEqual(2);
      expect(result.edges).toHaveLength(1);
    });

    it("runs impact analysis", async () => {
      await client.createNode(makeScreen({ name: "Home" }));
      await client.createNode(makeComponent({ name: "Header" }));
      await client.createEdge({ type: "RENDERS", from: "scr_home", to: "cmp_header" });

      const result = await client.impactAnalysis("scr_home", 1);
      expect(result.startNode.id).toBe("scr_home");
      expect(result.directImpacts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("aggregates", () => {
    it("lists apps with counts", async () => {
      await client.createNode(makeScreen({ name: "Home", app: "app-a" }));
      await client.createNode(makeScreen({ name: "Settings", app: "app-a" }));
      await client.createNode(makeScreen({ name: "Login", app: "app-b" }));

      const apps = await client.listApps();
      expect(apps).toHaveLength(2);
      const appA = apps.find((a) => a.app === "app-a");
      expect(appA?.count).toBe(2);
    });

    it("returns app overview", async () => {
      await client.createNode(makeScreen({ name: "Home" }));
      await client.createNode(makeComponent({ name: "Header" }));
      await client.createEdge({ type: "RENDERS", from: "scr_home", to: "cmp_header" });

      const overview = await client.appOverview("test-app");
      expect(overview.nodes).toHaveLength(2);
      expect(overview.edges).toHaveLength(1);
    });
  });
});
