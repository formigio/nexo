import { Command } from "commander";
import { initDb, closeDb } from "../../db/client.js";
import { runMigrations } from "../../db/migrate.js";
import { scaffoldConfig } from "../../config/scaffold.js";
import { heading, success, info, error } from "../output.js";

export const initCommand = new Command("init")
  .description("Initialize the Nexo database schema")
  .option("--config", "Scaffold a .nexo/config.json in the current directory")
  .action(async (opts) => {
    try {
      if (opts.config) {
        const path = scaffoldConfig();
        if (path) {
          success(`Created ${path}`);
        } else {
          info(".nexo/config.json already exists — skipping");
        }
        return;
      }

      heading("Initializing Nexo database");

      const db = await initDb();
      info("Connected to SurrealDB");

      const files = await runMigrations(db);
      for (const file of files) {
        success(`Applied ${file}`);
      }

      success(`Schema initialized (${files.length} migration(s))`);
      await closeDb();
    } catch (err: any) {
      error(err.message);
      await closeDb();
      process.exit(1);
    }
  });
