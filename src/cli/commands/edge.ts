import { Command } from "commander";
import { getClient } from "../../client/factory.js";
import { EDGE_TYPES } from "../../schema/types.js";
import { heading, success, error, warn, formatError, edgeTable, edgeLabel } from "../output.js";

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
      await client.close();
    } catch (err: any) {
      error(formatError(err));
      await client.close();
      process.exit(1);
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
      await client.close();
    } catch (err: any) {
      error(formatError(err));
      await client.close();
      process.exit(1);
    }
  });

edgeCommand
  .command("delete [id]")
  .description("Delete edge(s) by ID or by filter (--from, --to, --type)")
  .option("--from <from>", "Filter by source node ID")
  .option("--to <to>", "Filter by target node ID")
  .option("--type <type>", "Filter by edge type")
  .action(async (id, opts) => {
    const client = await getClient();
    try {
      if (id) {
        // Delete by ID
        await client.deleteEdge(id);
        success(`Deleted edge: ${id}`);
      } else if (opts.from || opts.to || opts.type) {
        // Delete by filter
        const edges = await client.listEdges({
          type: opts.type,
          from: opts.from,
          to: opts.to,
        });

        if (edges.length === 0) {
          warn("No matching edges found.");
          await client.close();
          return;
        }

        for (const edge of edges) {
          await client.deleteEdge(edge.id);
          success(`Deleted: ${edgeLabel(edge)}`);
        }
        success(`Deleted ${edges.length} edge(s).`);
      } else {
        error("Provide an edge ID or use --from, --to, --type to filter.");
        process.exit(1);
      }
      await client.close();
    } catch (err: any) {
      error(formatError(err));
      await client.close();
      process.exit(1);
    }
  });
