import { describe, it, expect } from "vitest";
import {
  NodeSchema,
  EdgeSchema,
  CreateNodeInput,
  CreateEdgeInput,
  NODE_TYPES,
  EDGE_TYPES,
  EDGE_CONSTRAINTS,
  PROPS_SCHEMA,
  ScreenPropsSchema,
  ComponentPropsSchema,
  APIEndpointPropsSchema,
  DataEntityPropsSchema,
  DataFieldPropsSchema,
  FeaturePropsSchema,
  BusinessRulePropsSchema,
  UserActionPropsSchema,
  UserStatePropsSchema,
  InfraResourcePropsSchema,
  SourceFilePropsSchema,
  AccountPropsSchema,
} from "../../../src/schema/types.js";

describe("NODE_TYPES", () => {
  it("contains all 12 types", () => {
    expect(NODE_TYPES).toHaveLength(12);
    expect(NODE_TYPES).toContain("Screen");
    expect(NODE_TYPES).toContain("Component");
    expect(NODE_TYPES).toContain("APIEndpoint");
    expect(NODE_TYPES).toContain("DataEntity");
    expect(NODE_TYPES).toContain("DataField");
    expect(NODE_TYPES).toContain("Feature");
    expect(NODE_TYPES).toContain("BusinessRule");
    expect(NODE_TYPES).toContain("UserAction");
    expect(NODE_TYPES).toContain("UserState");
    expect(NODE_TYPES).toContain("InfraResource");
    expect(NODE_TYPES).toContain("SourceFile");
    expect(NODE_TYPES).toContain("Account");
  });
});

describe("EDGE_TYPES", () => {
  it("contains all 23 edge types", () => {
    expect(EDGE_TYPES).toHaveLength(23);
  });

  it("includes key relationship types", () => {
    expect(EDGE_TYPES).toContain("RENDERS");
    expect(EDGE_TYPES).toContain("CALLS");
    expect(EDGE_TYPES).toContain("BELONGS_TO");
    expect(EDGE_TYPES).toContain("DEPENDS_ON");
    expect(EDGE_TYPES).toContain("HAS_FIELD");
  });
});

describe("EDGE_CONSTRAINTS", () => {
  it("defines constraints for every edge type", () => {
    for (const edgeType of EDGE_TYPES) {
      const constraint = EDGE_CONSTRAINTS[edgeType as keyof typeof EDGE_CONSTRAINTS];
      expect(constraint).toBeDefined();
      expect(constraint.from.length).toBeGreaterThan(0);
      expect(constraint.to.length).toBeGreaterThan(0);
    }
  });

  it("RENDERS only allows Screen → Component", () => {
    const c = EDGE_CONSTRAINTS.RENDERS;
    expect(c.from).toEqual(["Screen"]);
    expect(c.to).toEqual(["Component"]);
  });

  it("BELONGS_TO allows most types → Feature", () => {
    const c = EDGE_CONSTRAINTS.BELONGS_TO;
    expect(c.to).toEqual(["Feature"]);
    expect(c.from.length).toBeGreaterThanOrEqual(11);
  });

  it("only references valid node types", () => {
    const validTypes = new Set(NODE_TYPES);
    for (const [, constraint] of Object.entries(EDGE_CONSTRAINTS)) {
      for (const t of constraint.from) {
        expect(validTypes.has(t)).toBe(true);
      }
      for (const t of constraint.to) {
        expect(validTypes.has(t)).toBe(true);
      }
    }
  });
});

describe("PROPS_SCHEMA", () => {
  it("has a schema for every node type", () => {
    for (const nodeType of NODE_TYPES) {
      expect(PROPS_SCHEMA[nodeType as keyof typeof PROPS_SCHEMA]).toBeDefined();
    }
  });
});

describe("ScreenPropsSchema", () => {
  it("accepts valid props", () => {
    const result = ScreenPropsSchema.parse({
      route: "/home",
      platform: ["web", "mobile"],
      accessLevel: "public",
    });
    expect(result.route).toBe("/home");
  });

  it("applies defaults", () => {
    const result = ScreenPropsSchema.parse({});
    expect(result.platform).toEqual(["web"]);
    expect(result.accessLevel).toBe("authenticated");
  });
});

describe("ComponentPropsSchema", () => {
  it("requires componentType", () => {
    expect(() => ComponentPropsSchema.parse({})).toThrow();
  });

  it("validates componentType enum", () => {
    expect(() =>
      ComponentPropsSchema.parse({ componentType: "invalid" })
    ).toThrow();
  });

  it("accepts valid component", () => {
    const result = ComponentPropsSchema.parse({
      componentType: "interactive",
    });
    expect(result.componentType).toBe("interactive");
    expect(result.platform).toEqual(["web"]);
  });
});

describe("APIEndpointPropsSchema", () => {
  it("requires method and path", () => {
    expect(() => APIEndpointPropsSchema.parse({})).toThrow();
  });

  it("validates method enum", () => {
    expect(() =>
      APIEndpointPropsSchema.parse({ method: "INVALID", path: "/test" })
    ).toThrow();
  });

  it("accepts valid endpoint", () => {
    const result = APIEndpointPropsSchema.parse({
      method: "POST",
      path: "/api/users",
    });
    expect(result.method).toBe("POST");
    expect(result.authRequired).toBe(true);
  });
});

describe("DataEntityPropsSchema", () => {
  it("requires storageType", () => {
    expect(() => DataEntityPropsSchema.parse({})).toThrow();
  });

  it("accepts valid entity", () => {
    const result = DataEntityPropsSchema.parse({ storageType: "dynamodb" });
    expect(result.storageType).toBe("dynamodb");
    expect(result.ttl).toBe(false);
  });
});

