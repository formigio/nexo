import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import { getTestDb, cleanTestDb, closeTestDb } from "../../setup/db.js";
import { createHandler } from "../../../src/web/routes.js";
import { makeScreen, makeComponent, makeFeature } from "../../setup/fixtures.js";
import { createNode } from "../../../src/db/nodes.js";
import { createEdge } from "../../../src/db/edges.js";
import type { Surreal } from "surrealdb";

let db: Surreal;
let server: Server;
let baseUrl: string;

async function request(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<{ status: number; data: any }> {
  const { method = "GET", body } = options;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

beforeAll(async () => {
  db = await getTestDb();
  const handler = createHandler(db);

  await new Promise<void>((resolve) => {
    server = createServer((req, res) => {
      handler(req, res).catch((err) => {
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: String(err) }));
        }
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

beforeEach(async () => {
  await cleanTestDb();
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await closeTestDb();
});

describe("POST /api/nodes", () => {
  it("creates a node (201)", async () => {
    const { status, data } = await request("/api/nodes", {
      method: "POST",
      body: makeScreen({ name: "Home" }),
    });
    expect(status).toBe(201);
    expect(data.id).toBe("scr_home");
    expect(data.type).toBe("Screen");
  });

  it("returns 400 for invalid props", async () => {
    const { status, data } = await request("/api/nodes", {
      method: "POST",
      body: { type: "Screen", app: "test", name: "Bad", props: { route: 123 } },
    });
    expect(status).toBe(400);
    expect(data.error).toBeDefined();
  });
});

describe("GET /api/nodes", () => {
  it("lists all nodes", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    await createNode(db, makeComponent({ name: "Nav" }));

    const { status, data } = await request("/api/nodes");
    expect(status).toBe(200);
    expect(data).toHaveLength(2);
  });

  it("filters by app", async () => {
    await createNode(db, makeScreen({ name: "Home", app: "app-a" }));
    await createNode(db, makeScreen({ name: "Other", app: "app-b" }));

    const { data } = await request("/api/nodes?app=app-a");
    expect(data).toHaveLength(1);
    expect(data[0].app).toBe("app-a");
  });

  it("filters by type", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    await createNode(db, makeComponent({ name: "Nav" }));

    const { data } = await request("/api/nodes?type=Component");
    expect(data).toHaveLength(1);
    expect(data[0].type).toBe("Component");
  });
});

describe("GET /api/nodes/:id", () => {
  it("returns a single node", async () => {
    await createNode(db, makeScreen({ name: "Home" }));

    const { status, data } = await request("/api/nodes/scr_home");
    expect(status).toBe(200);
    expect(data.name).toBe("Home");
  });

  it("returns 404 for non-existent node", async () => {
    const { status } = await request("/api/nodes/scr_nonexistent");
    expect(status).toBe(404);
  });
});

describe("PUT /api/nodes/:id", () => {
  it("updates a node", async () => {
    await createNode(db, makeScreen({ name: "Home" }));

    const { status, data } = await request("/api/nodes/scr_home", {
      method: "PUT",
      body: { name: "Home Page" },
    });
    expect(status).toBe(200);
    expect(data.name).toBe("Home Page");
    expect(data.version).toBe(2);
  });

  it("returns 400 for non-existent node", async () => {
    const { status } = await request("/api/nodes/scr_nope", {
      method: "PUT",
      body: { name: "X" },
    });
    expect(status).toBe(400);
  });
});

describe("DELETE /api/nodes/:id", () => {
  it("deletes a node", async () => {
    await createNode(db, makeScreen({ name: "Home" }));

    const { status, data } = await request("/api/nodes/scr_home", {
      method: "DELETE",
    });
    expect(status).toBe(200);
    expect(data.ok).toBe(true);
  });
});

describe("POST /api/edges", () => {
  it("creates an edge (201)", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    await createNode(db, makeComponent({ name: "Nav" }));

    const { status, data } = await request("/api/edges", {
      method: "POST",
      body: { type: "RENDERS", from: "scr_home", to: "cmp_nav" },
    });
    expect(status).toBe(201);
    expect(data.type).toBe("RENDERS");
  });

  it("returns 400 for constraint violation", async () => {
    await createNode(db, makeComponent({ name: "A" }));
    await createNode(db, makeComponent({ name: "B" }));

    const { status, data } = await request("/api/edges", {
      method: "POST",
      body: { type: "RENDERS", from: "cmp_a", to: "cmp_b" },
    });
    expect(status).toBe(400);
    expect(data.error).toContain("cannot originate from");
  });
});

describe("GET /api/edges", () => {
  it("lists edges with filters", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    await createNode(db, makeComponent({ name: "A" }));
    await createNode(db, makeFeature({ name: "F1" }));
    await createEdge(db, { type: "RENDERS", from: "scr_home", to: "cmp_a" });
    await createEdge(db, { type: "BELONGS_TO", from: "scr_home", to: "ftr_f1" });

    const { data: all } = await request("/api/edges");
    expect(all).toHaveLength(2);

    const { data: renders } = await request("/api/edges?type=RENDERS");
    expect(renders).toHaveLength(1);
  });
});

describe("DELETE /api/edges/:id", () => {
  it("deletes an edge", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    await createNode(db, makeComponent({ name: "A" }));
    const edge = await createEdge(db, { type: "RENDERS", from: "scr_home", to: "cmp_a" });

    const { status, data } = await request(`/api/edges/${edge.id}`, {
      method: "DELETE",
    });
    expect(status).toBe(200);
    expect(data.ok).toBe(true);
  });
});

describe("GET /api/graph", () => {
  it("returns nodes and edges", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    await createNode(db, makeComponent({ name: "A" }));
    await createEdge(db, { type: "RENDERS", from: "scr_home", to: "cmp_a" });

    const { status, data } = await request("/api/graph?app=test-app");
    expect(status).toBe(200);
    expect(data.nodes).toHaveLength(2);
    expect(data.edges).toHaveLength(1);
  });
});

