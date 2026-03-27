import { Command } from "commander";
import { getClient } from "../../client/factory.js";
import { getConfig } from "../../config/loader.js";
import { heading, error, formatError, info } from "../output.js";
import chalk from "chalk";

/** Node types that represent spec (non-leaf) nodes which should be backed by source files. */
const SPEC_TYPES = ["Screen", "Component", "APIEndpoint", "DataEntity", "BusinessRule", "CLICommand", "AgentProcess"];

export const coverageCommand = new Command("coverage")
  .description("Report spec-to-source coverage for an application")
  .option("--app <name>", "Application name (e.g., myapp)")
  .option("--verbose", "Show uncovered nodes", false)
  .action(async (opts) => {
    const client = await getClient();
    try {
      const cfg = getConfig();
      const app = opts.app ?? cfg.app;

      if (!app) {
        error("Provide --app or set \"app\" in .nexo/config.json");
        process.exit(1);
      }

      const nodes = await client.listNodes({ app });
      const edges = await client.listEdges();

      if (nodes.length === 0) {
        info(`No nodes found for app: ${app}`);
        await client.close();
        return;
      }

      // Build set of node IDs that have an IMPLEMENTED_IN edge (as source)
      const coveredIds = new Set<string>();
      for (const e of edges) {
        if (e.type === "IMPLEMENTED_IN") {
          // edge.in is the spec node, edge.out is the SourceFile
          const fromId = e.in.replace(/^node:/, "");
          coveredIds.add(fromId);
        }
      }

      heading(`Coverage Report: ${app}`);

      let totalSpec = 0;
      let totalCovered = 0;

      for (const type of SPEC_TYPES) {
        const typeNodes = nodes.filter((n) => n.type === type);
        const covered = typeNodes.filter((n) => coveredIds.has(n.id));
        const uncovered = typeNodes.filter((n) => !coveredIds.has(n.id));

        totalSpec += typeNodes.length;
        totalCovered += covered.length;

        const pct = typeNodes.length > 0
          ? Math.round((covered.length / typeNodes.length) * 100)
          : 100;

        const pctStr = pct === 100
          ? chalk.green(`${pct}%`)
          : pct >= 80
          ? chalk.yellow(`${pct}%`)
          : chalk.red(`${pct}%`);

        console.log(
          `  ${chalk.cyan(type.padEnd(15))} ${String(covered.length).padStart(3)}/${String(typeNodes.length).padStart(3)}  ${pctStr}`
        );

        if (opts.verbose && uncovered.length > 0) {
          for (const n of uncovered) {
            console.log(chalk.dim(`    - ${n.name} (${n.id})`));
          }
        }
      }

      // Overall
      const overallPct = totalSpec > 0
        ? Math.round((totalCovered / totalSpec) * 100)
        : 100;
      const overallColor = overallPct === 100 ? chalk.green : overallPct >= 80 ? chalk.yellow : chalk.red;

      console.log(chalk.dim("\n  " + "─".repeat(35)));
      console.log(
        `  ${chalk.bold("Overall".padEnd(15))} ${String(totalCovered).padStart(3)}/${String(totalSpec).padStart(3)}  ${overallColor(overallPct + "%")}`
      );

      // SourceFile stats
      const sourceFiles = nodes.filter((n) => n.type === "SourceFile");
      const implementedInCount = edges.filter((e) => e.type === "IMPLEMENTED_IN").length;
      console.log(
        chalk.dim(`\n  SourceFile nodes: ${sourceFiles.length}  |  IMPLEMENTED_IN edges: ${implementedInCount}`)
      );

      await client.close();
    } catch (err: any) {
      error(formatError(err));
      await client.close();
      process.exit(1);
    }
  });
