import type { Node, Edge, CreateNodeInput, CreateEdgeInput } from "../schema/types.js";
import type { TraversalResult, ImpactResult } from "../db/queries.js";
import type { ApiConfig } from "../config/loader.js";
import type {
  GraphClient,
  NodeFilters,
  NodeUpdates,
  EdgeFilters,
  TraverseOptions,
} from "./types.js";

export class HttpGraphClient implements GraphClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config: ApiConfig) {
    this.baseUrl = config.url.replace(/\/$/, "");
    this.headers = { "Content-Type": "application/json" };
    if (config.key) {
      this.headers["x-api-key"] = config.key;
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: this.headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 503) {
      const data = await res.json().catch(() => ({}));
      const msg = (data as any).retryAfterSeconds
        ? `Database is starting up, retry in ${(data as any).retryAfterSeconds} seconds`
        : "Service unavailable — database may be starting up";
      throw new Error(msg);
    }

    if (res.status === 403) {
      throw new Error("Forbidden: check API key and IP allowlist");
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((data as any).error ?? `HTTP ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  // ── Nodes ──────────────────────────────────────────────────

  async createNode(input: CreateNodeInput): Promise<Node> {
    return this.request("POST", "/api/nodes", input);
  }

  async getNode(id: string): Promise<Node | null> {
    try {
      return await this.request("GET", `/api/nodes/${encodeURIComponent(id)}`);
    } catch (err) {
      if ((err as Error).message === "Not found") return null;
      throw err;
    }
  }

  async listNodes(filters?: NodeFilters): Promise<Node[]> {
    const params = new URLSearchParams();
    if (filters?.app) params.set("app", filters.app);
    if (filters?.type) params.set("type", filters.type);
    if (filters?.tag) params.set("tag", filters.tag);
    const qs = params.toString();
    return this.request("GET", `/api/nodes${qs ? `?${qs}` : ""}`);
  }

  async updateNode(id: string, updates: NodeUpdates): Promise<Node> {
    return this.request("PUT", `/api/nodes/${encodeURIComponent(id)}`, updates);
  }

  async deleteNode(id: string): Promise<boolean> {
    await this.request("DELETE", `/api/nodes/${encodeURIComponent(id)}`);
    return true;
  }

  // ── Edges ──────────────────────────────────────────────────

  async createEdge(input: CreateEdgeInput): Promise<Edge> {
    return this.request("POST", "/api/edges", input);
  }

  async listEdges(filters?: EdgeFilters): Promise<Edge[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.set("type", filters.type);
    if (filters?.from) params.set("from", filters.from);
    if (filters?.to) params.set("to", filters.to);
    const qs = params.toString();
    return this.request("GET", `/api/edges${qs ? `?${qs}` : ""}`);
  }

  async deleteEdge(id: string): Promise<boolean> {
    await this.request("DELETE", `/api/edges/${encodeURIComponent(id)}`);
    return true;
  }

  // ── Queries ────────────────────────────────────────────────

  async traverse(startId: string, opts?: TraverseOptions): Promise<TraversalResult> {
    const params = new URLSearchParams();
    if (opts?.depth !== undefined) params.set("depth", String(opts.depth));
    if (opts?.edgeTypes?.length) params.set("edgeTypes", opts.edgeTypes.join(","));
    const qs = params.toString();
    return this.request(
      "GET",
      `/api/traverse/${encodeURIComponent(startId)}${qs ? `?${qs}` : ""}`,
    );
  }

  async impactAnalysis(startId: string, hops?: number): Promise<ImpactResult> {
    const params = new URLSearchParams();
    if (hops !== undefined) params.set("hops", String(hops));
    const qs = params.toString();
    return this.request(
      "GET",
      `/api/impact/${encodeURIComponent(startId)}${qs ? `?${qs}` : ""}`,
    );
  }

  // ── Aggregates ─────────────────────────────────────────────

  async listApps(): Promise<{ app: string; count: number }[]> {
    return this.request("GET", "/api/apps");
  }

  async appOverview(app: string): Promise<{ nodes: Node[]; edges: Edge[] }> {
    const [nodes, allEdges] = await Promise.all([
      this.listNodes({ app }),
      this.listEdges(),
    ]);
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = allEdges.filter(
      (e) => nodeIds.has(e.in) || nodeIds.has(e.out),
    );
    return { nodes, edges };
  }

  // ── Admin ──────────────────────────────────────────────────

  async init(): Promise<string[]> {
    const result = await this.request<{ migrations: string[] }>("POST", "/api/init");
    return result.migrations;
  }

  // ── Lifecycle ──────────────────────────────────────────────

  async close(): Promise<void> {
    // No persistent connection to close for HTTP client
  }
}
