import { Command } from "commander";
import { getClient } from "../../client/factory.js";
import { EDGE_TYPES } from "../../schema/types.js";
import { heading, success, error, edgeTable } from "../output.js";

export const edgeCommand = new Command("edge")
  .description("Manage edges in the spec graph");

edgeCommand
  .command("create <type> <from> <to>")
  .description(`Create an edge. Types: ${EDGE_TYPES.join(", ")}`)
  .option("--meta <metadata...>", "Metadata as key=value pairs")
  .action(async (type, from, to, opts) => {
    const client = await getClient();
    try {
      if (!EDGE_TYPES.includes(type)) {
        error(`Invalid edge type: ${type}. Valid types: ${EDGE_TYPES.join(", ")}`);
        process.exit(1);
      }

      let metadata: Record<string, unknown> | undefined;
      if (opts.meta) {
        metadata = {};
        for (const m of opts.meta) {
          const eqIndex = m.indexOf("=");
          if (eqIndex === -1) continue;
          metadata[m.slice(0, eqIndex)] = m.slice(eqIndex + 1);
        }
      }

      const edge = await client.createEdge({ type, from, to, metadata });
      success(`Created edge: ${from} ─${type}→ ${to}`);
    } catch (err: any) {
      error(err.message);
      process.exit(1);
    } finally {
      await client.close();
    }
  });

edgeCommand
  .command("list")
  .description("List edges with optional filters")
  .option("--type <type>", "Filter by edge type")
  .option("--from <from>", "Filter by source node ID")
  .option("--to <to>", "Filter by target node ID")
  .action(async (opts) => {
    const client = await getClient();
    try {
      const edges = await client.listEdges({
        type: opts.type,
        from: opts.from,
        to: opts.to,
      });

      heading("Edges");
      edgeTable(edges);
    } catch (err: any) {
      error(err.message);
      process.exit(1);
    } finally {
      await client.close();
    }
  });

edgeCommand
  .command("delete <id>")
  .description("Delete an edge by ID")
  .action(async (id) => {
    const client = await getClient();
    try {
      await client.deleteEdge(id);
      success(`Deleted edge: ${id}`);
    } catch (err: any) {
      error(err.message);
      process.exit(1);
    } finally {
      await client.close();
    }
  });
