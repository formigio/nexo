import { Surreal } from "surrealdb";
import { runMigrations } from "../../src/db/migrate.js";

const TEST_DB_CONFIG = {
  url: process.env.NEXO_TEST_DB_URL ?? "http://localhost:8000",
  namespace: "nexo_test",
  database: "nexo_test",
  username: "root",
  password: "root",
};

let db: Surreal | null = null;
let migrated = false;

/**
 * Get a test DB connection. Lazily connects + migrates on first call.
 */
export async function getTestDb(): Promise<Surreal> {
  if (db) return db;

  db = new Surreal();
  await db.connect(TEST_DB_CONFIG.url);
  await db.signin({
    username: TEST_DB_CONFIG.username,
    password: TEST_DB_CONFIG.password,
  });

  // Ensure namespace + database exist
  await db.use({ namespace: TEST_DB_CONFIG.namespace });
  await db.query(
    `DEFINE DATABASE IF NOT EXISTS ${TEST_DB_CONFIG.database}`
  );
  await db.use({
    namespace: TEST_DB_CONFIG.namespace,
    database: TEST_DB_CONFIG.database,
  });

  if (!migrated) {
    await runMigrations(db);
    migrated = true;
  }

  return db;
}

/**
 * Delete all data but keep schema. Fast cleanup between tests.
 */
export async function cleanTestDb(): Promise<void> {
  if (!db) return;
  await db.query("DELETE edge");
  await db.query("DELETE node");
}

/**
 * Close the test DB connection. Call in afterAll.
 */
export async function closeTestDb(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    migrated = false;
  }
}
