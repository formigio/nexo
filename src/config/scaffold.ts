import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { getUserConfigPath } from "./loader.js";

const EXAMPLE_RULE = `// Example custom lint rule for Nexo.
// Rename this file (remove the _ prefix) to activate it.
// Files starting with _ are ignored by the rule loader.
//
// Each file must \`export default\` a LintRule object (or an array of them).
// A LintRule has: id, severity, category, description, check(ctx).
//
// The check function receives a LintContext with:
//   nodes, edges, nodeById, nodesByType, edgesFrom, edgesTo
//
// Example: flag Components that have no incoming or outgoing edges
// besides their RENDERS edge from a Screen.

export default {
  id: "no-lonely-components",
  severity: "info",
  category: "completeness",
  description: "Components with only a RENDERS edge and nothing else",
  check(ctx) {
    const violations = [];
    const components = ctx.nodesByType.get("Component") ?? [];
    for (const cmp of components) {
      const inEdges = ctx.edgesTo.get(cmp.id) ?? [];
      const outEdges = ctx.edgesFrom.get(cmp.id) ?? [];
      const totalEdges = inEdges.length + outEdges.length;
      // If the only edge is the RENDERS from a Screen, flag it
      if (totalEdges === 1 && inEdges.length === 1 && inEdges[0].type === "RENDERS") {
        violations.push({
          nodeId: cmp.id,
          nodeName: cmp.name,
          nodeType: cmp.type,
          message: \`Component "\${cmp.name}" only has a RENDERS edge — consider adding TRIGGERS, CALLS, or BELONGS_TO edges\`,
          fix: "Add edges to describe this component's behavior and feature ownership",
        });
      }
    }
    return violations;
  },
};
`;

const STARTER_CONFIG = `{
  "app": "",
  "db": {
    "url": "http://localhost:8000",
    "namespace": "nexo",
    "database": "nexo",
    "username": "root",
    "password": "root"
  },
  "ingest": {
    "frontend": "",
    "backend": ""
  },
  "web": {
    "port": 3000,
    "host": "127.0.0.1"
  }
}
`;

/**
 * Create `.nexo/config.json` in the given directory.
 * Returns the path to the created file, or null if it already exists.
 */
export function scaffoldConfig(cwd: string = process.cwd()): string | null {
  const dir = resolve(cwd, ".nexo");
  const configPath = resolve(dir, "config.json");

  if (existsSync(configPath)) {
    return null;
  }

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(configPath, STARTER_CONFIG, "utf-8");

  // Create rules directory with example file
  const rulesDir = resolve(dir, "rules");
  if (!existsSync(rulesDir)) {
    mkdirSync(rulesDir, { recursive: true });
  }
  const examplePath = resolve(rulesDir, "_example.js");
  if (!existsSync(examplePath)) {
    writeFileSync(examplePath, EXAMPLE_RULE, "utf-8");
  }

  return configPath;
}

const USER_STARTER_CONFIG = `{
  "db": {
    "username": "root",
    "password": "root"
  },
  "api": {
    "url": "",
    "key": ""
  }
}
`;

/**
 * Create `~/.nexo/config.json` with user-appropriate defaults.
 * Returns the path to the created file, or null if it already exists.
 */
export function scaffoldUserConfig(): string | null {
  const configPath = getUserConfigPath();

  if (existsSync(configPath)) {
    return null;
  }

  const dir = dirname(configPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(configPath, USER_STARTER_CONFIG, "utf-8");
  return configPath;
}
