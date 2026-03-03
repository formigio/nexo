import { Command } from "commander";
import { getDb, closeDb } from "../../db/client.js";
import { createEdge, listEdges, deleteEdge } from "../../db/edges.js";
import { EDGE_TYPES } from "../../schema/types.js";
import { heading, success, error, edgeTable } from "../output.js";

export const edgeCommand = new Command("edge")
  .description("Manage edges in the spec graph");

edgeCommand
  .command("create <type> <from> <to>")
  .description(`Create an edge. Types: ${EDGE_TYPES.join(", ")}`)
  .option("--meta <metadata...>", "Metadata as key=value pairs")
  .action(async (type, from, to, opts) => {
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

      const db = await getDb();
      const edge = await createEdge(db, { type, from, to, metadata });
      success(`Created edge: ${from} ─${type}→ ${to}`);
      await closeDb();
    } catch (err: any) {
      error(err.message);
      await closeDb();
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
    try {
      const db = await getDb();
      const edges = await listEdges(db, {
        type: opts.type,
        from: opts.from,
        to: opts.to,
      });

      heading("Edges");
      edgeTable(edges);
      await closeDb();
    } catch (err: any) {
      error(err.message);
      await closeDb();
      process.exit(1);
    }
  });

edgeCommand
  .command("delete <id>")
  .description("Delete an edge by ID")
  .action(async (id) => {
    try {
      const db = await getDb();
      await deleteEdge(db, id);
      success(`Deleted edge: ${id}`);
      await closeDb();
    } catch (err: any) {
      error(err.message);
      await closeDb();
      process.exit(1);
    }
  });
