import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Surreal } from "surrealdb";
import { z } from "zod";
import { getNode, listNodes, createNode, updateNode, deleteNode } from "../../db/nodes.js";
import type { Node } from "../../schema/types.js";
import { NODE_TYPES } from "../../schema/types.js";

function formatNode(node: Node): string {
  const lines: string[] = [];
  lines.push(`${node.type}: ${node.name}`);
  lines.push(`  ID:          ${node.id}`);
  lines.push(`  App:         ${node.app}`);
  if (node.description) {
    lines.push(`  Description: ${node.description}`);
  }
  if (node.tags.length > 0) {
    lines.push(`  Tags:        ${node.tags.join(", ")}`);
  }
  if (Object.keys(node.props).length > 0) {
    lines.push(`  Props:`);
    for (const [key, value] of Object.entries(node.props)) {
      const display = Array.isArray(value) ? value.join(", ") : String(value);
      lines.push(`    ${key}: ${display}`);
    }
  }
  lines.push(`  Version:     ${node.version}`);
  if (node.createdAt) lines.push(`  Created:     ${node.createdAt}`);
  if (node.updatedAt) lines.push(`  Updated:     ${node.updatedAt}`);
  return lines.join("\n");
}

function formatNodeTable(nodes: Node[]): string {
  if (nodes.length === 0) return "No nodes found.";

  const typeWidth = Math.max(12, ...nodes.map((n) => n.type.length));
  const nameWidth = Math.max(20, ...nodes.map((n) => n.name.length));
  const idWidth = Math.max(15, ...nodes.map((n) => n.id.length));

  const lines: string[] = [];
  lines.push(
    "TYPE".padEnd(typeWidth) + "  " +
    "NAME".padEnd(nameWidth) + "  " +
    "ID".padEnd(idWidth)
  );
  lines.push("─".repeat(typeWidth + nameWidth + idWidth + 4));

  for (const node of nodes) {
    lines.push(
      node.type.padEnd(typeWidth) + "  " +
      node.name.padEnd(nameWidth) + "  " +
      node.id.padEnd(idWidth)
    );
  }

  lines.push(`\n${nodes.length} node(s)`);
  return lines.join("\n");
}

export function registerNodeTools(server: McpServer, db: Surreal): void {
  server.tool(
    "get_node",
    "Get a node by its ID (e.g. scr_schedule, cmp_rsvp_button, ftr_transportation). Returns full details including type-specific props.",
    { id: z.string().describe("Node ID (e.g. scr_schedule)") },
    async ({ id }) => {
      try {
        const node = await getNode(db, id);
        if (!node) {
          return { content: [{ type: "text", text: `Node not found: ${id}` }], isError: true };
        }
        return { content: [{ type: "text", text: formatNode(node) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${(err as Error).message}` }], isError: true };
      }
    }
  );

  server.tool(
    "list_nodes",
    "List nodes in the spec graph. Filter by app, type, or tag. Returns a table of type/name/id.",
    {
      app: z.string().optional().describe("Filter by app name (e.g. myapp)"),
      type: z.string().optional().describe(`Filter by node type: ${NODE_TYPES.join(", ")}`),
      tag: z.string().optional().describe("Filter by tag"),
    },
    async ({ app, type, tag }) => {
      try {
        const nodes = await listNodes(db, { app, type, tag });
        return { content: [{ type: "text", text: formatNodeTable(nodes) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${(err as Error).message}` }], isError: true };
      }
    }
  );

  server.tool(
    "create_node",
    "Create a new node in the spec graph. Type-specific props are validated (e.g. Screen needs route, APIEndpoint needs method+path).",
    {
      type: z.string().describe(`Node type: ${NODE_TYPES.join(", ")}`),
      app: z.string().describe("App name (e.g. myapp)"),
      name: z.string().describe("Node name (used to generate ID)"),
      description: z.string().optional().describe("Description of this node"),
      tags: z.array(z.string()).optional().describe("Tags for categorization"),
      props: z.record(z.unknown()).optional().describe("Type-specific properties (e.g. {method: 'GET', path: '/api/trips'} for APIEndpoint)"),
    },
    async ({ type, app, name, description, tags, props }) => {
      try {
        const node = await createNode(db, {
          type: type as any,
          app,
          name,
          description,
          tags: tags ?? [],
          props: props ?? {},
        });
        return { content: [{ type: "text", text: `Created node: ${node.id}\n\n${formatNode(node)}` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${(err as Error).message}` }], isError: true };
      }
    }
  );

  server.tool(
    "update_node",
    "Update an existing node's name, description, tags, or props. Bumps version automatically.",
    {
      id: z.string().describe("Node ID to update"),
      name: z.string().optional().describe("New name"),
      description: z.string().optional().describe("New description"),
      tags: z.array(z.string()).optional().describe("New tags (replaces existing)"),
      props: z.record(z.unknown()).optional().describe("Props to update (merged with existing)"),
    },
    async ({ id, name, description, tags, props }) => {
      try {
        const updates: Record<string, unknown> = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (tags !== undefined) updates.tags = tags;
        if (props !== undefined) updates.props = props;

        const node = await updateNode(db, id, updates as any);
        return { content: [{ type: "text", text: `Updated node (v${node.version})\n\n${formatNode(node)}` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${(err as Error).message}` }], isError: true };
      }
    }
  );

  server.tool(
    "delete_node",
    "Delete a node and all its connected edges. This is destructive and cannot be undone.",
    { id: z.string().describe("Node ID to delete") },
    async ({ id }) => {
      try {
        await deleteNode(db, id);
        return { content: [{ type: "text", text: `Deleted node: ${id} (and all connected edges)` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${(err as Error).message}` }], isError: true };
      }
    }
  );
}
