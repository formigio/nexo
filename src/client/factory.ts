import type { GraphClient } from "./types.js";
import { getApiConfig } from "../config/loader.js";

/**
 * Create the appropriate GraphClient based on configuration.
 * If `api.url` is configured, returns an HttpGraphClient.
 * Otherwise, returns a DbGraphClient using direct SurrealDB access.
 *
 * Uses dynamic imports so `surrealdb` is never loaded in HTTP mode.
 */
export async function getClient(): Promise<GraphClient> {
  const apiConfig = getApiConfig();
  if (apiConfig) {
    const { HttpGraphClient } = await import("./http-client.js");
    return new HttpGraphClient(apiConfig);
  }
  const { getDb } = await import("../db/client.js");
  const { DbGraphClient } = await import("./db-client.js");
  return new DbGraphClient(await getDb());
}
