import type { IncomingMessage, ServerResponse } from "node:http";
import type { Surreal } from "surrealdb";
import { ZodError } from "zod";
import { createNode, listNodes, getNode, updateNode, deleteNode, normalizeNode } from "../db/nodes.js";
import { createEdge, listEdges, deleteEdge } from "../db/edges.js";
import { traverse, impactAnalysis } from "../db/queries.js";
import { initDb } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";

// ── Helpers ──

function cors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key, Authorization");
}

function json(res: ServerResponse, data: unknown, status = 200): void {
  const body = JSON.stringify(data);
  cors(res);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function notFound(res: ServerResponse): void {
  json(res, { error: "Not found" }, 404);
}

function serverError(res: ServerResponse, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  json(res, { error: message }, 500);
}

function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf-8");
      if (!raw) { resolve({}); return; }
      try { resolve(JSON.parse(raw)); }
      catch { reject(new Error("Invalid JSON body")); }
    });
    req.on("error", reject);
  });
}

// ── Route handler ──

export function createHandler(db: Surreal, defaultApp?: string) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const pathname = url.pathname;
    const method = req.method ?? "GET";

    try {
      // OPTIONS — CORS preflight
      if (method === "OPTIONS") {
        cors(res);
        res.writeHead(204);
        res.end();
        return;
      }

      // ── POST /api/init ──
      if (method === "POST" && pathname === "/api/init") {
        const freshDb = await initDb();
        const migrations = await runMigrations(freshDb);
        json(res, { migrations });
        return;
      }

      // ── POST /api/nodes ──
      if (method === "POST" && pathname === "/api/nodes") {
        const body = await parseBody(req) as any;
        const node = await createNode(db, body);
        json(res, node, 201);
        return;
      }

      // ── PUT /api/nodes/:id ──
      const nodeUpdateMatch = pathname.match(/^\/api\/nodes\/([^/]+)$/);
      if (method === "PUT" && nodeUpdateMatch) {
        const id = decodeURIComponent(nodeUpdateMatch[1]);
        const body = await parseBody(req) as any;
        const node = await updateNode(db, id, body);
        json(res, node);
        return;
      }

      // ── DELETE /api/nodes/:id ──
      const nodeDeleteMatch = pathname.match(/^\/api\/nodes\/([^/]+)$/);
      if (method === "DELETE" && nodeDeleteMatch) {
        const id = decodeURIComponent(nodeDeleteMatch[1]);
        await deleteNode(db, id);
        json(res, { ok: true });
        return;
      }

      // ── POST /api/edges ──
      if (method === "POST" && pathname === "/api/edges") {
        const body = await parseBody(req) as any;
        const edge = await createEdge(db, body);
        json(res, edge, 201);
        return;
      }

      // ── DELETE /api/edges/:id ──
      const edgeDeleteMatch = pathname.match(/^\/api\/edges\/([^/]+)$/);
      if (method === "DELETE" && edgeDeleteMatch) {
        const id = decodeURIComponent(edgeDeleteMatch[1]);
        await deleteEdge(db, id);
        json(res, { ok: true });
        return;
      }

      // ── GET /api/edges?type=&from=&to= ──
      if (method === "GET" && pathname === "/api/edges") {
        const type = url.searchParams.get("type") ?? undefined;
        const from = url.searchParams.get("from") ?? undefined;
        const to = url.searchParams.get("to") ?? undefined;
        const edges = await listEdges(db, { type, from, to });
        json(res, edges);
        return;
      }

      // GET /api/graph?app= — full graph data
      if (method === "GET" && pathname === "/api/graph") {
        const app = url.searchParams.get("app") ?? defaultApp;
        const filters = app ? { app } : undefined;

        const nodes = await listNodes(db, filters);
        const allEdges = await listEdges(db);

        // Filter edges to only include those connecting visible nodes
        const nodeIds = new Set(nodes.map((n) => n.id));
        const edges = allEdges.filter(
          (e) => nodeIds.has(e.in) && nodeIds.has(e.out)
        );

        json(res, { nodes, edges });
        return;
      }

      // GET /api/nodes/search?q=&app=&type= — typeahead node search
      if (method === "GET" && pathname === "/api/nodes/search") {
        const q = (url.searchParams.get("q") ?? "").toLowerCase();
        const app = url.searchParams.get("app") ?? defaultApp;
        const typeParam = url.searchParams.get("type");

        const filters: { app?: string; type?: string } = {};
        if (app) filters.app = app;
        if (typeParam) filters.type = typeParam;

        const allNodes = await listNodes(db, filters);
        const matches = q
          ? allNodes.filter(
              (n) =>
                n.name.toLowerCase().includes(q) ||
                n.id.toLowerCase().includes(q)
            )
          : allNodes;

        // Return top 30, sorted by name length (shorter = more relevant)
        matches.sort((a, b) => a.name.length - b.name.length);
        json(res, matches.slice(0, 30));
        return;
      }

      // GET /api/nodes/:id — single node
      const nodeMatch = pathname.match(/^\/api\/nodes\/([^/]+)$/);
      if (method === "GET" && nodeMatch) {
        const id = decodeURIComponent(nodeMatch[1]);

        const node = await getNode(db, id);
        if (!node) {
          notFound(res);
          return;
        }
        json(res, node);
        return;
      }

      // GET /api/nodes/:id/edges — edges for a node
      const edgesMatch = pathname.match(/^\/api\/nodes\/([^/]+)\/edges$/);
      if (method === "GET" && edgesMatch) {
        const id = decodeURIComponent(edgesMatch[1]);

        const [fromEdges, toEdges] = await Promise.all([
          listEdges(db, { from: id }),
          listEdges(db, { to: id }),
        ]);

        // Dedupe by edge id
        const seen = new Set<string>();
        const edges = [...fromEdges, ...toEdges].filter((e) => {
          if (seen.has(e.id)) return false;
          seen.add(e.id);
          return true;
        });

        json(res, edges);
        return;
      }

      // GET /api/apps — list apps with node counts
      if (method === "GET" && pathname === "/api/apps") {
        const [rows] = await db.query<[{ app: string; count: number }[]]>(
          `SELECT app, count() AS count FROM node GROUP BY app ORDER BY app`
        );
        json(res, rows ?? []);
        return;
      }

      // GET /api/features/summary?app= — features with scope node counts
      if (method === "GET" && pathname === "/api/features/summary") {
        const app = url.searchParams.get("app") ?? defaultApp;
        const filters: { app?: string; type: string } = { type: "Feature" };
        if (app) filters.app = app;

        const [features, belongsToEdges, allNodes] = await Promise.all([
          listNodes(db, filters),
          listEdges(db, { type: "BELONGS_TO" }),
          listNodes(db, app ? { app } : undefined),
        ]);

        const featureIds = new Set(features.map((f) => f.id));
        const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

        // Build scope counts per feature
        const summaries = features.map((f) => {
          const memberEdges = belongsToEdges.filter(
            (e) => e.out === f.id && featureIds.has(f.id)
          );
          const typeCounts: Record<string, number> = {};
          for (const e of memberEdges) {
            const memberNode = nodeMap.get(e.in);
            if (memberNode) {
              typeCounts[memberNode.type] = (typeCounts[memberNode.type] ?? 0) + 1;
            }
          }
          return {
            ...f,
            scopeCounts: typeCounts,
            scopeTotal: memberEdges.length,
          };
        });

        json(res, summaries);
        return;
      }

      // GET /api/features/:id/scope — feature + belonging nodes + internal edges
      const featureScopeMatch = pathname.match(
        /^\/api\/features\/([^/]+)\/scope$/
      );
      if (method === "GET" && featureScopeMatch) {
        const id = decodeURIComponent(featureScopeMatch[1]);

        const feature = await getNode(db, id);
        if (!feature) {
          notFound(res);
          return;
        }

        // Get all BELONGS_TO edges pointing to this feature
        const belongsToEdges = await listEdges(db, { type: "BELONGS_TO" });
        const memberEdges = belongsToEdges.filter((e) => e.out === id);
        const memberIds = memberEdges.map((e) => e.in);

        // Fetch all member nodes
        let members: typeof feature[] = [];
        if (memberIds.length > 0) {
          const recordIds = memberIds
            .map((mid) => `type::record("node", "${mid}")`)
            .join(", ");
          const [results] = await db.query<[any[]]>(
            `SELECT * FROM node WHERE id IN [${recordIds}]`
          );
          members = (results ?? []).map(normalizeNode);
        }

        // Get all edges between member nodes (internal flow)
        const scopeNodeIds = new Set([id, ...memberIds]);
        const allEdges = await listEdges(db);
        const internalEdges = allEdges.filter(
          (e) =>
            scopeNodeIds.has(e.in) &&
            scopeNodeIds.has(e.out) &&
            e.type !== "BELONGS_TO"
        );

        json(res, {
          feature,
          members,
          edges: internalEdges,
          belongsToEdges: memberEdges,
        });
        return;
      }

      // GET /api/features?app= — list feature nodes
      if (method === "GET" && pathname === "/api/features") {
        const app = url.searchParams.get("app") ?? defaultApp;
        const filters: { app?: string; type: string } = { type: "Feature" };
        if (app) filters.app = app;

        const features = await listNodes(db, filters);
        json(res, features);
        return;
      }

      // GET /api/screens?app= — screen tree (screens + CHILD_OF edges)
      if (method === "GET" && pathname === "/api/screens") {
        const app = url.searchParams.get("app") ?? defaultApp;
        const filters: { app?: string; type: string } = { type: "Screen" };
        if (app) filters.app = app;

        const [screens, childEdges] = await Promise.all([
          listNodes(db, filters),
          listEdges(db, { type: "CHILD_OF" }),
        ]);

        // Filter CHILD_OF edges to only those connecting returned screens
        const screenIds = new Set(screens.map((s) => s.id));
        const filteredEdges = childEdges.filter(
          (e) => screenIds.has(e.in) && screenIds.has(e.out)
        );

        json(res, { screens, childEdges: filteredEdges });
        return;
      }

      // GET /api/nodes — list or batch fetch
      if (method === "GET" && pathname === "/api/nodes") {
        const ids = url.searchParams.getAll("ids");
        if (ids.length > 0) {
          // Batch fetch by IDs
          const recordIds = ids.map((id) => `type::record("node", "${id}")`).join(", ");
          const [results] = await db.query<[any[]]>(
            `SELECT * FROM node WHERE id IN [${recordIds}]`
          );
          const nodes = (results ?? []).map(normalizeNode);
          json(res, nodes);
          return;
        }

        // Filtered listing
        const app = url.searchParams.get("app") ?? undefined;
        const type = url.searchParams.get("type") ?? undefined;
        const tag = url.searchParams.get("tag") ?? undefined;
        const nodes = await listNodes(db, { app, type, tag });
        json(res, nodes);
        return;
      }

      // GET /api/traverse/:id?depth=&edgeTypes= — BFS traversal
      const traverseMatch = pathname.match(/^\/api\/traverse\/([^/]+)$/);
      if (method === "GET" && traverseMatch) {
        const id = decodeURIComponent(traverseMatch[1]);
        const depth = parseInt(url.searchParams.get("depth") ?? "2", 10);
        const edgeTypesParam = url.searchParams.get("edgeTypes");
        const edgeTypes = edgeTypesParam ? edgeTypesParam.split(",") : undefined;

        const result = await traverse(db, id, { depth, edgeTypes });
        json(res, result);
        return;
      }

      // GET /api/impact/:id?hops= — impact analysis
      const impactMatch = pathname.match(/^\/api\/impact\/([^/]+)$/);
      if (method === "GET" && impactMatch) {
        const id = decodeURIComponent(impactMatch[1]);
        const hops = parseInt(url.searchParams.get("hops") ?? "3", 10);

        const result = await impactAnalysis(db, id, hops);
        json(res, result);
        return;
      }

      notFound(res);
    } catch (err) {
      // Validation / constraint errors → 400
      if (err instanceof ZodError) {
        json(res, { error: err.issues }, 400);
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith("Edge not found:")) {
        json(res, { error: msg }, 404);
        return;
      }
      if (
        msg.includes("not found:") ||
        msg.includes("cannot originate from") ||
        msg.includes("cannot target") ||
        msg.includes("Invalid JSON body")
      ) {
        json(res, { error: msg }, 400);
        return;
      }
      console.error("Route error:", err);
      serverError(res, err);
    }
  };
}
