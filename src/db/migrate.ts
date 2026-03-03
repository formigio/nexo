import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import type { Surreal } from "surrealdb";

/**
 * Run all .surql migration files in order.
 * Files are read from the schema-sql directory relative to this file's location.
 */
export async function runMigrations(db: Surreal): Promise<string[]> {
  const thisDir = dirname(fileURLToPath(import.meta.url));
  const schemaDir = join(thisDir, "..", "schema-sql");

  const files = (await readdir(schemaDir))
    .filter((f) => f.endsWith(".surql"))
    .sort();

  const executed: string[] = [];

  for (const file of files) {
    const sql = await readFile(join(schemaDir, file), "utf-8");
    await db.query(sql);
    executed.push(file);
  }

  return executed;
}
