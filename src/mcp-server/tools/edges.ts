import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Surreal } from "surrealdb";
import { z } from "zod";
import { listEdges, createEdge, deleteEdge } from "../../db/edges.js";
import type { Edge } from "../../schema/types.js";
import { EDGE_TYPES } from "../../schema/types.js";

function formatEdge(edge: Edge): string {
  return `${edge.in} ─${edge.type}→ ${edge.out}`;
}

function formatEdgeTable(edges: Edge[]): string {
  if (edges.length === 0) return "No edges found.";

  const lines: string[] = [];
  for (const edge of edges) {
    lines.push(`  ${formatEdge(edge)}  [${edge.id}]`);
  }
  lines.push(`\n${edges.length} edge(s)`);
  return lines.join("\n");
}

export function registerEdgeTools(server: McpServer, db: Surreal): void {
  server.tool(
    "list_edges",
    "List edges (relationships) in the spec graph. Filter by edge type, source node, or target node.",
    {
      type: z.string().optional().describe(`Edge type: ${EDGE_TYPES.join(", ")}`),
      from: z.string().optional().describe("Source node ID"),
      to: z.string().optional().describe("Target node ID"),
    },
    async ({ type, from, to }) => {
      try {
        const edges = await listEdges(db, { type, from, to });
        return { content: [{ type: "text", text: formatEdgeTable(edges) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${(err as Error).message}` }], isError: true };
      }
    }
  );

  server.tool(
    "create_edge",
    "Create a relationship between two nodes. Type constraints are enforced (e.g. RENDERS must go from Screen to Component).",
    {
      type: z.string().describe(`Edge type: ${EDGE_TYPES.join(", ")}`),
      from: z.string().describe("Source node ID"),
      to: z.string().describe("Target node ID"),
      metadata: z.record(z.unknown()).optional().describe("Optional metadata for the edge"),
    },
    async ({ type, from, to, metadata }) => {
      try {
        const edge = await createEdge(db, {
          type: type as any,
          from,
          to,
          metadata,
        });
        return { content: [{ type: "text", text: `Created edge: ${formatEdge(edge)}  [${edge.id}]` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${(err as Error).message}` }], isError: true };
      }
    }
  );

  server.tool(
    "delete_edge",
    "Delete an edge by its ID. This removes the relationship between two nodes.",
    { id: z.string().describe("Edge ID to delete") },
    async ({ id }) => {
      try {
        await deleteEdge(db, id);
        return { content: [{ type: "text", text: `Deleted edge: ${id}` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${(err as Error).message}` }], isError: true };
      }
    }
  );
}
