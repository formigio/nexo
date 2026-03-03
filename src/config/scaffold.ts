import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const STARTER_CONFIG = `{
  "app": "",
  "db": {
    "url": "http://localhost:8000",
    "namespace": "nexo",
    "database": "nexo",
    "username": "root",
    "password": "root"
  },
  "ingest": {
    "frontend": "",
    "backend": ""
  },
  "web": {
    "port": 3000,
    "host": "127.0.0.1"
  }
}
`;

/**
 * Create `.nexo/config.json` in the given directory.
 * Returns the path to the created file, or null if it already exists.
 */
export function scaffoldConfig(cwd: string = process.cwd()): string | null {
  const dir = resolve(cwd, ".nexo");
  const configPath = resolve(dir, "config.json");

  if (existsSync(configPath)) {
    return null;
  }

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(configPath, STARTER_CONFIG, "utf-8");
  return configPath;
}
