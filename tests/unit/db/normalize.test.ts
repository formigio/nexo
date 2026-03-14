import { describe, it, expect } from "vitest";
import { normalizeNode } from "../../../src/db/nodes.js";
import { normalizeEdge } from "../../../src/db/edges.js";

describe("normalizeNode", () => {
  it("strips node: prefix from string id", () => {
    const result = normalizeNode({
      id: "node:scr_home",
      type: "Screen",
      app: "test",
      name: "Home",
    });
    expect(result.id).toBe("scr_home");
  });

  it("passes through plain string ids", () => {
    const result = normalizeNode({
      id: "scr_home",
      type: "Screen",
      app: "test",
      name: "Home",
    });
    expect(result.id).toBe("scr_home");
  });

  it("handles object with id property (RecordId-like)", () => {
    const result = normalizeNode({
      id: { id: "scr_home", toString: () => "node:scr_home" },
      type: "Screen",
      app: "test",
      name: "Home",
    });
    expect(result.id).toBe("scr_home");
  });

  it("handles object with toString (RecordId-like)", () => {
    const result = normalizeNode({
      id: { toString: () => "node:scr_home" },
      type: "Screen",
      app: "test",
      name: "Home",
    });
    expect(result.id).toBe("scr_home");
  });

  it("preserves other fields", () => {
    const result = normalizeNode({
      id: "scr_home",
      type: "Screen",
      app: "test",
      name: "Home",
      tags: ["important"],
      props: { route: "/home" },
    });
    expect(result.type).toBe("Screen");
    expect(result.app).toBe("test");
    expect(result.name).toBe("Home");
    expect(result.tags).toEqual(["important"]);
    expect(result.props).toEqual({ route: "/home" });
  });
});

describe("normalizeEdge", () => {
  it("strips node:/edge: prefixes from string ids", () => {
    const result = normalizeEdge({
      id: "edge:abc123",
      type: "RENDERS",
      in: "node:scr_home",
      out: "node:cmp_header",
    });
    expect(result.id).toBe("abc123");
    expect(result.in).toBe("scr_home");
    expect(result.out).toBe("cmp_header");
  });

  it("handles plain string ids", () => {
    const result = normalizeEdge({
      id: "abc123",
      type: "RENDERS",
      in: "scr_home",
      out: "cmp_header",
    });
    expect(result.id).toBe("abc123");
    expect(result.in).toBe("scr_home");
    expect(result.out).toBe("cmp_header");
  });

  it("handles RecordId-like objects with id property", () => {
    const result = normalizeEdge({
      id: { id: "abc123", toString: () => "edge:abc123" },
      type: "RENDERS",
      in: { id: "scr_home", toString: () => "node:scr_home" },
      out: { id: "cmp_header", toString: () => "node:cmp_header" },
    });
    expect(result.id).toBe("abc123");
    expect(result.in).toBe("scr_home");
    expect(result.out).toBe("cmp_header");
  });

  it("preserves other edge fields", () => {
    const result = normalizeEdge({
      id: "abc123",
      type: "RENDERS",
      in: "scr_home",
      out: "cmp_header",
      metadata: { conditional: true },
    });
    expect(result.type).toBe("RENDERS");
    expect(result.metadata).toEqual({ conditional: true });
  });
});
