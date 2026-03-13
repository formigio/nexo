import { Command } from "commander";
import { getClient } from "../../client/factory.js";
import { getConfig } from "../../config/loader.js";
import { NODE_TYPES } from "../../schema/types.js";
import { heading, success, error, formatError, nodeDetail, nodeTable, warn } from "../output.js";

function parseProps(propStrings: string[]): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const p of propStrings) {
    const eqIndex = p.indexOf("=");
    if (eqIndex === -1) {
      throw new Error(`Invalid prop format: "${p}". Use key=value`);
    }
    const key = p.slice(0, eqIndex);
    const rawValue = p.slice(eqIndex + 1);

    // Try parsing as JSON for arrays/objects/numbers/booleans
    try {
      props[key] = JSON.parse(rawValue);
    } catch {
      props[key] = rawValue;
    }
  }
  return props;
}

export const nodeCommand = new Command("node")
  .description("Manage nodes in the spec graph");

nodeCommand
  .command("create <type>")
  .description(`Create a node. Types: ${NODE_TYPES.join(", ")}`)
  .option("--app <app>", "Application name")
  .requiredOption("--name <name>", "Node name")
  .option("--desc <description>", "Description")
  .option("--tags <tags>", "Comma-separated tags")
  .option("--prop <props...>", "Props as key=value pairs")
  .action(async (type, opts) => {
    const client = await getClient();
    try {
      if (!NODE_TYPES.includes(type)) {
        error(`Invalid node type: ${type}. Valid types: ${NODE_TYPES.join(", ")}`);
        process.exit(1);
      }

      const cfg = getConfig();
      const app = opts.app ?? cfg.app;

      if (!app) {
        error("Provide --app or set \"app\" in .nexo/config.json");
        process.exit(1);
      }

      const node = await client.createNode({
        type,
        app,
        name: opts.name,
        description: opts.desc,
        tags: opts.tags ? opts.tags.split(",").map((t: string) => t.trim()) : [],
        props: opts.prop ? parseProps(opts.prop) : {},
      });

      success(`Created node: ${node.id}`);
      nodeDetail(node);
      await client.close();
    } catch (err: any) {
      error(formatError(err));
      await client.close();
      process.exit(1);
    }
  });

nodeCommand
  .command("get <id>")
  .description("Get a node by ID")
  .action(async (id) => {
    const client = await getClient();
    try {
      const node = await client.getNode(id);
      if (!node) {
        warn(`Node not found: ${id}`);
        await client.close();
        process.exit(1);
      }
      nodeDetail(node);
      await client.close();
    } catch (err: any) {
      error(formatError(err));
      await client.close();
      process.exit(1);
    }
  });

nodeCommand
  .command("list")
  .description("List nodes with optional filters")
  .option("--app <app>", "Filter by app")
  .option("--type <type>", "Filter by node type")
  .option("--tag <tag>", "Filter by tag")
  .action(async (opts) => {
    const client = await getClient();
    try {
      const nodes = await client.listNodes({
        app: opts.app,
        type: opts.type,
        tag: opts.tag,
      });

      heading("Nodes");
      nodeTable(nodes);
      await client.close();
    } catch (err: any) {
      error(formatError(err));
      await client.close();
      process.exit(1);
    }
  });

nodeCommand
  .command("update <id>")
  .description("Update a node")
  .option("--name <name>", "New name")
  .option("--desc <description>", "New description")
  .option("--tags <tags>", "New comma-separated tags")
  .option("--prop <props...>", "Props to update as key=value")
  .action(async (id, opts) => {
    const client = await getClient();
    try {
      const updates: any = {};
      if (opts.name) updates.name = opts.name;
      if (opts.desc) updates.description = opts.desc;
      if (opts.tags) updates.tags = opts.tags.split(",").map((t: string) => t.trim());
      if (opts.prop) updates.props = parseProps(opts.prop);

      const node = await client.updateNode(id, updates);
      success(`Updated node: ${node.id} (v${node.version})`);
      nodeDetail(node);
      await client.close();
    } catch (err: any) {
      error(formatError(err));
      await client.close();
      process.exit(1);
    }
  });

nodeCommand
  .command("delete <id>")
  .description("Delete a node and all its edges")
  .action(async (id) => {
    const client = await getClient();
    try {
      await client.deleteNode(id);
      success(`Deleted node: ${id}`);
      await client.close();
    } catch (err: any) {
      error(formatError(err));
      await client.close();
      process.exit(1);
    }
  });
