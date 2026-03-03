import { Command } from "commander";
import chalk from "chalk";
import { getDb, closeDb } from "../../db/client.js";
import { discoverSpecFiles } from "../../spec/discovery.js";
import { parseSpecFile } from "../../spec/parser.js";
import { resolveSpecs, resolveSpecsOffline } from "../../spec/resolver.js";
import { runSpecSync, printSpecSyncResults } from "../../spec/sync.js";
import { enrichSpecFile } from "../../spec/enricher.js";
import { exportToSpec } from "../../spec/exporter.js";
import { heading, success, error, warn, info } from "../output.js";
import type { ParsedSpecFile } from "../../spec/types.js";

// ── spec ingest ──────────────────────────────────────────────

const ingestCmd = new Command("ingest")
  .description("Parse YAML spec files and sync nodes/edges to the graph")
  .option("--specs-dir <path>", "Directory containing spec files", "./specs")
  .option("--app <app>", "Application name filter")
  .option("--apply", "Commit changes to the graph (default: dry-run)")
  .option("--enrich", "Write generated IDs back to YAML files (implies --apply)")
  .action(async (opts) => {
    const apply = Boolean(opts.enrich || opts.apply);
    const enrich = Boolean(opts.enrich);

    try {
      // Discover and parse
      const discovered = discoverSpecFiles(opts.specsDir);
      if (discovered.length === 0) {
        warn(`No *.graph.yaml files found in ${opts.specsDir}`);
        return;
      }

      heading(`Spec Ingest: ${discovered.length} file(s)`);

      const allSpecs: ParsedSpecFile[] = [];
      let parseErrors = 0;

      for (const file of discovered) {
        const result = parseSpecFile(file.path);
        if (result.errors.length > 0) {
          for (const err of result.errors) {
            error(`${err.file}: ${err.message}${err.path ? ` (at ${err.path})` : ""}`);
          }
          parseErrors += result.errors.length;
        }
        if (result.spec) {
          // Filter by app if specified
          if (opts.app && result.spec.header.app !== opts.app) continue;
          allSpecs.push(result.spec);
        }
      }

      if (parseErrors > 0) {
        error(`${parseErrors} parse error(s). Fix them before ingesting.`);
        process.exit(1);
      }

      if (allSpecs.length === 0) {
        warn("No spec files matched the filter criteria.");
        return;
      }

      info(`Parsed ${allSpecs.length} spec file(s)`);

      // Resolve references (with DB fallback)
      const db = await getDb();
      const resolved = await resolveSpecs(allSpecs, db);

      info(`Resolved ${resolved.nodes.length} node(s), ${resolved.edges.length} edge(s)`);

      // Sync to DB
      const results = await runSpecSync(db, resolved, apply);
      printSpecSyncResults(results, resolved.warnings, apply);

      // Enrich YAML files with generated IDs
      if (enrich) {
        let totalEnriched = 0;
        for (const spec of allSpecs) {
          const { written } = enrichSpecFile(spec);
          totalEnriched += written;
        }
        if (totalEnriched > 0) {
          success(`Enriched ${totalEnriched} ID(s) across spec files`);
        } else {
          info("No new IDs to enrich (all already populated).");
        }
      }

      await closeDb();
    } catch (err: any) {
      error(err.message);
      await closeDb();
      process.exit(1);
    }
  });

// ── spec validate ────────────────────────────────────────────

const validateCmd = new Command("validate")
  .description("Validate spec files without touching the database")
  .option("--specs-dir <path>", "Directory containing spec files", "./specs")
  .option("--app <app>", "Application name filter")
  .action(async (opts) => {
    const discovered = discoverSpecFiles(opts.specsDir);
    if (discovered.length === 0) {
      warn(`No *.graph.yaml files found in ${opts.specsDir}`);
      return;
    }

    heading(`Spec Validate: ${discovered.length} file(s)`);

    const allSpecs: ParsedSpecFile[] = [];
    let parseErrors = 0;
    let filesPassed = 0;

    for (const file of discovered) {
      const result = parseSpecFile(file.path);
      if (result.errors.length > 0) {
        for (const err of result.errors) {
          error(`${err.file}: ${err.message}${err.path ? ` (at ${err.path})` : ""}`);
        }
        parseErrors += result.errors.length;
      } else {
        filesPassed++;
      }
      if (result.spec) {
        if (opts.app && result.spec.header.app !== opts.app) continue;
        allSpecs.push(result.spec);
      }
    }

    // Resolve references offline (no DB)
    const resolved = resolveSpecsOffline(allSpecs);

    console.log();
    info(`Files: ${filesPassed} passed, ${parseErrors > 0 ? parseErrors + " with errors" : "0 errors"}`);
    info(`Nodes: ${resolved.nodes.length}`);
    info(`Edges: ${resolved.edges.length}`);

    if (resolved.warnings.length > 0) {
      console.log(`\n${chalk.yellow("Warnings:")} (${resolved.warnings.length})`);
      for (const w of resolved.warnings) {
        console.log(chalk.yellow(`  ! ${w}`));
      }
    }

    if (parseErrors > 0) {
      error(`Validation failed with ${parseErrors} error(s).`);
      process.exit(1);
    } else {
      success(`All ${filesPassed} file(s) valid.`);
    }
  });

// ── spec export ──────────────────────────────────────────────

const exportCmd = new Command("export")
  .description("Export graph data to YAML spec files")
  .requiredOption("--app <app>", "Application name to export")
  .option("--output <path>", "Output directory", "./specs")
  .action(async (opts) => {
    try {
      const db = await getDb();

      heading(`Spec Export: ${opts.app}`);

      const outputDir = `${opts.output}/${opts.app}`;
      const results = await exportToSpec(db, { app: opts.app, outputDir });

      if (results.files.length === 0) {
        warn("No nodes found for this app.");
      } else {
        success(`Exported ${results.files.length} file(s) to ${outputDir}/`);
        for (const f of results.files) {
          info(f);
        }
      }

      await closeDb();
    } catch (err: any) {
      error(err.message);
      await closeDb();
      process.exit(1);
    }
  });

// ── spec (parent command) ────────────────────────────────────

export const specCommand = new Command("spec")
  .description("Declarative YAML spec file management");

specCommand.addCommand(ingestCmd);
specCommand.addCommand(validateCmd);
specCommand.addCommand(exportCmd);
