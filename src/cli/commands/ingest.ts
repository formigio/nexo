import { Command } from "commander";
import { getDb, closeDb } from "../../db/client.js";
import { getConfig } from "../../config/loader.js";
import { runSync, printSyncResults } from "../../ingest/sync.js";
import { error } from "../output.js";

export const ingestCommand = new Command("ingest")
  .description("Parse source code and sync spec nodes to the graph")
  .option("--app <app>", "Application name (e.g. myapp)")
  .option("--frontend <path>", "Path to frontend repo (parses App.jsx for Screen nodes)")
  .option("--backend <path>", "Path to backend repo (parses unified-stack/template.yaml for APIEndpoint nodes)")
  .option("--apply", "Commit changes to the graph (default: dry-run)")
  .action(async (opts) => {
    const cfg = getConfig();
    const app = opts.app ?? cfg.app;
    const frontend = opts.frontend ?? (cfg.ingest?.frontend || undefined);
    const backend = opts.backend ?? (cfg.ingest?.backend || undefined);

    if (!app) {
      error("Provide --app or set \"app\" in .nexo/config.json");
      process.exit(1);
    }

    if (!frontend && !backend) {
      error("Provide at least one of --frontend or --backend (flags or .nexo/config.json ingest paths)");
      process.exit(1);
    }

    try {
      const db = await getDb();
      const results = await runSync(db, {
        app,
        frontendPath: frontend,
        backendPath: backend,
        apply: Boolean(opts.apply),
      });

      printSyncResults(results, Boolean(opts.apply));
      await closeDb();
    } catch (err: any) {
      error(err.message);
      await closeDb();
      process.exit(1);
    }
  });
