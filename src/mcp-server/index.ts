#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "../config/loader.js";
import { getDb, closeDb } from "../db/client.js";
import { registerNodeTools } from "./tools/nodes.js";
import { registerEdgeTools } from "./tools/edges.js";
import { registerGraphTools } from "./tools/graph.js";
import { registerAppTools } from "./tools/apps.js";

const server = new McpServer({
  name: "nexo",
  version: "1.0.0",
});

async function main() {
  loadConfig();
  const db = await getDb();

  registerNodeTools(server, db);
  registerEdgeTools(server, db);
  registerGraphTools(server, db);
  registerAppTools(server, db);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Nexo MCP server running on stdio");
}

process.on("SIGINT", async () => {
  await closeDb();
  process.exit(0);
});

main().catch(async (error) => {
  console.error("Fatal error:", error);
  await closeDb();
  process.exit(1);
});
