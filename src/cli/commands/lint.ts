import { Command } from "commander";
import { getClient } from "../../client/factory.js";
import { getConfig } from "../../config/loader.js";
import { runLint } from "../../lint/runner.js";
import type { Severity, Category } from "../../lint/types.js";
import { heading, error, info } from "../output.js";
import chalk from "chalk";

const SEVERITY_ICON: Record<Severity, string> = {
  error: chalk.red("ERR"),
  warning: chalk.yellow("WRN"),
  info: chalk.dim("INF"),
};

export const lintCommand = new Command("lint")
  .description("Run graph hygiene rules and report violations")
  .option("--app <name>", "Application name (e.g., myapp)")
  .option("--rule <ids...>", "Run only specific rules (repeatable)")
  .option("--severity <level>", "Minimum severity: error, warning, info", "info")
  .option("--category <cat>", "Filter by category: connectivity, completeness, consistency")
  .option("--no-custom", "Skip project-specific custom rules from .nexo/rules/")
  .option("--verbose", "Show passing rules too", false)
  .option("--json", "Output as JSON", false)
  .action(async (opts) => {
    const client = await getClient();
    try {
      const cfg = getConfig();
      const app = opts.app ?? cfg.app;

      const report = await runLint(client, {
        app,
        rules: opts.rule,
        severity: opts.severity as Severity,
        category: opts.category as Category | undefined,
        skipCustomRules: !opts.custom,
      });

      if (opts.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      heading(`Lint: ${report.app}`);
      info(`${report.totalNodes} nodes, ${report.totalEdges} edges\n`);

      let totalViolations = 0;
      let errorCount = 0;
      let warningCount = 0;
      let infoCount = 0;

      for (const result of report.results) {
        const count = result.violations.length;
        totalViolations += count;
        if (result.severity === "error") errorCount += count;
        else if (result.severity === "warning") warningCount += count;
        else infoCount += count;

        if (count === 0 && !opts.verbose) continue;

        const icon = SEVERITY_ICON[result.severity];
        const countStr = count === 0
          ? chalk.green("0 violations")
          : `${count} violation${count > 1 ? "s" : ""}`;

        console.log(`  ${icon}  ${chalk.bold(result.rule)}  ${chalk.dim("—")} ${countStr}`);
        console.log(chalk.dim(`       ${result.description}`));

        for (const v of result.violations) {
          console.log(`       ${chalk.dim("-")} ${v.message}`);
          if (v.fix) {
            console.log(chalk.dim(`         fix: ${v.fix}`));
          }
        }

        if (count > 0) console.log();
      }

      // Summary
      console.log(chalk.dim("  " + "\u2500".repeat(45)));
      const parts: string[] = [];
      if (errorCount > 0) parts.push(chalk.red(`${errorCount} error${errorCount > 1 ? "s" : ""}`));
      if (warningCount > 0) parts.push(chalk.yellow(`${warningCount} warning${warningCount > 1 ? "s" : ""}`));
      if (infoCount > 0) parts.push(chalk.dim(`${infoCount} info`));

      if (totalViolations === 0) {
        console.log(chalk.green(`  All ${report.results.length} rules passed.`));
      } else {
        console.log(`  ${parts.join(chalk.dim(", "))}`);
      }
    } catch (err: any) {
      error(err.message);
      process.exit(1);
    } finally {
      await client.close();
    }
  });
