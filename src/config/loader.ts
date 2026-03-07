import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { homedir } from "node:os";
import { NexoConfigSchema, DEFAULTS } from "./schema.js";
import type { NexoConfig } from "./schema.js";
import type { DbConfig } from "../db/client.js";

let cached: NexoConfig | null = null;

export interface ApiConfig {
  url: string;
  key?: string;
}

/**
 * Resolve the user-level config directory.
 * Honors `$NEXO_HOME`; falls back to `~/.nexo`.
 */
export function getUserConfigDir(): string {
  return process.env.NEXO_HOME ?? join(homedir(), ".nexo");
}

/**
 * Absolute path to the user-level config file.
 */
export function getUserConfigPath(): string {
  return join(getUserConfigDir(), "config.json");
}

/**
 * Load and validate a single config file.
 * Returns `{}` if the file doesn't exist.
 */
function loadConfigFile(path: string, label: string): NexoConfig {
  if (!existsSync(path)) return {};

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf-8"));
  } catch (err: any) {
    throw new Error(`${label}: invalid JSON — ${err.message}`);
  }

  const result = NexoConfigSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`${label}: validation failed\n${issues}`);
  }

  return result.data;
}

/**
 * Deep-merge two NexoConfig objects. `higher` wins for each defined field.
 */
function mergeConfigs(lower: NexoConfig, higher: NexoConfig): NexoConfig {
  const merged: NexoConfig = { ...lower };

  // Top-level scalars
  if (higher.app !== undefined) merged.app = higher.app;

  // Nested objects — field-by-field merge
  if (lower.db || higher.db) {
    merged.db = { ...lower.db, ...higher.db };
  }
  if (lower.ingest || higher.ingest) {
    merged.ingest = { ...lower.ingest, ...higher.ingest };
  }
  if (lower.web || higher.web) {
    merged.web = { ...lower.web, ...higher.web };
  }
  if (lower.api || higher.api) {
    merged.api = { ...lower.api, ...higher.api };
  }

  return merged;
}

/**
 * Load and merge user config (`~/.nexo/config.json`) and project config
 * (`.nexo/config.json` in cwd). Project config wins over user config.
 * Caches the result — subsequent calls return the same object.
 */
export function loadConfig(cwd: string = process.cwd()): NexoConfig {
  if (cached) return cached;

  const userConfig = loadConfigFile(
    getUserConfigPath(),
    `~/.nexo/config.json`,
  );
  const projectConfig = loadConfigFile(
    resolve(cwd, ".nexo", "config.json"),
    `.nexo/config.json`,
  );

  cached = mergeConfigs(userConfig, projectConfig);
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
 *   hardcoded defaults → user config → project config → env vars
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

/**
 * Build an ApiConfig from merged config + env var overrides.
 * Returns `null` if no API URL is configured anywhere.
 */
export function getApiConfig(): ApiConfig | null {
  const cfg = getConfig();
  const url = process.env.NEXO_API_URL ?? cfg.api?.url;
  if (!url) return null;

  return {
    url,
    key: process.env.NEXO_API_KEY ?? cfg.api?.key,
  };
}

/** Reset cached config (useful for testing). */
export function resetConfig(): void {
  cached = null;
}
