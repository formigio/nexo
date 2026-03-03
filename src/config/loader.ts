import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { NexoConfigSchema, DEFAULTS } from "./schema.js";
import type { NexoConfig } from "./schema.js";
import type { DbConfig } from "../db/client.js";

let cached: NexoConfig | null = null;

/**
 * Load and validate `.nexo/config.json` from the current working directory.
 * Returns an empty config if the file doesn't exist.
 * Caches the result — subsequent calls return the same object.
 */
export function loadConfig(cwd: string = process.cwd()): NexoConfig {
  if (cached) return cached;

  const configPath = resolve(cwd, ".nexo", "config.json");

  if (!existsSync(configPath)) {
    cached = {};
    return cached;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(configPath, "utf-8"));
  } catch (err: any) {
    throw new Error(
      `.nexo/config.json: invalid JSON — ${err.message}`
    );
  }

  const result = NexoConfigSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`.nexo/config.json: validation failed\n${issues}`);
  }

  cached = result.data;
  return cached;
}

/**
 * Get the cached config, loading it first if needed.
 */
export function getConfig(): NexoConfig {
  if (!cached) loadConfig();
  return cached!;
}

/**
 * Build a DbConfig by merging (lowest to highest priority):
 *   hardcoded defaults → .nexo/config.json → env vars
 *
 * CLI flags are NOT handled here — callers that accept explicit
 * DB flags should merge them on top of this result.
 */
export function getDbConfig(): DbConfig {
  const cfg = getConfig();
  return {
    url: process.env.NEXO_DB_URL ?? cfg.db?.url ?? DEFAULTS.db.url,
    namespace: process.env.NEXO_DB_NS ?? cfg.db?.namespace ?? DEFAULTS.db.namespace,
    database: process.env.NEXO_DB_DB ?? cfg.db?.database ?? DEFAULTS.db.database,
    username: process.env.NEXO_DB_USER ?? cfg.db?.username ?? DEFAULTS.db.username,
    password: process.env.NEXO_DB_PASS ?? cfg.db?.password ?? DEFAULTS.db.password,
  };
}

/** Reset cached config (useful for testing). */
export function resetConfig(): void {
  cached = null;
}
