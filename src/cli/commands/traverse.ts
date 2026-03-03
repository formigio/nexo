import { Command } from "commander";
import { getDb, closeDb } from "../../db/client.js";
import { traverse } from "../../db/queries.js";
import { heading, error, info, nodeLabel, edgeLabel } from "../output.js";
import chalk from "chalk";

export const traverseCommand = new Command("traverse")
  .description("Traverse the graph from a starting node")
  .argument("<id>", "Starting node ID")
  .option("-d, --depth <n>", "Traversal depth", "2")
  .option("-e, --edge-types <types>", "Comma-separated edge types to follow")
  .action(async (id, opts) => {
    try {
      const db = await getDb();
      const edgeTypes = opts.edgeTypes
        ? opts.edgeTypes.split(",").map((t: string) => t.trim())
        : undefined;

      const result = await traverse(db, id, {
        depth: parseInt(opts.depth, 10),
        edgeTypes,
      });

      heading(`Traversal from ${id} (depth=${opts.depth})`);

      if (result.nodes.length === 0) {
        info("No connected nodes found.");
      } else {
        console.log(chalk.dim("\nNodes:"));
        for (const node of result.nodes) {
          console.log(`  ${nodeLabel(node)}`);
        }
      }

      if (result.edges.length > 0) {
        console.log(chalk.dim("\nEdges:"));
        for (const edge of result.edges) {
          console.log(`  ${edgeLabel(edge)}`);
        }
      }

      console.log(
        chalk.dim(`\n${result.nodes.length} node(s), ${result.edges.length} edge(s)`)
      );

      await closeDb();
    } catch (err: any) {
      error(err.message);
      await closeDb();
      process.exit(1);
    }
  });
