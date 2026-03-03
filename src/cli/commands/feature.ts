import { Command } from "commander";
import { getDb, closeDb } from "../../db/client.js";
import { listNodes } from "../../db/nodes.js";
import { listEdges } from "../../db/edges.js";
import { heading, error, info, nodeLabel } from "../output.js";
import chalk from "chalk";

export const featureCommand = new Command("feature")
  .description("Feature-level operations");

featureCommand
  .command("list")
  .description("List features")
  .option("--app <app>", "Filter by app")
  .option("--status <status>", "Filter by status (proposed, in-progress, deployed, deprecated)")
  .action(async (opts) => {
    try {
      const db = await getDb();
      const nodes = await listNodes(db, { app: opts.app, type: "Feature" });

      let features = nodes;
      if (opts.status) {
        features = features.filter((f) => (f.props as any).status === opts.status);
      }

      heading("Features");
      if (features.length === 0) {
        info("No features found.");
        await closeDb();
        return;
      }

      for (const f of features) {
        const props = f.props as any;
        const featureId = props.featureId ?? "";
        const status = props.status ?? "unknown";
        const priority = props.priority ?? "";
        const statusColor =
          status === "deployed"
            ? chalk.green
            : status === "in-progress"
            ? chalk.yellow
            : status === "proposed"
            ? chalk.blue
            : chalk.dim;

        console.log(
          `  ${chalk.bold(featureId.padEnd(8))} ` +
          `${f.name.padEnd(35)} ` +
          `${statusColor(status.padEnd(12))} ` +
          `${chalk.dim(priority)} ` +
          `${chalk.dim(`[${f.app}]`)}`
        );
      }

      console.log(chalk.dim(`\n${features.length} feature(s)`));
      await closeDb();
    } catch (err: any) {
      error(err.message);
      await closeDb();
      process.exit(1);
    }
  });

featureCommand
  .command("scope <id>")
  .description("Show all nodes belonging to a feature")
  .action(async (id) => {
    try {
      const db = await getDb();

      // Get the feature node
      const features = await listNodes(db);
      const feature = features.find((n) => n.id === id);
      if (!feature || feature.type !== "Feature") {
        error(`Feature not found: ${id}`);
        await closeDb();
        process.exit(1);
      }

      // Find all BELONGS_TO edges pointing to this feature
      const edges = await listEdges(db, { type: "BELONGS_TO", to: id });
      const memberIds = edges.map((e) => e.in.replace(/^node:/, ""));

      // Fetch those nodes
      const allNodes = await listNodes(db);
      const memberNodes = allNodes.filter((n) => memberIds.includes(n.id));

      const props = feature.props as any;
      heading(
        `Feature Scope: ${props.featureId ?? ""} ${feature.name}`
      );

      if (memberNodes.length === 0) {
        info("No nodes belong to this feature yet.");
      } else {
        // Group by type
        const byType = new Map<string, typeof memberNodes>();
        for (const node of memberNodes) {
          const group = byType.get(node.type) ?? [];
          group.push(node);
          byType.set(node.type, group);
        }

        for (const [type, groupNodes] of [...byType.entries()].sort()) {
          console.log(chalk.bold(`\n  ${type}:`));
          for (const node of groupNodes) {
            console.log(`    ${nodeLabel(node)}`);
          }
        }
      }

      console.log(chalk.dim(`\n${memberNodes.length} node(s) in scope`));
      await closeDb();
    } catch (err: any) {
      error(err.message);
      await closeDb();
      process.exit(1);
    }
  });
