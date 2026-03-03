import { Surreal } from "surrealdb";
import { getDbConfig } from "../config/loader.js";

let db: Surreal | null = null;

const HEALTH_TIMEOUT_MS = 2000;

async function isHealthy(instance: Surreal): Promise<boolean> {
  try {
    await Promise.race([
      instance.health(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("health check timeout")), HEALTH_TIMEOUT_MS)
      ),
    ]);
    return true;
  } catch {
    return false;
  }
}

async function clearStaleDb(): Promise<void> {
  if (!db) return;
  console.warn("[nexo] SurrealDB connection stale — reconnecting…");
  try { await db.close(); } catch { /* ignore close errors on stale connection */ }
  db = null;
}

export interface DbConfig {
  url: string;
  namespace: string;
  database: string;
  username: string;
  password: string;
}

/**
 * Ensure the namespace and database exist, then connect to them.
 * Used by `nexo init`.
 */
export async function initDb(config: DbConfig = getDbConfig()): Promise<Surreal> {
  if (db) await clearStaleDb();

  const instance = new Surreal();
  await instance.connect(config.url);
  await instance.signin({ username: config.username, password: config.password });

  // Create namespace at root scope, then select it
  await instance.use({ namespace: config.namespace });
  await instance.query(`DEFINE DATABASE IF NOT EXISTS ${config.database}`);
  await instance.use({ namespace: config.namespace, database: config.database });

  db = instance;
  return instance;
}

/**
 * Get a connection to the configured namespace/database.
 * Assumes namespace and database already exist (use initDb for first-time setup).
 */
export async function getDb(config: DbConfig = getDbConfig()): Promise<Surreal> {
  if (db) {
    if (await isHealthy(db)) return db;
    await clearStaleDb();
  }

  db = new Surreal();
  await db.connect(config.url);
  await db.signin({ username: config.username, password: config.password });
  await db.use({ namespace: config.namespace, database: config.database });
  return db;
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}
