import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GraphClient } from "../../client/types.js";
import { z } from "zod";
import type { Node } from "../../schema/types.js";

function nodeLabel(node: Node): string {
  return `${node.type}:${node.name} [${node.id}]`;
}

export function registerAppTools(server: McpServer, client: GraphClient): void {
  server.tool(
    "app_list",
    "List all applications in the spec graph with node counts.",
    {},
    async () => {
      try {
        const apps = await client.listApps();

        if (apps.length === 0) {
          return { content: [{ type: "text", text: "No applications found." }] };
        }

        const lines: string[] = ["Applications:"];
        for (const row of apps) {
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
        const { nodes, edges } = await client.appOverview(app);

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
        const edgeTypeCounts = new Map<string, number>();
        for (const edge of edges) {
          edgeTypeCounts.set(edge.type, (edgeTypeCounts.get(edge.type) ?? 0) + 1);
        }

        if (edges.length > 0) {
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

        lines.push(`\nTotal: ${nodes.length} nodes, ${edges.length} edges`);
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
        const nodes = await client.listNodes({ app, type: "Feature" });

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
        const feature = await client.getNode(id);
        if (!feature || feature.type !== "Feature") {
          return { content: [{ type: "text", text: `Feature not found: ${id}` }], isError: true };
        }

        // Find all BELONGS_TO edges pointing to this feature
        const edges = await client.listEdges({ type: "BELONGS_TO", to: id });
        const memberIds = new Set(edges.map((e) => e.in));

        // Fetch member nodes
        const allNodes = await client.listNodes({ app: feature.app });
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
