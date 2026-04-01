import chalk from "chalk";
import type { GraphClient } from "../client/types.js";
import { generateNodeId } from "../schema/ids.js";
import type { Node } from "../schema/types.js";
import type { ParsedEndpoint } from "./parsers/sam.js";
import type { ParsedScreen } from "./parsers/routes.js";
import { basename, resolve, join } from "node:path";
import { existsSync } from "node:fs";
import { DEFAULTS } from "../config/schema.js";
import type { ParsedSourceFile } from "./parsers/sourceFiles.js";
import { endpointName, parseSamTemplate } from "./parsers/sam.js";
import { screenName, parseRoutes } from "./parsers/routes.js";
import { parseSourceFiles, sourceFileName } from "./parsers/sourceFiles.js";
import { endpointSourceFile, screenSourceFile } from "../ingest/sourceMap.js";

export interface SyncOptions {
  app: string;
  frontendPath?: string;
  backendPath?: string;
  apply?: boolean;
  samTemplate?: string;
  appEntry?: string;
  handlerSourceRoots?: string[];
  skipDirs?: string[];
}

export interface SyncResults {
  endpoints: TypeSyncResult;
  screens: TypeSyncResult;
  sourceFiles: TypeSyncResult;
  implementedInEdges: { created: number; skipped: number };
}

export interface TypeSyncResult {
  unchanged: string[];
  created: string[];
  updated: Array<{ id: string; changes: string[] }>;
}

interface PropsUpdate {
  [key: string]: { old: unknown; new: unknown };
}

/**
 * Find the SAM template file within a backend path.
 * If `configured` is set, resolves it directly; otherwise searches candidates.
 */
function findSamTemplate(backendPath: string, configured?: string): string {
  if (configured) {
    const resolved = join(backendPath, configured);
    if (existsSync(resolved)) return resolved;
    throw new Error(
      `Configured SAM template not found: ${resolved}\n` +
      `  (set via ingest.samTemplate in .nexo/config.json)`
    );
  }

  const candidates = DEFAULTS.ingest.samTemplateCandidates.map(
    (c) => join(backendPath, c)
  );
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    `No SAM template found in ${backendPath}. Checked:\n` +
    candidates.map((c) => `  - ${c}`).join("\n") +
    `\n  Hint: set ingest.samTemplate in .nexo/config.json`
  );
}

/**
 * Find the React app entry file (App.tsx or App.jsx).
 * If `configured` is set, resolves it directly; otherwise searches candidates.
 */
function findAppEntry(frontendPath: string, configured?: string): string {
  if (configured) {
    const resolved = join(frontendPath, configured);
    if (existsSync(resolved)) return resolved;
    throw new Error(
      `Configured app entry not found: ${resolved}\n` +
      `  (set via ingest.appEntry in .nexo/config.json)`
    );
  }

  const candidates = DEFAULTS.ingest.appEntryCandidates.map(
    (c) => join(frontendPath, c)
  );
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    `No App entry file found in ${frontendPath}. Checked:\n` +
    candidates.map((c) => `  - ${c}`).join("\n") +
    `\n  Hint: set ingest.appEntry in .nexo/config.json`
  );
}

/**
 * Run the full ingest sync. Dry-run by default unless opts.apply is true.
 */
export async function runSync(client: GraphClient, opts: SyncOptions): Promise<SyncResults> {
  const results: SyncResults = {
    endpoints: { unchanged: [], created: [], updated: [] },
    screens: { unchanged: [], created: [], updated: [] },
    sourceFiles: { unchanged: [], created: [], updated: [] },
    implementedInEdges: { created: 0, skipped: 0 },
  };

  let parsedEndpoints: ParsedEndpoint[] = [];
  let parsedScreens: ParsedScreen[] = [];

  // Sync APIEndpoints from SAM template
  if (opts.backendPath) {
    const templatePath = findSamTemplate(opts.backendPath, opts.samTemplate);
    parsedEndpoints = parseSamTemplate(templatePath);
    await syncEndpoints(client, parsedEndpoints, opts, results.endpoints);
  }

  // Sync Screens from App.jsx/tsx
  if (opts.frontendPath) {
    const appPath = findAppEntry(opts.frontendPath, opts.appEntry);
    parsedScreens = parseRoutes(appPath);
    await syncScreens(client, parsedScreens, opts, results.screens);
  }

  // Sync SourceFile nodes from filesystem
  const allSourceFiles: ParsedSourceFile[] = [];
  if (opts.frontendPath) {
    const repoName = basename(resolve(opts.frontendPath));
    allSourceFiles.push(...parseSourceFiles(opts.frontendPath, repoName, opts.skipDirs));
  }
  if (opts.backendPath) {
    const repoName = basename(resolve(opts.backendPath));
    allSourceFiles.push(...parseSourceFiles(opts.backendPath, repoName, opts.skipDirs));
  }
  if (allSourceFiles.length > 0) {
    await syncSourceFiles(client, allSourceFiles, opts, results.sourceFiles);
  }

  // Sync IMPLEMENTED_IN edges (match spec nodes to source files)
  if (allSourceFiles.length > 0) {
    await syncImplementedInEdges(
      client, opts, parsedEndpoints, parsedScreens, results.implementedInEdges,
    );
  }

  return results;
}

