import { beforeEach } from "vitest";
import { resetConfig } from "../../src/config/loader.js";

beforeEach(() => {
  resetConfig();

  // Clear all NEXO_* env vars so tests start clean
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("NEXO_")) {
      delete process.env[key];
    }
  }
});
