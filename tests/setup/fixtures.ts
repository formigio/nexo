import type { CreateNodeInput, CreateEdgeInput, EdgeType } from "../../src/schema/types.js";

const defaults = { app: "test-app", tags: [] as string[] };

export function makeScreen(overrides: Partial<CreateNodeInput> = {}): CreateNodeInput {
  return {
    type: "Screen",
    name: overrides.name ?? "Test Screen",
    props: { route: "/test", platform: ["web"], accessLevel: "authenticated" },
    ...defaults,
    ...overrides,
  };
}

export function makeComponent(overrides: Partial<CreateNodeInput> = {}): CreateNodeInput {
  return {
    type: "Component",
    name: overrides.name ?? "Test Component",
    props: { componentType: "interactive", platform: ["web"] },
    ...defaults,
    ...overrides,
  };
}

export function makeApiEndpoint(overrides: Partial<CreateNodeInput> = {}): CreateNodeInput {
  return {
    type: "APIEndpoint",
    name: overrides.name ?? "GET /test",
    props: { method: "GET", path: "/test", authRequired: true },
    ...defaults,
    ...overrides,
  };
}

export function makeDataEntity(overrides: Partial<CreateNodeInput> = {}): CreateNodeInput {
  return {
    type: "DataEntity",
    name: overrides.name ?? "TestEntity",
    props: { storageType: "surrealdb" },
    ...defaults,
    ...overrides,
  };
}

export function makeDataField(overrides: Partial<CreateNodeInput> = {}): CreateNodeInput {
  return {
    type: "DataField",
    name: overrides.name ?? "testField",
    props: { fieldType: "string", required: true },
    ...defaults,
    ...overrides,
  };
}

export function makeFeature(overrides: Partial<CreateNodeInput> = {}): CreateNodeInput {
  return {
    type: "Feature",
    name: overrides.name ?? "Test Feature",
    props: { featureId: "F-001", status: "proposed", priority: "P2" },
    ...defaults,
    ...overrides,
  };
}

export function makeBusinessRule(overrides: Partial<CreateNodeInput> = {}): CreateNodeInput {
  return {
    type: "BusinessRule",
    name: overrides.name ?? "Test Rule",
    props: { ruleType: "validation", priority: "important", enforcement: "server" },
    ...defaults,
    ...overrides,
  };
}

export function makeUserAction(overrides: Partial<CreateNodeInput> = {}): CreateNodeInput {
  return {
    type: "UserAction",
    name: overrides.name ?? "Test Action",
    props: { actionType: "navigate" },
    ...defaults,
    ...overrides,
  };
}

export function makeUserState(overrides: Partial<CreateNodeInput> = {}): CreateNodeInput {
  return {
    type: "UserState",
    name: overrides.name ?? "Test State",
    props: { stateType: "auth", conditions: [] },
    ...defaults,
    ...overrides,
  };
}

export function makeInfraResource(overrides: Partial<CreateNodeInput> = {}): CreateNodeInput {
  return {
    type: "InfraResource",
    name: overrides.name ?? "Test Infra",
    props: { provider: "aws", service: "lambda", environment: "both" },
    ...defaults,
    ...overrides,
  };
}

export function makeSourceFile(overrides: Partial<CreateNodeInput> = {}): CreateNodeInput {
  return {
    type: "SourceFile",
    name: overrides.name ?? "test.ts",
    props: { repo: "test-repo", relativePath: "src/test.ts", language: "ts", layer: "other" },
    ...defaults,
    ...overrides,
  };
}

export function makeEdge(
  type: EdgeType,
  from: string,
  to: string,
  metadata?: Record<string, unknown>
): CreateEdgeInput {
  return { type, from, to, ...(metadata ? { metadata } : {}) };
}
