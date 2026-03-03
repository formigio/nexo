import { existsSync, readdirSync } from "fs";
import { join, resolve } from "path";
import type { Surreal } from "surrealdb";
import { listEdges } from "../db/edges.js";
import type { Node } from "../schema/types.js";
import type { ParsedEndpoint } from "./parsers/sam.js";
import type { ParsedScreen } from "./parsers/routes.js";

export interface SourceMapConfig {
  frontendRoot?: string;
  backendRoot?: string;
}

/**
 * Map a parsed API endpoint to its source handler file path.
 * Uses the handler field (e.g. "api/trips.handler") to resolve the file.
 */
export function endpointSourceFile(
  ep: ParsedEndpoint,
  config: SourceMapConfig
): string | null {
  if (!config.backendRoot) return null;

  // Handler format: "api/trips.handler" → src/api/trips.js (or .ts, .mjs, etc.)
  const handlerPath = ep.handler.replace(/\.[^.]+$/, ""); // strip .handler
  const srcRoot = join(resolve(config.backendRoot), "unified-stack", "src");
  const extensions = [".js", ".ts", ".mjs", ".cjs"];

  for (const ext of extensions) {
    const candidate = join(srcRoot, handlerPath + ext);
    if (existsSync(candidate)) return candidate;
  }

  // Try without unified-stack subdirectory
  const altRoot = resolve(config.backendRoot);
  for (const ext of extensions) {
    const candidate = join(altRoot, "src", handlerPath + ext);
    if (existsSync(candidate)) return candidate;
  }

  return null;
}

/**
 * Map a parsed screen to its source component file path.
 * Searches the frontend src directory for a file matching the component name.
 */
export function screenSourceFile(
  screen: ParsedScreen,
  config: SourceMapConfig
): string | null {
  if (!config.frontendRoot) return null;

  const srcRoot = join(resolve(config.frontendRoot), "src");
  const target = screen.componentName;

  return findComponentFile(srcRoot, target);
}

/**
 * Map a nexo node ID to its source file via the parsed data.
 * Used by the validate command when given a node ID directly.
 */
export function nodeIdToSourceFile(
  nodeId: string,
  endpoints: ParsedEndpoint[],
  screens: ParsedScreen[],
  config: SourceMapConfig
): string | null {
  // Try matching against API endpoints
  for (const ep of endpoints) {
    const method = ep.method.toLowerCase();
    const pathSlug = ep.path
      .toLowerCase()
      .replace(/[{}]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .replace(/_+/g, "_");
    const expectedId = `api_${method}_${pathSlug}`;

    if (expectedId === nodeId) {
      return endpointSourceFile(ep, config);
    }
  }

  // Try matching against screens via parsed routes
  for (const screen of screens) {
    const slug = screen.componentName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    const expectedId = `scr_${slug}`;

    if (expectedId === nodeId) {
      return screenSourceFile(screen, config);
    }
  }

  // Fallback for Screen nodes: derive component name from ID and search directly.
  // Handles pre-ingest manual nodes (e.g. scr_schedule → Schedule, scr_my_trips → MyTrips).
  if (nodeId.startsWith("scr_") && config.frontendRoot) {
    const componentName = nodeId
      .slice(4) // strip "scr_"
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("");
    const srcRoot = join(resolve(config.frontendRoot), "src");
    const file = findComponentFile(srcRoot, componentName);
    if (file) return file;
  }

  return null;
}

/**
 * Resolve the source file for any node type.
 * - APIEndpoint / Screen: sync lookup via parsed source data
 * - BusinessRule: follow AUTHORIZES edges to APIEndpoint nodes, use their handler
 */
export async function resolveSourceFile(
  db: Surreal,
  node: Node,
  endpoints: ParsedEndpoint[],
  screens: ParsedScreen[],
  config: SourceMapConfig
): Promise<string | null> {
  if (node.type === "BusinessRule") {
    return businessRuleSourceFile(db, node.id, endpoints, config);
  }
  return nodeIdToSourceFile(node.id, endpoints, screens, config);
}

/**
 * For a BusinessRule node, follow AUTHORIZES edges to APIEndpoint nodes,
 * then resolve their handler source file.
 */
async function businessRuleSourceFile(
  db: Surreal,
  ruleId: string,
  endpoints: ParsedEndpoint[],
  config: SourceMapConfig
): Promise<string | null> {
  const edges = await listEdges(db, { from: ruleId, type: "AUTHORIZES" });

  for (const edge of edges) {
    // edge.out is the APIEndpoint node ID (e.g. api_post_trips_tripid_activities)
    const file = nodeIdToSourceFile(edge.out, endpoints, [], config);
    if (file) return file;
  }

  return null;
}

/**
 * Recursively search for a component file by name in a directory.
 */
function findComponentFile(dir: string, componentName: string): string | null {
  if (!existsSync(dir)) return null;

  const extensions = [".jsx", ".tsx", ".js", ".ts"];

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        const found = findComponentFile(fullPath, componentName);
        if (found) return found;
      } else if (entry.isFile()) {
        for (const ext of extensions) {
          if (entry.name === componentName + ext) {
            return fullPath;
          }
        }
      }
    }
  } catch {
    // ignore read errors
  }

  return null;
}
