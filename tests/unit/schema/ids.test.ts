import { describe, it, expect } from "vitest";
import { slugify, generateNodeId } from "../../../src/schema/ids.js";
import { TYPE_PREFIX, NODE_TYPES, type NodeType } from "../../../src/schema/types.js";

describe("slugify", () => {
  it("lowercases and replaces spaces with underscores", () => {
    expect(slugify("Schedule Screen")).toBe("schedule_screen");
  });

  it("removes path param braces", () => {
    expect(slugify("PUT /trips/{tripId}/rsvp")).toBe("put_trips_tripid_rsvp");
  });

  it("collapses multiple underscores", () => {
    expect(slugify("foo---bar___baz")).toBe("foo_bar_baz");
  });

  it("trims leading/trailing underscores", () => {
    expect(slugify("  hello world  ")).toBe("hello_world");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("handles purely symbolic input", () => {
    expect(slugify("@#$%")).toBe("");
  });

  it("preserves numbers", () => {
    expect(slugify("v2 beta 3")).toBe("v2_beta_3");
  });
});

describe("generateNodeId", () => {
  it("prefixes with type prefix and slugified name", () => {
    expect(generateNodeId("Screen", "Schedule")).toBe("scr_schedule");
    expect(generateNodeId("APIEndpoint", "PUT /trips/{tripId}/rsvp")).toBe(
      "api_put_trips_tripid_rsvp"
    );
  });

  it("generates correct prefix for every node type", () => {
    const expected: Record<string, string> = {
      Screen: "scr",
      Component: "cmp",
      UserState: "ust",
      UserAction: "act",
      APIEndpoint: "api",
      DataEntity: "ent",
      DataField: "fld",
      BusinessRule: "rul",
      Feature: "ftr",
      InfraResource: "inf",
      SourceFile: "fil",
    };

    for (const nodeType of NODE_TYPES) {
      const id = generateNodeId(nodeType as NodeType, "test");
      expect(id).toBe(`${expected[nodeType]}_test`);
    }
  });

  it("covers all 11 node types", () => {
    expect(NODE_TYPES).toHaveLength(11);
    expect(Object.keys(TYPE_PREFIX)).toHaveLength(11);
  });
});
