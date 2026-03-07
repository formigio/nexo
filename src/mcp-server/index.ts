#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "../config/loader.js";
import { getClient } from "../client/factory.js";
import type { GraphClient } from "../client/types.js";
import { registerNodeTools } from "./tools/nodes.js";
import { registerEdgeTools } from "./tools/edges.js";
import { registerGraphTools } from "./tools/graph.js";
import { registerAppTools } from "./tools/apps.js";

const server = new McpServer({
  name: "nexo",
  version: "1.1.0",
});

let client: GraphClient;

async function main() {
  loadConfig();
  client = await getClient();

  registerNodeTools(server, client);
  registerEdgeTools(server, client);
  registerGraphTools(server, client);
  registerAppTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Nexo MCP server running on stdio");
}

process.on("SIGINT", async () => {
  if (client) await client.close();
  process.exit(0);
});

main().catch(async (error) => {
  console.error("Fatal error:", error);
  if (client) await client.close();
  process.exit(1);
});
