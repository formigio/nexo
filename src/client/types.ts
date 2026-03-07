import type { Node, Edge, CreateNodeInput, CreateEdgeInput } from "../schema/types.js";
import type { TraversalResult, ImpactResult } from "../db/queries.js";
import type { LintReport, Severity, Category } from "../lint/types.js";

// ── Filter / update types ────────────────────────────────────

export interface NodeFilters {
  app?: string;
  type?: string;
  tag?: string;
}

export type NodeUpdates = Partial<Pick<Node, "name" | "description" | "tags" | "props">>;

export interface EdgeFilters {
  type?: string;
  from?: string;
  to?: string;
}

export interface TraverseOptions {
  depth?: number;
  edgeTypes?: string[];
}

export interface LintOptions {
  app?: string;
  rules?: string[];
  severity?: Severity;
  category?: Category;
  skipCustomRules?: boolean;
}

// ── GraphClient interface ────────────────────────────────────

export interface GraphClient {
  // Nodes
  createNode(input: CreateNodeInput): Promise<Node>;
  getNode(id: string): Promise<Node | null>;
  listNodes(filters?: NodeFilters): Promise<Node[]>;
  updateNode(id: string, updates: NodeUpdates): Promise<Node>;
  deleteNode(id: string): Promise<boolean>;

  // Edges
  createEdge(input: CreateEdgeInput): Promise<Edge>;
  listEdges(filters?: EdgeFilters): Promise<Edge[]>;
  deleteEdge(id: string): Promise<boolean>;

  // Queries
  traverse(startId: string, opts?: TraverseOptions): Promise<TraversalResult>;
  impactAnalysis(startId: string, hops?: number): Promise<ImpactResult>;

  // Aggregates
  listApps(): Promise<{ app: string; count: number }[]>;
  appOverview(app: string): Promise<{ nodes: Node[]; edges: Edge[] }>;

  // Admin
  init(): Promise<string[]>;

  // Lifecycle
  close(): Promise<void>;
}
