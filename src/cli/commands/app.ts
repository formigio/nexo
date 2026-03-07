import { Command } from "commander";
import { getClient } from "../../client/factory.js";
import { heading, error, info } from "../output.js";
import chalk from "chalk";

export const appCommand = new Command("app")
  .description("Application-level operations");

appCommand
  .command("list")
  .description("List all applications in the graph")
  .action(async () => {
    const client = await getClient();
    try {
      const apps = await client.listApps();

      heading("Applications");
      if (apps.length === 0) {
        info("No applications found. Create nodes with --app to get started.");
      } else {
        for (const row of apps) {
          console.log(`  ${chalk.bold(row.app)} ${chalk.dim(`(${row.count} nodes)`)}`);
        }
      }
    } catch (err: any) {
      error(err.message);
      process.exit(1);
    } finally {
      await client.close();
    }
  });

appCommand
  .command("overview <name>")
  .description("Show overview statistics for an application")
  .action(async (name) => {
    const client = await getClient();
    try {
      const { nodes, edges } = await client.appOverview(name);

      if (nodes.length === 0) {
        info(`No nodes found for app: ${name}`);
        return;
      }

      heading(`Application: ${name}`);

      // Count by type
      const typeCounts = new Map<string, number>();
      for (const node of nodes) {
        typeCounts.set(node.type, (typeCounts.get(node.type) ?? 0) + 1);
      }

      console.log(chalk.bold("\nNode counts by type:"));
      for (const [type, count] of [...typeCounts.entries()].sort()) {
        console.log(`  ${chalk.cyan(type.padEnd(15))} ${count}`);
      }

      // Count edges connected to this app's nodes
      const edgeTypeCounts = new Map<string, number>();
      for (const edge of edges) {
        edgeTypeCounts.set(edge.type, (edgeTypeCounts.get(edge.type) ?? 0) + 1);
      }

      if (edges.length > 0) {
        console.log(chalk.bold("\nEdge counts by type:"));
        for (const [type, count] of [...edgeTypeCounts.entries()].sort()) {
          console.log(`  ${chalk.yellow(type.padEnd(15))} ${count}`);
        }
      }

      // Features summary
      const features = nodes.filter((n) => n.type === "Feature");
      if (features.length > 0) {
        console.log(chalk.bold("\nFeatures:"));
        for (const f of features) {
          const props = f.props as any;
          const status = props.status ?? "unknown";
          const priority = props.priority ?? "";
          const featureId = props.featureId ?? "";
          const statusColor =
            status === "deployed"
              ? chalk.green(status)
              : status === "in-progress"
              ? chalk.yellow(status)
              : chalk.dim(status);
          console.log(
            `  ${chalk.dim(featureId.padEnd(8))} ${f.name.padEnd(30)} ${statusColor} ${chalk.dim(priority)}`
          );
        }
      }

      console.log(
        chalk.dim(`\nTotal: ${nodes.length} nodes, ${edges.length} edges`)
      );
    } catch (err: any) {
      error(err.message);
      process.exit(1);
    } finally {
      await client.close();
    }
  });
