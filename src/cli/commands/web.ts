import { Command } from "commander";
import { getDb } from "../../db/client.js";
import { getConfig } from "../../config/loader.js";
import { DEFAULTS } from "../../config/schema.js";
import { startServer } from "../../web/index.js";

export const webCommand = new Command("web")
  .description("Start the graph visualization web server")
  .option("-p, --port <number>", "Port to listen on")
  .option("-H, --host <address>", "Host to bind to")
  .option("-a, --app <name>", "Filter to a specific app")
  .action(async (opts) => {
    try {
      const cfg = getConfig();
      const port = opts.port != null
        ? parseInt(opts.port, 10)
        : cfg.web?.port ?? DEFAULTS.web.port;
      const host = opts.host ?? cfg.web?.host ?? DEFAULTS.web.host;
      const app = opts.app ?? cfg.app;

      const db = await getDb();
      await startServer(db, { port, host, app });
      console.log(`\nNexo graph server running at http://localhost:${port}`);
      if (app) console.log(`Filtered to app: ${app}`);
      console.log("Press Ctrl+C to stop\n");
    } catch (err: any) {
      console.error("Error:", err.message);
      process.exit(1);
    }
  });
