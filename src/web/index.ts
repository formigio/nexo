import { createServer, type Server } from "node:http";
import type { Surreal } from "surrealdb";
import { createHandler } from "./routes.js";

export interface ServerOptions {
  port?: number;
  host?: string;
  app?: string;
}

export function startServer(
  db: Surreal,
  opts: ServerOptions = {}
): Promise<Server> {
  const port = opts.port ?? 3000;
  const host = opts.host ?? "127.0.0.1";
  const handler = createHandler(db, opts.app);

  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      handler(req, res).catch((err) => {
        console.error("Unhandled route error:", err);
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Internal server error" }));
        }
      });
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        reject(new Error(`Port ${port} is already in use`));
      } else {
        reject(err);
      }
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log("\nShutting down...");
      server.close(() => {
        process.exit(0);
      });
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    server.listen(port, host, () => {
      resolve(server);
    });
  });
}
