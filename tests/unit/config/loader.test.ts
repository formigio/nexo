import { describe, it, expect, beforeEach } from "vitest";
import {
  loadConfig,
  getDbConfig,
  getApiConfig,
  resetConfig,
  getUserConfigDir,
  getUserConfigPath,
} from "../../../src/config/loader.js";
import { DEFAULTS } from "../../../src/config/schema.js";

// Use a temp dir with no .nexo/config.json to isolate from the project's config
const CLEAN_CWD = "/tmp";

describe("getDbConfig", () => {
  beforeEach(() => {
    resetConfig();
  });

  it("returns hardcoded defaults when no config or env vars exist", () => {
    process.env.NEXO_HOME = "/tmp/nexo-test-no-exist";
    resetConfig();
    loadConfig(CLEAN_CWD); // avoid project .nexo/config.json

    const cfg = getDbConfig();
    expect(cfg.url).toBe(DEFAULTS.db.url);
    expect(cfg.namespace).toBe(DEFAULTS.db.namespace);
    expect(cfg.database).toBe(DEFAULTS.db.database);
    expect(cfg.username).toBe(DEFAULTS.db.username);
    expect(cfg.password).toBe(DEFAULTS.db.password);
  });

  it("env vars override defaults", () => {
    process.env.NEXO_HOME = "/tmp/nexo-test-no-exist";
    process.env.NEXO_DB_URL = "http://custom:9999";
    process.env.NEXO_DB_NS = "custom_ns";
    process.env.NEXO_DB_DB = "custom_db";
    process.env.NEXO_DB_USER = "custom_user";
    process.env.NEXO_DB_PASS = "custom_pass";
    resetConfig();
    loadConfig(CLEAN_CWD);

    const cfg = getDbConfig();
    expect(cfg.url).toBe("http://custom:9999");
    expect(cfg.namespace).toBe("custom_ns");
    expect(cfg.database).toBe("custom_db");
    expect(cfg.username).toBe("custom_user");
    expect(cfg.password).toBe("custom_pass");
  });
});

describe("getApiConfig", () => {
  beforeEach(() => {
    resetConfig();
  });

  it("returns null when no API URL is configured", () => {
    process.env.NEXO_HOME = "/tmp/nexo-test-no-exist";
    resetConfig();
    loadConfig(CLEAN_CWD);

    const cfg = getApiConfig();
    expect(cfg).toBeNull();
  });

  it("returns config when NEXO_API_URL is set", () => {
    process.env.NEXO_HOME = "/tmp/nexo-test-no-exist";
    process.env.NEXO_API_URL = "https://api.example.com";
    process.env.NEXO_API_KEY = "test-key";
    resetConfig();
    loadConfig(CLEAN_CWD);

    const cfg = getApiConfig();
    expect(cfg).not.toBeNull();
    expect(cfg!.url).toBe("https://api.example.com");
    expect(cfg!.key).toBe("test-key");
  });

  it("returns config with no key when only URL is set", () => {
    process.env.NEXO_HOME = "/tmp/nexo-test-no-exist";
    process.env.NEXO_API_URL = "https://api.example.com";
    resetConfig();
    loadConfig(CLEAN_CWD);

    const cfg = getApiConfig();
    expect(cfg).not.toBeNull();
    expect(cfg!.key).toBeUndefined();
  });
});

describe("getUserConfigDir", () => {
  it("returns NEXO_HOME when set", () => {
    process.env.NEXO_HOME = "/custom/nexo";
    expect(getUserConfigDir()).toBe("/custom/nexo");
  });

  it("falls back to ~/.nexo", () => {
    delete process.env.NEXO_HOME;
    const dir = getUserConfigDir();
    expect(dir).toMatch(/\.nexo$/);
  });
});

describe("getUserConfigPath", () => {
  it("returns config.json inside config dir", () => {
    process.env.NEXO_HOME = "/custom/nexo";
    expect(getUserConfigPath()).toBe("/custom/nexo/config.json");
  });
});

describe("resetConfig", () => {
  it("clears cached config so next call re-reads", () => {
    process.env.NEXO_HOME = "/tmp/nexo-test-no-exist";
    resetConfig();
    loadConfig(CLEAN_CWD);

    // First call uses cached config
    const cfg1 = getDbConfig();

    // Set env var and reset — should see new value
    process.env.NEXO_DB_URL = "http://changed:1234";
    resetConfig();
    loadConfig(CLEAN_CWD);

    const cfg2 = getDbConfig();
    expect(cfg2.url).toBe("http://changed:1234");
    expect(cfg2.url).not.toBe(cfg1.url);
  });
});
