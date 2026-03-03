import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Surreal } from "surrealdb";
import { z } from "zod";
import { traverse, impactAnalysis } from "../../db/queries.js";
import type { Node, Edge } from "../../schema/types.js";

function nodeLabel(node: Node): string {
  return `${node.type}:${node.name} [${node.id}]`;
}

function edgeLabel(edge: Edge): string {
  return `${edge.in} ─${edge.type}→ ${edge.out}`;
}

export function registerGraphTools(server: McpServer, db: Surreal): void {
  server.tool(
    "traverse",
    "BFS traversal from a starting node. Follows edges in both directions. Returns connected nodes and edges grouped by type.",
    {
      id: z.string().describe("Starting node ID"),
      depth: z.number().optional().describe("Max traversal depth (default: 2)"),
      edgeTypes: z.array(z.string()).optional().describe("Only follow these edge types (e.g. ['RENDERS', 'TRIGGERS'])"),
    },
    async ({ id, depth, edgeTypes }) => {
      try {
        const result = await traverse(db, id, { depth, edgeTypes });

        const lines: string[] = [];
        lines.push(`Traversal from ${id} (depth=${depth ?? 2})`);

        if (result.nodes.length === 0) {
          lines.push("\nNo connected nodes found.");
        } else {
          // Group nodes by type
          const byType = new Map<string, Node[]>();
          for (const node of result.nodes) {
            const group = byType.get(node.type) ?? [];
            group.push(node);
            byType.set(node.type, group);
          }

          lines.push("\nNodes:");
          for (const [type, nodes] of [...byType.entries()].sort()) {
            lines.push(`  ${type}:`);
            for (const node of nodes) {
              lines.push(`    ${nodeLabel(node)}`);
            }
          }
        }

        if (result.edges.length > 0) {
          lines.push("\nEdges:");
          for (const edge of result.edges) {
            lines.push(`  ${edgeLabel(edge)}`);
          }
        }

        lines.push(`\n${result.nodes.length} node(s), ${result.edges.length} edge(s)`);
        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${(err as Error).message}` }], isError: true };
      }
    }
  );

  server.tool(
    "impact_analysis",
    "Analyze what would be affected by changing a node. Shows direct impacts (1 hop) and structural impacts (2+ hops) with edge paths.",
    {
      id: z.string().describe("Node ID to analyze"),
      hops: z.number().optional().describe("Max hops to trace (default: 3)"),
    },
    async ({ id, hops }) => {
      try {
        const result = await impactAnalysis(db, id, hops ?? 3);

        const lines: string[] = [];
        lines.push(`Impact Analysis: ${result.startNode.type}: ${result.startNode.name}`);

        if (result.directImpacts.length > 0) {
          lines.push("\nDirect impacts (1 hop):");
          for (const node of result.directImpacts) {
            lines.push(`  ${nodeLabel(node)}`);
          }
        }

        if (result.structuralImpacts.length > 0) {
          lines.push("\nStructural impacts (2+ hops):");
          for (const node of result.structuralImpacts) {
            lines.push(`  ${nodeLabel(node)}`);
          }
        }

        if (result.directImpacts.length === 0 && result.structuralImpacts.length === 0) {
          lines.push("\nNo impacts found. This node has no connections.");
        }

        if (result.edges.length > 0) {
          lines.push("\nEdge paths:");
          for (const edge of result.edges) {
            lines.push(`  ${edgeLabel(edge)}`);
          }
        }

        const total = result.directImpacts.length + result.structuralImpacts.length;
        lines.push(
          `\n${total} impacted node(s): ${result.directImpacts.length} direct, ${result.structuralImpacts.length} structural`
        );

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${(err as Error).message}` }], isError: true };
      }
    }
  );
}