describe("DataFieldPropsSchema", () => {
  it("requires fieldType", () => {
    expect(() => DataFieldPropsSchema.parse({})).toThrow();
  });

  it("accepts valid field with defaults", () => {
    const result = DataFieldPropsSchema.parse({ fieldType: "string" });
    expect(result.required).toBe(false);
    expect(result.pii).toBe(false);
  });
});

describe("FeaturePropsSchema", () => {
  it("requires featureId", () => {
    expect(() => FeaturePropsSchema.parse({})).toThrow();
  });

  it("applies defaults", () => {
    const result = FeaturePropsSchema.parse({ featureId: "F-001" });
    expect(result.status).toBe("proposed");
    expect(result.priority).toBe("P2");
  });
});

describe("BusinessRulePropsSchema", () => {
  it("requires ruleType", () => {
    expect(() => BusinessRulePropsSchema.parse({})).toThrow();
  });

  it("applies defaults", () => {
    const result = BusinessRulePropsSchema.parse({ ruleType: "validation" });
    expect(result.priority).toBe("important");
    expect(result.enforcement).toBe("server");
  });
});

describe("UserActionPropsSchema", () => {
  it("requires actionType", () => {
    expect(() => UserActionPropsSchema.parse({})).toThrow();
  });

  it("accepts valid action", () => {
    const result = UserActionPropsSchema.parse({ actionType: "navigate" });
    expect(result.requiresConfirmation).toBe(false);
  });
});

describe("UserStatePropsSchema", () => {
  it("requires stateType", () => {
    expect(() => UserStatePropsSchema.parse({})).toThrow();
  });

  it("applies defaults", () => {
    const result = UserStatePropsSchema.parse({ stateType: "auth" });
    expect(result.conditions).toEqual([]);
    expect(result.isTerminal).toBe(false);
  });
});

describe("InfraResourcePropsSchema", () => {
  it("requires provider and service", () => {
    expect(() => InfraResourcePropsSchema.parse({})).toThrow();
  });

  it("accepts valid resource", () => {
    const result = InfraResourcePropsSchema.parse({
      provider: "aws",
      service: "lambda",
    });
    expect(result.environment).toBe("both");
  });
});

describe("SourceFilePropsSchema", () => {
  it("requires repo and relativePath", () => {
    expect(() => SourceFilePropsSchema.parse({})).toThrow();
  });

  it("applies defaults", () => {
    const result = SourceFilePropsSchema.parse({
      repo: "my-repo",
      relativePath: "src/index.ts",
    });
    expect(result.language).toBe("js");
    expect(result.layer).toBe("other");
  });
});

describe("AccountPropsSchema", () => {
  it("requires accountType and provider", () => {
    expect(() => AccountPropsSchema.parse({})).toThrow();
  });

  it("accepts valid account with defaults", () => {
    const result = AccountPropsSchema.parse({
      accountType: "payment",
      provider: "stripe",
    });
    expect(result.status).toBe("active");
    expect(result.accountId).toBeUndefined();
  });

  it("validates accountType enum", () => {
    expect(() =>
      AccountPropsSchema.parse({ accountType: "invalid", provider: "test" })
    ).toThrow();
  });

  it("validates status enum", () => {
    expect(() =>
      AccountPropsSchema.parse({ accountType: "payment", provider: "stripe", status: "invalid" })
    ).toThrow();
  });
});

describe("NodeSchema", () => {
  it("parses a valid node", () => {
    const node = NodeSchema.parse({
      id: "scr_home",
      type: "Screen",
      app: "test",
      name: "Home",
    });
    expect(node.id).toBe("scr_home");
    expect(node.tags).toEqual([]);
    expect(node.version).toBe(1);
  });

  it("rejects invalid type", () => {
    expect(() =>
      NodeSchema.parse({
        id: "x",
        type: "Invalid",
        app: "test",
        name: "X",
      })
    ).toThrow();
  });
});

describe("EdgeSchema", () => {
  it("parses a valid edge", () => {
    const edge = EdgeSchema.parse({
      id: "e1",
      type: "RENDERS",
      in: "scr_home",
      out: "cmp_header",
    });
    expect(edge.type).toBe("RENDERS");
  });

  it("rejects invalid edge type", () => {
    expect(() =>
      EdgeSchema.parse({
        id: "e1",
        type: "INVALID",
        in: "a",
        out: "b",
      })
    ).toThrow();
  });
});

describe("CreateNodeInput", () => {
  it("auto-generates defaults", () => {
    const input = CreateNodeInput.parse({
      type: "Screen",
      app: "test",
      name: "Home",
    });
    expect(input.tags).toEqual([]);
    expect(input.props).toEqual({});
  });

  it("allows optional id", () => {
    const input = CreateNodeInput.parse({
      id: "custom_id",
      type: "Screen",
      app: "test",
      name: "Home",
    });
    expect(input.id).toBe("custom_id");
  });
});

describe("CreateEdgeInput", () => {
  it("parses valid edge input", () => {
    const input = CreateEdgeInput.parse({
      type: "RENDERS",
      from: "scr_home",
      to: "cmp_header",
    });
    expect(input.type).toBe("RENDERS");
    expect(input.from).toBe("scr_home");
    expect(input.to).toBe("cmp_header");
  });

  it("accepts optional metadata", () => {
    const input = CreateEdgeInput.parse({
      type: "RENDERS",
      from: "scr_home",
      to: "cmp_header",
      metadata: { conditional: true },
    });
    expect(input.metadata).toEqual({ conditional: true });
  });
});
