import type { Surreal } from "surrealdb";
import { RecordId } from "surrealdb";
import type { Node, Edge } from "../schema/types.js";
import { normalizeNode } from "./nodes.js";
import { normalizeEdge } from "./edges.js";

export interface TraversalResult {
  nodes: Node[];
  edges: Edge[];
  startId: string;
  depth: number;
}

export interface ImpactResult {
  directImpacts: Node[];
  structuralImpacts: Node[];
  edges: Edge[];
  startNode: Node;
  hops: number;
}

/**
 * BFS traversal from a starting node.
 * Follows edges in both directions up to the specified depth.
 */
export async function traverse(
  db: Surreal,
  startId: string,
  options?: { depth?: number; edgeTypes?: string[] }
): Promise<TraversalResult> {
  const depth = options?.depth ?? 2;

  // Build edge type filter
  const typeFilter = options?.edgeTypes?.length
    ? `AND type IN [${options.edgeTypes.map((t) => `"${t}"`).join(", ")}]`
    : "";

  // BFS by querying each hop level
  const visitedNodes = new Map<string, Node>();
  const collectedEdges = new Map<string, Edge>();
  let frontier = new Set([startId]);
  const visited = new Set([startId]);

  for (let d = 0; d < depth && frontier.size > 0; d++) {
    const frontierIds = [...frontier];
    const nextFrontier = new Set<string>();

    // Query edges connected to frontier nodes (both directions)
    for (const nodeId of frontierIds) {
      const rid = new RecordId("node", nodeId);
      const [outEdges] = await db.query<[any[]]>(
        `SELECT * FROM edge WHERE in = $rid ${typeFilter}`,
        { rid }
      );
      const [inEdges] = await db.query<[any[]]>(
        `SELECT * FROM edge WHERE out = $rid ${typeFilter}`,
        { rid }
      );

      for (const edge of [...(outEdges ?? []), ...(inEdges ?? [])]) {
        const ne = normalizeEdge(edge);
        if (!collectedEdges.has(ne.id)) {
          collectedEdges.set(ne.id, ne);
        }

        // Add connected nodes to next frontier
        for (const connId of [ne.in, ne.out]) {
          if (!visited.has(connId)) {
            visited.add(connId);
            nextFrontier.add(connId);
          }
        }
      }
    }

    // Fetch newly discovered nodes
    for (const nodeId of nextFrontier) {
      const [results] = await db.query<[any[]]>(
        `SELECT * FROM type::record("node", $id)`,
        { id: nodeId }
      );
      if (results?.[0]) {
        visitedNodes.set(nodeId, normalizeNode(results[0]));
      }
    }

    frontier = nextFrontier;
  }

  // Fetch the start node
  const [startResults] = await db.query<[any[]]>(
    `SELECT * FROM type::record("node", $id)`,
    { id: startId }
  );
  if (startResults?.[0]) {
    visitedNodes.set(startId, normalizeNode(startResults[0]));
  }

  return {
    nodes: Array.from(visitedNodes.values()),
    edges: Array.from(collectedEdges.values()),
    startId,
    depth,
  };
}

/**
 * Impact analysis: find all nodes affected by a change to the given node.
 * Uses multi-hop BFS in both directions.
 */
export async function impactAnalysis(
  db: Surreal,
  startId: string,
  hops: number = 3
): Promise<ImpactResult> {
  const result = await traverse(db, startId, { depth: hops });

  // Separate direct (1-hop) vs structural (multi-hop) impacts
  const directEdges = result.edges.filter(
    (e) => e.in === startId || e.out === startId
  );
  const directNodeIds = new Set<string>();
  for (const e of directEdges) {
    directNodeIds.add(e.in);
    directNodeIds.add(e.out);
  }
  directNodeIds.delete(startId);

  const directImpacts = result.nodes.filter((n) => directNodeIds.has(n.id));
  const structuralImpacts = result.nodes.filter(
    (n) => !directNodeIds.has(n.id) && n.id !== startId
  );

  const startNode = result.nodes.find((n) => n.id === startId);
  if (!startNode) throw new Error(`Node not found: ${startId}`);

  return {
    directImpacts,
    structuralImpacts,
    edges: result.edges,
    startNode,
    hops,
  };
}
