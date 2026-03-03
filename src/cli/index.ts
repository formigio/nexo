#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Command } from "commander";
import { loadConfig } from "../config/loader.js";
import { initCommand } from "./commands/init.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, "../../package.json"), "utf-8"));
import { nodeCommand } from "./commands/node.js";
import { edgeCommand } from "./commands/edge.js";
import { traverseCommand } from "./commands/traverse.js";
import { impactCommand } from "./commands/impact.js";
import { appCommand } from "./commands/app.js";
import { featureCommand } from "./commands/feature.js";
import { ingestCommand } from "./commands/ingest.js";
import { webCommand } from "./commands/web.js";
import { coverageCommand } from "./commands/coverage.js";
import { specCommand } from "./commands/spec.js";
import { lintCommand } from "./commands/lint.js";

loadConfig();

const program = new Command();

program
  .name("nexo")
  .description("Nexo — specification graph system")
  .version(pkg.version);

program.addCommand(initCommand);
program.addCommand(nodeCommand);
program.addCommand(edgeCommand);
program.addCommand(traverseCommand);
program.addCommand(impactCommand);
program.addCommand(appCommand);
program.addCommand(featureCommand);
program.addCommand(ingestCommand);
program.addCommand(webCommand);
program.addCommand(coverageCommand);
program.addCommand(specCommand);
program.addCommand(lintCommand);

program.parse();
