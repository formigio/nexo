import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { LintRule } from "./types.js";

const REQUIRED_FIELDS = ["id", "severity", "category", "description", "check"] as const;

function isValidRule(obj: unknown): obj is LintRule {
  if (!obj || typeof obj !== "object") return false;
  const record = obj as Record<string, unknown>;
  return REQUIRED_FIELDS.every((f) => f in record) && typeof record.check === "function";
}

/**
 * Discover and load custom lint rules from `.nexo/rules/*.js`.
 * Files starting with `_` are skipped (used for examples/docs).
 * Invalid rules log a warning and are skipped.
 */
export async function loadCustomRules(cwd: string = process.cwd()): Promise<LintRule[]> {
  const rulesDir = resolve(cwd, ".nexo", "rules");

  if (!existsSync(rulesDir)) return [];

  const files = readdirSync(rulesDir)
    .filter((f) => f.endsWith(".js") && !f.startsWith("_"))
    .sort();

  if (files.length === 0) return [];

  const rules: LintRule[] = [];

  for (const file of files) {
    const filePath = resolve(rulesDir, file);
    try {
      const mod = await import(pathToFileURL(filePath).href);
      const exported = mod.default;

      if (!exported) {
        console.warn(`[lint] ${file}: no default export — skipping`);
        continue;
      }

      // Support single rule or array of rules
      const items = Array.isArray(exported) ? exported : [exported];

      for (const item of items) {
        if (isValidRule(item)) {
          rules.push(item);
        } else {
          console.warn(`[lint] ${file}: invalid rule object (missing required fields) — skipping`);
        }
      }
    } catch (err: any) {
      console.warn(`[lint] ${file}: failed to load — ${err.message}`);
    }
  }

  return rules;
}