async function syncEndpoints(
  client: GraphClient,
  endpoints: ParsedEndpoint[],
  opts: SyncOptions,
  result: TypeSyncResult
): Promise<void> {
  for (const ep of endpoints) {
    const name = endpointName(ep);
    const id = generateNodeId("APIEndpoint", name);

    const newProps = {
      method: ep.method,
      path: ep.path,
      authRequired: ep.authRequired,
    };

    const existing = await client.getNode(id);

    if (!existing) {
      if (opts.apply) {
        await client.createNode({
          type: "APIEndpoint",
          app: opts.app,
          name,
          description: "",
          tags: [],
          props: newProps,
        });
      }
      result.created.push(id);
    } else {
      const changes = diffProps(existing.props, newProps);
      if (changes.length === 0) {
        result.unchanged.push(id);
      } else {
        if (opts.apply) {
          await client.updateNode(id, { props: { ...existing.props, ...newProps } });
        }
        result.updated.push({ id, changes });
      }
    }
  }
}

async function syncScreens(
  client: GraphClient,
  screens: ParsedScreen[],
  opts: SyncOptions,
  result: TypeSyncResult
): Promise<void> {
  // Deduplicate by component name (same component may appear on multiple routes)
  const seen = new Set<string>();

  for (const screen of screens) {
    const name = screenName(screen);
    const id = generateNodeId("Screen", name);

    if (seen.has(id)) continue;
    seen.add(id);

    const newProps = {
      route: screen.route,
      accessLevel: screen.accessLevel,
    };

    const existing = await client.getNode(id);

    if (!existing) {
      if (opts.apply) {
        await client.createNode({
          type: "Screen",
          app: opts.app,
          name,
          description: "",
          tags: [],
          props: { ...newProps, platform: ["web"] },
        });
      }
      result.created.push(id);
    } else {
      const changes = diffProps(existing.props, newProps);
      if (changes.length === 0) {
        result.unchanged.push(id);
      } else {
        if (opts.apply) {
          await client.updateNode(id, { props: { ...existing.props, ...newProps } });
        }
        result.updated.push({ id, changes });
      }
    }
  }
}

async function syncSourceFiles(
  client: GraphClient,
  files: ParsedSourceFile[],
  opts: SyncOptions,
  result: TypeSyncResult
): Promise<void> {
  for (const file of files) {
    const name = sourceFileName(file.repo, file.relativePath);
    const id = generateNodeId("SourceFile", name);

    const newProps = {
      repo: file.repo,
      relativePath: file.relativePath,
      language: file.language,
      layer: file.layer,
    };

    const existing = await client.getNode(id);

    if (!existing) {
      if (opts.apply) {
        await client.createNode({
          type: "SourceFile",
          app: opts.app,
          name,
          description: "",
          tags: [],
          props: newProps,
        });
      }
      result.created.push(id);
    } else {
      const changes = diffProps(existing.props, newProps);
      if (changes.length === 0) {
        result.unchanged.push(id);
      } else {
        if (opts.apply) {
          await client.updateNode(id, { props: { ...existing.props, ...newProps } });
        }
        result.updated.push({ id, changes });
      }
    }
  }
}