describe("GET /api/apps", () => {
  it("returns app list with counts", async () => {
    await createNode(db, makeScreen({ name: "Home", app: "app-a" }));
    await createNode(db, makeScreen({ name: "Other", app: "app-a" }));
    await createNode(db, makeScreen({ name: "Login", app: "app-b" }));

    const { data } = await request("/api/apps");
    expect(data).toHaveLength(2);
    const appA = data.find((a: any) => a.app === "app-a");
    expect(appA.count).toBe(2);
  });
});

describe("GET /api/traverse/:id", () => {
  it("traverses from a node", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    await createNode(db, makeComponent({ name: "A" }));
    await createEdge(db, { type: "RENDERS", from: "scr_home", to: "cmp_a" });

    const { status, data } = await request("/api/traverse/scr_home?depth=1");
    expect(status).toBe(200);
    expect(data.startId).toBe("scr_home");
    expect(data.nodes.length).toBeGreaterThanOrEqual(2);
  });
});

describe("GET /api/impact/:id", () => {
  it("returns impact analysis", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    await createNode(db, makeComponent({ name: "A" }));
    await createEdge(db, { type: "RENDERS", from: "scr_home", to: "cmp_a" });

    const { status, data } = await request("/api/impact/scr_home?hops=1");
    expect(status).toBe(200);
    expect(data.startNode.id).toBe("scr_home");
    expect(data.directImpacts.length).toBeGreaterThanOrEqual(1);
  });
});

describe("GET /api/nodes/search", () => {
  it("searches nodes by query", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    await createNode(db, makeScreen({ name: "Settings" }));

    const { data } = await request("/api/nodes/search?q=home");
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Home");
  });

  it("returns all nodes when no query", async () => {
    await createNode(db, makeScreen({ name: "Home" }));
    await createNode(db, makeScreen({ name: "Settings" }));

    const { data } = await request("/api/nodes/search");
    expect(data).toHaveLength(2);
  });
});

describe("404 handling", () => {
  it("returns 404 for unknown routes", async () => {
    const { status } = await request("/api/unknown");
    expect(status).toBe(404);
  });
});
