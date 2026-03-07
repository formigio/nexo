import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Surreal } from "surrealdb";

/**
 * Embedded migrations for environments where .surql files aren't on disk
 * (e.g. Lambda bundles built with esbuild).
 */
const EMBEDDED_MIGRATIONS: { name: string; sql: string }[] = [
  {
    name: "001-nodes.surql",
    sql: `DEFINE TABLE IF NOT EXISTS node SCHEMAFULL;
DEFINE FIELD OVERWRITE type ON TABLE node TYPE string
  ASSERT $value IN ["Screen", "Component", "UserState", "UserAction", "APIEndpoint", "DataEntity", "DataField", "BusinessRule", "Feature", "InfraResource", "SourceFile"];
DEFINE FIELD IF NOT EXISTS app ON TABLE node TYPE string;
DEFINE FIELD IF NOT EXISTS name ON TABLE node TYPE string;
DEFINE FIELD IF NOT EXISTS description ON TABLE node TYPE option<string>;
DEFINE FIELD IF NOT EXISTS tags ON TABLE node TYPE array<string> DEFAULT [];
DEFINE FIELD IF NOT EXISTS props ON TABLE node TYPE object FLEXIBLE DEFAULT {};
DEFINE FIELD IF NOT EXISTS createdAt ON TABLE node TYPE datetime DEFAULT time::now();
DEFINE FIELD IF NOT EXISTS updatedAt ON TABLE node TYPE datetime DEFAULT time::now();
DEFINE FIELD IF NOT EXISTS createdBy ON TABLE node TYPE option<string>;
DEFINE FIELD IF NOT EXISTS version ON TABLE node TYPE int DEFAULT 1;`,
  },
  {
    name: "002-edges.surql",
    sql: `DEFINE TABLE IF NOT EXISTS edge TYPE RELATION IN node OUT node SCHEMALESS;
DEFINE FIELD OVERWRITE type ON TABLE edge TYPE string
  ASSERT $value IN ["RENDERS", "CHILD_OF", "TRIGGERS", "CALLS", "REQUIRES_STATE", "TRANSITIONS_TO", "READS", "WRITES", "HAS_FIELD", "REFERENCES", "VALIDATES", "CONSTRAINS", "AUTHORIZES", "BELONGS_TO", "DEPENDS_ON", "HOSTED_ON", "STORED_IN", "NAVIGATES_TO", "DISPLAYS", "ACCEPTS_INPUT", "IMPLEMENTED_IN"];
DEFINE FIELD IF NOT EXISTS createdAt ON TABLE edge TYPE datetime DEFAULT time::now();`,
  },
  {
    name: "003-indexes.surql",
    sql: `DEFINE INDEX IF NOT EXISTS idx_node_type_app ON TABLE node FIELDS type, app;
DEFINE INDEX IF NOT EXISTS idx_node_app ON TABLE node FIELDS app;
DEFINE INDEX IF NOT EXISTS idx_node_name ON TABLE node FIELDS name;
DEFINE INDEX IF NOT EXISTS idx_edge_type ON TABLE edge FIELDS type;
DEFINE INDEX IF NOT EXISTS idx_edge_unique ON TABLE edge FIELDS in, out, type UNIQUE;`,
  },
];

/**
 * Load migrations from .surql files on disk.
 * Returns null if the files can't be found (e.g. Lambda bundle).
 */
async function loadFromDisk(): Promise<{ name: string; sql: string }[] | null> {
  try {
    const thisDir = dirname(fileURLToPath(import.meta.url));
    const schemaDir = join(thisDir, "..", "schema-sql");
    const files = (await readdir(schemaDir))
      .filter((f) => f.endsWith(".surql"))
      .sort();

    return await Promise.all(
      files.map(async (name) => ({
        name,
        sql: await readFile(join(schemaDir, name), "utf-8"),
      }))
    );
  } catch {
    return null;
  }
}

/**
 * Run all .surql migrations in order.
 * Reads from disk when available (local dev/CLI), falls back to
 * embedded SQL when files aren't accessible (Lambda bundle).
 */
export async function runMigrations(db: Surreal): Promise<string[]> {
  const migrations = (await loadFromDisk()) ?? EMBEDDED_MIGRATIONS;

  const executed: string[] = [];
  for (const { name, sql } of migrations) {
    await db.query(sql);
    executed.push(name);
  }

  return executed;
}
