import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { KIND_LOAD_ORDER, type SpecFileKind } from "./types.js";

export interface DiscoveredFile {
  path: string;
  kind: SpecFileKind;
}

/**
 * Discover all *.graph.yaml files in a directory tree,
 * sorted by kind load order (infra → data → shared → feature),
 * then alphabetically within each kind.
 */
export function discoverSpecFiles(specsDir: string): DiscoveredFile[] {
  const files: DiscoveredFile[] = [];
  walkDir(specsDir, files);

  files.sort((a, b) => {
    const orderA = KIND_LOAD_ORDER.indexOf(a.kind);
    const orderB = KIND_LOAD_ORDER.indexOf(b.kind);
    if (orderA !== orderB) return orderA - orderB;
    return a.path.localeCompare(b.path);
  });

  return files;
}

function walkDir(dir: string, files: DiscoveredFile[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath, { throwIfNoEntry: false });
    if (!stat) continue;

    if (stat.isDirectory()) {
      walkDir(fullPath, files);
    } else if (entry.endsWith(".graph.yaml")) {
      const kind = readFileKind(fullPath);
      if (kind) {
        files.push({ path: fullPath, kind });
      }
    }
  }
}

function readFileKind(filePath: string): SpecFileKind | null {
  try {
    const content = readFileSync(filePath, "utf-8");
    const data = yaml.load(content) as any;
    const kind = data?.kind;
    if (KIND_LOAD_ORDER.includes(kind)) return kind;
    return null;
  } catch {
    return null;
  }
}
