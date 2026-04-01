import { readdirSync, existsSync, statSync } from "fs";
import { join, relative, extname, basename } from "path";

export interface ParsedSourceFile {
  repo: string;
  relativePath: string;
  language: string;
  layer: string;
}

import { DEFAULTS } from "../../config/schema.js";

const BUILTIN_SKIP_DIRS = new Set(DEFAULTS.ingest.builtinSkipDirs);

const LANG_MAP: Record<string, string> = {
  ".jsx": "jsx", ".tsx": "tsx", ".js": "js", ".ts": "ts",
  ".yaml": "yaml", ".yml": "yaml", ".json": "json",
  ".css": "css", ".surql": "surql",
};

/**
 * Walk a directory recursively and classify source files.
 */
export function parseSourceFiles(
  rootPath: string,
  repo: string,
  extraSkipDirs?: string[],
): ParsedSourceFile[] {
  if (!existsSync(rootPath)) return [];

  const skipDirs = extraSkipDirs?.length
    ? new Set([...BUILTIN_SKIP_DIRS, ...extraSkipDirs])
    : BUILTIN_SKIP_DIRS;

  const files: ParsedSourceFile[] = [];
  walkDir(rootPath, rootPath, repo, files, skipDirs);
  return files;
}

function walkDir(
  dir: string,
  rootPath: string,
  repo: string,
  files: ParsedSourceFile[],
  skipDirs: Set<string>,
): void {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (skipDirs.has(entry.name)) continue;

    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      walkDir(fullPath, rootPath, repo, files, skipDirs);
    } else if (entry.isFile()) {
      const ext = extname(entry.name);
      const language = LANG_MAP[ext];
      if (!language) continue;

      const relativePath = relative(rootPath, fullPath);
      const layer = classifyLayer(relativePath);

      files.push({ repo, relativePath, language, layer });
    }
  }
}

/**
 * Classify a file into an architectural layer based on its path.
 */
function classifyLayer(relativePath: string): string {
  const lower = relativePath.toLowerCase();

  // Frontend layers
  if (lower.includes("/screens/") || lower.includes("/pages/")) return "page";
  if (lower.includes("/components/")) return "component";
  if (lower.includes("/hooks/")) return "hook";
  if (lower.includes("/context/")) return "context";

  // Backend layers
  if (lower.includes("/api/")) {
    if (lower.includes("webhook")) return "webhook";
    return "api-handler";
  }
  if (lower.includes("/auth/")) return "auth-handler";

  // Config
  if (lower.endsWith("template.yaml") || lower.endsWith("template.yml")) return "config";
  if (lower.endsWith("package.json") || lower.endsWith("tsconfig.json")) return "config";

  // Style
  if (lower.endsWith(".css")) return "style";

  // Test
  if (lower.includes(".test.") || lower.includes(".spec.")) return "test";

  return "other";
}

/**
 * Generate a node name from repo name and relative path.
 * e.g., ("my-frontend", "src/screens/Schedule.jsx") → "my-frontend/src/screens/Schedule.jsx"
 */
export function sourceFileName(repo: string, relativePath: string): string {
  return `${repo}/${relativePath}`;
}
