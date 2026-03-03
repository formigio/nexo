import { Command } from "commander";
import { getDb, closeDb } from "../../db/client.js";
import { impactAnalysis } from "../../db/queries.js";
import { heading, error, info, nodeLabel, edgeLabel } from "../output.js";
import chalk from "chalk";

export const impactCommand = new Command("impact")
  .description("Analyze the impact of changing a node")
  .argument("<id>", "Node ID to analyze")
  .option("-h, --hops <n>", "Maximum traversal hops", "3")
  .action(async (id, opts) => {
    try {
      const db = await getDb();
      const result = await impactAnalysis(db, id, parseInt(opts.hops, 10));

      heading(`Impact Analysis: ${result.startNode.type}: ${result.startNode.name}`);

      if (result.directImpacts.length > 0) {
        console.log(chalk.bold.yellow("\nDirect impacts (1 hop):"));
        for (const node of result.directImpacts) {
          console.log(`  ${nodeLabel(node)}`);
        }
      }

      if (result.structuralImpacts.length > 0) {
        console.log(chalk.bold.yellow("\nStructural impacts (2+ hops):"));
        for (const node of result.structuralImpacts) {
          console.log(`  ${nodeLabel(node)}`);
        }
      }

      if (result.directImpacts.length === 0 && result.structuralImpacts.length === 0) {
        info("No impacts found. This node has no connections.");
      }

      if (result.edges.length > 0) {
        console.log(chalk.dim("\nEdge paths:"));
        for (const edge of result.edges) {
          console.log(`  ${edgeLabel(edge)}`);
        }
      }

      const total = result.directImpacts.length + result.structuralImpacts.length;
      console.log(
        chalk.dim(
          `\n${total} impacted node(s): ${result.directImpacts.length} direct, ` +
          `${result.structuralImpacts.length} structural`
        )
      );

      await closeDb();
    } catch (err: any) {
      error(err.message);
      await closeDb();
      process.exit(1);
    }
  });
