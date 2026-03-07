import { Command } from "commander";
import { getApiConfig } from "../../config/loader.js";
import { scaffoldConfig, scaffoldUserConfig } from "../../config/scaffold.js";
import { heading, success, info, error } from "../output.js";

export const initCommand = new Command("init")
  .description("Initialize the Nexo database schema")
  .option("--config", "Scaffold a .nexo/config.json in the current directory")
  .option("--user-config", "Scaffold ~/.nexo/config.json for user-level defaults")
  .action(async (opts) => {
    try {
      if (opts.config || opts.userConfig) {
        if (opts.config) {
          const path = scaffoldConfig();
          if (path) {
            success(`Created ${path}`);
          } else {
            info(".nexo/config.json already exists — skipping");
          }
        }
        if (opts.userConfig) {
          const path = scaffoldUserConfig();
          if (path) {
            success(`Created ${path}`);
          } else {
            info("~/.nexo/config.json already exists — skipping");
          }
        }
        return;
      }

      heading("Initializing Nexo database");

      const apiConfig = getApiConfig();
      if (apiConfig) {
        // Remote mode: POST /api/init
        const { HttpGraphClient } = await import("../../client/http-client.js");
        const client = new HttpGraphClient(apiConfig);
        const files = await client.init();
        for (const file of files) {
          success(`Applied ${file}`);
        }
        success(`Schema initialized (${files.length} migration(s))`);
      } else {
        // Direct DB mode
        const { initDb, closeDb } = await import("../../db/client.js");
        const { runMigrations } = await import("../../db/migrate.js");

        const db = await initDb();
        info("Connected to SurrealDB");

        const files = await runMigrations(db);
        for (const file of files) {
          success(`Applied ${file}`);
        }

        success(`Schema initialized (${files.length} migration(s))`);
        await closeDb();
      }
    } catch (err: any) {
      error(err.message);
      process.exit(1);
    }
  });
