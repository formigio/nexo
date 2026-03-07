import type { Surreal } from "surrealdb";
import type { Node, Edge, CreateNodeInput, CreateEdgeInput } from "../schema/types.js";
import type { TraversalResult, ImpactResult } from "../db/queries.js";
import type {
  GraphClient,
  NodeFilters,
  NodeUpdates,
  EdgeFilters,
  TraverseOptions,
} from "./types.js";
import {
  createNode as dbCreateNode,
  getNode as dbGetNode,
  listNodes as dbListNodes,
  updateNode as dbUpdateNode,
  deleteNode as dbDeleteNode,
} from "../db/nodes.js";
import {
  createEdge as dbCreateEdge,
  listEdges as dbListEdges,
  deleteEdge as dbDeleteEdge,
} from "../db/edges.js";
import {
  traverse as dbTraverse,
  impactAnalysis as dbImpactAnalysis,
} from "../db/queries.js";
import { runMigrations } from "../db/migrate.js";

export class DbGraphClient implements GraphClient {
  constructor(private db: Surreal) {}

  async createNode(input: CreateNodeInput): Promise<Node> {
    return dbCreateNode(this.db, input);
  }

  async getNode(id: string): Promise<Node | null> {
    return dbGetNode(this.db, id);
  }

  async listNodes(filters?: NodeFilters): Promise<Node[]> {
    return dbListNodes(this.db, filters);
  }

  async updateNode(id: string, updates: NodeUpdates): Promise<Node> {
    return dbUpdateNode(this.db, id, updates);
  }

  async deleteNode(id: string): Promise<boolean> {
    return dbDeleteNode(this.db, id);
  }

  async createEdge(input: CreateEdgeInput): Promise<Edge> {
    return dbCreateEdge(this.db, input);
  }

  async listEdges(filters?: EdgeFilters): Promise<Edge[]> {
    return dbListEdges(this.db, filters);
  }

  async deleteEdge(id: string): Promise<boolean> {
    return dbDeleteEdge(this.db, id);
  }

  async traverse(startId: string, opts?: TraverseOptions): Promise<TraversalResult> {
    return dbTraverse(this.db, startId, opts);
  }

  async impactAnalysis(startId: string, hops?: number): Promise<ImpactResult> {
    return dbImpactAnalysis(this.db, startId, hops ?? 3);
  }

  async listApps(): Promise<{ app: string; count: number }[]> {
    const [rows] = await this.db.query<[{ app: string; count: number }[]]>(
      `SELECT app, count() AS count FROM node GROUP BY app ORDER BY app`
    );
    return rows ?? [];
  }

  async appOverview(app: string): Promise<{ nodes: Node[]; edges: Edge[] }> {
    const nodes = await this.listNodes({ app });
    const allEdges = await this.listEdges();
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = allEdges.filter(
      (e) => nodeIds.has(e.in) || nodeIds.has(e.out)
    );
    return { nodes, edges };
  }

  async init(): Promise<string[]> {
    return runMigrations(this.db);
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}
