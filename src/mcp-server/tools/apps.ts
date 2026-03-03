import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Surreal } from "surrealdb";
import { z } from "zod";
import { listNodes } from "../../db/nodes.js";
import { listEdges } from "../../db/edges.js";
import type { Node } from "../../schema/types.js";

function nodeLabel(node: Node): string {
  return `${node.type}:${node.name} [${node.id}]`;
}

export function registerAppTools(server: McpServer, db: Surreal): void {
  server.tool(
    "app_list",
    "List all applications in the spec graph with node counts.",
    {},
    async () => {
      try {
        const [result] = await db.query<[{ app: string; count: number }[]]>(
          `SELECT app, count() AS count FROM node GROUP BY app ORDER BY app`
        );

        if (!result || result.length === 0) {
          return { content: [{ type: "text", text: "No applications found." }] };
        }

        const lines: string[] = ["Applications:"];
        for (const row of result) {
          lines.push(`  ${row.app} (${row.count} nodes)`);
        }
        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${(err as Error).message}` }], isError: true };
      }
    }
  );

  server.tool(
    "app_overview",
    "Show overview of an application: node counts by type, edge counts by type, and features summary.",
    { app: z.string().describe("App name (e.g. myapp)") },
    async ({ app }) => {
      try {
        const nodes = await listNodes(db, { app });
        const edges = await listEdges(db);

        if (nodes.length === 0) {
          return { content: [{ type: "text", text: `No nodes found for app: ${app}` }], isError: true };
        }

        const lines: string[] = [`Application: ${app}`];

        // Node counts by type
        const typeCounts = new Map<string, number>();
        for (const node of nodes) {
          typeCounts.set(node.type, (typeCounts.get(node.type) ?? 0) + 1);
        }

        lines.push("\nNode counts by type:");
        for (const [type, count] of [...typeCounts.entries()].sort()) {
          lines.push(`  ${type.padEnd(15)} ${count}`);
        }

        // Edge counts connected to this app's nodes
        const nodeIds = new Set(nodes.map((n) => n.id));
        const appEdges = edges.filter(
          (e) => nodeIds.has(e.in) || nodeIds.has(e.out)
        );

        const edgeTypeCounts = new Map<string, number>();
        for (const edge of appEdges) {
          edgeTypeCounts.set(edge.type, (edgeTypeCounts.get(edge.type) ?? 0) + 1);
        }

        if (appEdges.length > 0) {
          lines.push("\nEdge counts by type:");
          for (const [type, count] of [...edgeTypeCounts.entries()].sort()) {
            lines.push(`  ${type.padEnd(15)} ${count}`);
          }
        }

        // Features summary
        const features = nodes.filter((n) => n.type === "Feature");
        if (features.length > 0) {
          lines.push("\nFeatures:");
          for (const f of features) {
            const props = f.props as Record<string, unknown>;
            const featureId = (props.featureId as string) ?? "";
            const status = (props.status as string) ?? "unknown";
            const priority = (props.priority as string) ?? "";
            lines.push(`  ${featureId.padEnd(8)} ${f.name.padEnd(30)} ${status.padEnd(12)} ${priority}`);
          }
        }

        lines.push(`\nTotal: ${nodes.length} nodes, ${appEdges.length} edges`);
        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${(err as Error).message}` }], isError: true };
      }
    }
  );

  server.tool(
    "feature_list",
    "List features with their status, priority, and app. Filter by app or status.",
    {
      app: z.string().optional().describe("Filter by app name"),
      status: z.string().optional().describe("Filter by status: proposed, in-progress, deployed, deprecated"),
    },
    async ({ app, status }) => {
      try {
        const nodes = await listNodes(db, { app, type: "Feature" });

        let features = nodes;
        if (status) {
          features = features.filter((f) => (f.props as Record<string, unknown>).status === status);
        }

        if (features.length === 0) {
          return { content: [{ type: "text", text: "No features found." }] };
        }

        const lines: string[] = ["Features:"];
        for (const f of features) {
          const props = f.props as Record<string, unknown>;
          const featureId = (props.featureId as string) ?? "";
          const featureStatus = (props.status as string) ?? "unknown";
          const priority = (props.priority as string) ?? "";
          lines.push(
            `  ${featureId.padEnd(8)} ${f.name.padEnd(35)} ${featureStatus.padEnd(12)} ${priority} [${f.app}]`
          );
        }

        lines.push(`\n${features.length} feature(s)`);
        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${(err as Error).message}` }], isError: true };
      }
    }
  );

  server.tool(
    "feature_scope",
    "Show all nodes that belong to a feature, grouped by type. Use this to understand what a feature encompasses.",
    { id: z.string().describe("Feature node ID (e.g. ftr_transportation)") },
    async ({ id }) => {
      try {
        // Get the feature node
        const allNodes = await listNodes(db);
        const feature = allNodes.find((n) => n.id === id);
        if (!feature || feature.type !== "Feature") {
          return { content: [{ type: "text", text: `Feature not found: ${id}` }], isError: true };
        }

        // Find all BELONGS_TO edges pointing to this feature
        const edges = await listEdges(db, { type: "BELONGS_TO", to: id });
        const memberIds = new Set(edges.map((e) => e.in));
        const memberNodes = allNodes.filter((n) => memberIds.has(n.id));

        const props = feature.props as Record<string, unknown>;
        const featureId = (props.featureId as string) ?? "";

        const lines: string[] = [`Feature Scope: ${featureId} ${feature.name}`];

        if (memberNodes.length === 0) {
          lines.push("\nNo nodes belong to this feature yet.");
        } else {
          // Group by type
          const byType = new Map<string, Node[]>();
          for (const node of memberNodes) {
            const group = byType.get(node.type) ?? [];
            group.push(node);
            byType.set(node.type, group);
          }

          for (const [type, groupNodes] of [...byType.entries()].sort()) {
            lines.push(`\n  ${type}:`);
            for (const node of groupNodes) {
              lines.push(`    ${nodeLabel(node)}`);
            }
          }
        }

        lines.push(`\n${memberNodes.length} node(s) in scope`);
        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${(err as Error).message}` }], isError: true };
      }
    }
  );
}