async function syncImplementedInEdges(
  client: GraphClient,
  opts: SyncOptions,
  endpoints: ParsedEndpoint[],
  screens: ParsedScreen[],
  result: { created: number; skipped: number },
): Promise<void> {
  const config = {
    frontendRoot: opts.frontendPath,
    backendRoot: opts.backendPath,
    handlerSourceRoots: opts.handlerSourceRoots,
  };

  // Match API endpoints to handler files
  for (const ep of endpoints) {
    const handlerFile = endpointSourceFile(ep, config);
    if (!handlerFile) continue;

    const epName = endpointName(ep);
    const epId = generateNodeId("APIEndpoint", epName);

    // Derive the SourceFile node ID from the file
    const repo = opts.backendPath ? basename(resolve(opts.backendPath)) : "backend";
    const relativePath = handlerFile.includes("unified-stack")
      ? handlerFile.substring(handlerFile.indexOf("unified-stack"))
      : handlerFile;
    const fileName = sourceFileName(repo, relativePath);
    const fileId = generateNodeId("SourceFile", fileName);

    // Check if edge already exists
    const existing = await client.listEdges({ from: epId, to: fileId, type: "IMPLEMENTED_IN" });
    if (existing.length > 0) {
      result.skipped++;
      continue;
    }

    if (opts.apply) {
      try {
        await client.createEdge({ type: "IMPLEMENTED_IN", from: epId, to: fileId });
        result.created++;
      } catch {
        result.skipped++;
      }
    } else {
      result.created++;
    }
  }

  // Match screens to page files
  for (const screen of screens) {
    const pageFile = screenSourceFile(screen, config);
    if (!pageFile) continue;

    const scrName = screenName(screen);
    const scrId = generateNodeId("Screen", scrName);

    const repo = opts.frontendPath ? basename(resolve(opts.frontendPath)) : "frontend";
    const relativePath = pageFile.includes("src/")
      ? pageFile.substring(pageFile.indexOf("src/"))
      : pageFile;
    const fileName = sourceFileName(repo, relativePath);
    const fileId = generateNodeId("SourceFile", fileName);

    const existing = await client.listEdges({ from: scrId, to: fileId, type: "IMPLEMENTED_IN" });
    if (existing.length > 0) {
      result.skipped++;
      continue;
    }

    if (opts.apply) {
      try {
        await client.createEdge({ type: "IMPLEMENTED_IN", from: scrId, to: fileId });
        result.created++;
      } catch {
        result.skipped++;
      }
    } else {
      result.created++;
    }
  }
}

/**
 * Returns human-readable change descriptions for props that differ.
 */
function diffProps(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): string[] {
  const changes: string[] = [];
  for (const [key, newVal] of Object.entries(incoming)) {
    const oldVal = existing[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push(`${key}: ${JSON.stringify(oldVal)} → ${JSON.stringify(newVal)}`);
    }
  }
  return changes;
}

/**
 * Print a formatted sync report to stdout.
 */
export function printSyncResults(results: SyncResults, apply: boolean): void {
  printTypeSyncResult("APIEndpoints", results.endpoints);
  printTypeSyncResult("Screens", results.screens);
  printTypeSyncResult("SourceFiles", results.sourceFiles);

  // IMPLEMENTED_IN edges summary
  const ie = results.implementedInEdges;
  if (ie.created > 0 || ie.skipped > 0) {
    console.log(`\n${chalk.bold("IMPLEMENTED_IN edges:")}`);
    if (ie.created > 0) {
      console.log(chalk.green(`  + New: ${ie.created}`));
    }
    if (ie.skipped > 0) {
      console.log(chalk.dim(`  = Existing/skipped: ${ie.skipped}`));
    }
  }

  if (!apply) {
    console.log(`\n${chalk.yellow("Run with --apply to commit changes.")}`);
  } else {
    console.log(`\n${chalk.green("Changes applied.")}`);
  }
}

function printTypeSyncResult(label: string, result: TypeSyncResult): void {
  const { unchanged, created, updated } = result;
  const total = unchanged.length + created.length + updated.length;

  console.log(`\n${chalk.bold(label + ":")}  (${total} total)`);

  if (unchanged.length > 0) {
    console.log(
      chalk.dim(`  ✓ Unchanged: ${String(unchanged.length).padStart(3)}`)
    );
  }
  if (created.length > 0) {
    const ids = created.slice(0, 5).join(", ") + (created.length > 5 ? ", ..." : "");
    console.log(
      chalk.green(`  + New:       ${String(created.length).padStart(3)}`) +
        chalk.dim(`  → ${ids}`)
    );
  }
  if (updated.length > 0) {
    for (const u of updated) {
      console.log(
        chalk.yellow(`  ~ Updated:     1`) +
          chalk.dim(`  → ${u.id} (${u.changes.join("; ")})`)
      );
    }
  }

  if (total === 0) {
    console.log(chalk.dim("  (nothing parsed)"));
  }
}
