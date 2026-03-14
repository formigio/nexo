import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";

const exec = promisify(execFile);
const CLI = resolve(import.meta.dirname, "../../dist/cli/index.js");

const TEST_DB_URL = process.env.NEXO_TEST_DB_URL ?? "http://localhost:8000";
const TEST_NS = "nexo_test_cli";
const TEST_DB = "nexo_test_cli";

const env = {
  ...process.env,
  NEXO_DB_URL: TEST_DB_URL,
  NEXO_DB_NS: TEST_NS,
  NEXO_DB_DB: TEST_DB,
  NEXO_DB_USER: "root",
  NEXO_DB_PASS: "root",
  NEXO_HOME: "/tmp/nexo-test-no-exist",
  // Force no chalk colors in CLI output for easier assertions
  NO_COLOR: "1",
};

async function nexo(...args: string[]): Promise<{ stdout: string; stderr: string }> {
  return exec("node", [CLI, ...args], { env, timeout: 15_000 });
}

/** Run CLI expecting a non-zero exit (returns stderr+stdout) */
async function nexoFail(...args: string[]): Promise<string> {
  try {
    const { stdout, stderr } = await exec("node", [CLI, ...args], { env, timeout: 15_000 });
    return stdout + stderr;
  } catch (err: any) {
    return (err.stdout ?? "") + (err.stderr ?? "");
  }
}

beforeAll(async () => {
  await nexo("init");
});

beforeEach(async () => {
  const { Surreal } = await import("surrealdb");
  const db = new Surreal();
  await db.connect(TEST_DB_URL);
  await db.signin({ username: "root", password: "root" });
  await db.use({ namespace: TEST_NS, database: TEST_DB });
  await db.query("DELETE edge");
  await db.query("DELETE node");
  await db.close();
});

describe("nexo init", () => {
  it("runs migrations successfully", async () => {
    const { stdout } = await nexo("init");
    expect(stdout).toContain("001-nodes.surql");
    expect(stdout).toContain("002-edges.surql");
    expect(stdout).toContain("003-indexes.surql");
  });
});

describe("nexo node", () => {
  it("creates a node", async () => {
    const { stdout } = await nexo(
      "node", "create", "Screen",
      "--app", "cli-test",
      "--name", "Home",
    );
    expect(stdout).toContain("scr_home");
  });

  it("gets a node by ID", async () => {
    await nexo("node", "create", "Screen", "--app", "cli-test", "--name", "Home");
    const { stdout } = await nexo("node", "get", "scr_home");
    expect(stdout).toContain("Home");
    expect(stdout).toContain("Screen");
  });

  it("lists nodes", async () => {
    await nexo("node", "create", "Screen", "--app", "cli-test", "--name", "Home");
    await nexo("node", "create", "Screen", "--app", "cli-test", "--name", "Settings");
    const { stdout } = await nexo("node", "list", "--app", "cli-test");
    expect(stdout).toContain("Home");
    expect(stdout).toContain("Settings");
  });

  it("lists nodes filtered by type", async () => {
    await nexo("node", "create", "Screen", "--app", "cli-test", "--name", "Home");
    await nexo(
      "node", "create", "Component", "--app", "cli-test", "--name", "Header",
      "--prop", "componentType=navigation",
    );
    const { stdout } = await nexo("node", "list", "--type", "Component");
    expect(stdout).toContain("Header");
    expect(stdout).not.toContain("Home");
  });

  it("deletes a node", async () => {
    await nexo("node", "create", "Screen", "--app", "cli-test", "--name", "Home");
    const { stdout } = await nexo("node", "delete", "scr_home");
    expect(stdout.toLowerCase()).toContain("delet");
  });
});

describe("nexo edge", () => {
  it("creates an edge", async () => {
    await nexo("node", "create", "Screen", "--app", "cli-test", "--name", "Home");
    await nexo(
      "node", "create", "Component", "--app", "cli-test", "--name", "Header",
      "--prop", "componentType=navigation",
    );
    const { stdout } = await nexo("edge", "create", "RENDERS", "scr_home", "cmp_header");
    expect(stdout).toContain("RENDERS");
  });

  it("lists edges", async () => {
    await nexo("node", "create", "Screen", "--app", "cli-test", "--name", "Home");
    await nexo(
      "node", "create", "Component", "--app", "cli-test", "--name", "Header",
      "--prop", "componentType=navigation",
    );
    await nexo("edge", "create", "RENDERS", "scr_home", "cmp_header");
    const { stdout } = await nexo("edge", "list");
    expect(stdout).toContain("RENDERS");
  });
});

describe("nexo traverse", () => {
  it("traverses from a node", async () => {
    await nexo("node", "create", "Screen", "--app", "cli-test", "--name", "Home");
    await nexo(
      "node", "create", "Component", "--app", "cli-test", "--name", "Header",
      "--prop", "componentType=navigation",
    );
    await nexo("edge", "create", "RENDERS", "scr_home", "cmp_header");
    const { stdout } = await nexo("traverse", "scr_home", "--depth", "1");
    expect(stdout).toContain("scr_home");
    expect(stdout).toContain("cmp_header");
  });
});

describe("nexo impact", () => {
  it("runs impact analysis", async () => {
    await nexo("node", "create", "Screen", "--app", "cli-test", "--name", "Home");
    await nexo(
      "node", "create", "Component", "--app", "cli-test", "--name", "Header",
      "--prop", "componentType=navigation",
    );
    await nexo("edge", "create", "RENDERS", "scr_home", "cmp_header");
    const { stdout } = await nexo("impact", "scr_home", "--hops", "1");
    expect(stdout).toContain("cmp_header");
  });
});

describe("nexo app", () => {
  it("lists apps", async () => {
    await nexo("node", "create", "Screen", "--app", "cli-test", "--name", "Home");
    const { stdout } = await nexo("app", "list");
    expect(stdout).toContain("cli-test");
  });
});

describe("error handling", () => {
  it("exits non-zero for non-existent node get", async () => {
    const output = await nexoFail("node", "get", "scr_nonexistent");
    expect(output).toContain("not found");
  });

  it("exits non-zero for invalid commands", async () => {
    await expect(nexo("invalid-command")).rejects.toThrow();
  });
});
