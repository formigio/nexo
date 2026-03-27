import { z } from "zod";

// ── Node Types ──────────────────────────────────────────────

export const NodeType = {
  Screen: "Screen",
  Component: "Component",
  UserState: "UserState",
  UserAction: "UserAction",
  APIEndpoint: "APIEndpoint",
  DataEntity: "DataEntity",
  DataField: "DataField",
  BusinessRule: "BusinessRule",
  Feature: "Feature",
  InfraResource: "InfraResource",
  SourceFile: "SourceFile",
  Account: "Account",
  CLICommand: "CLICommand",
  AgentProcess: "AgentProcess",
} as const;

export type NodeType = (typeof NodeType)[keyof typeof NodeType];

export const NODE_TYPES = Object.values(NodeType);

// ── Edge Types ──────────────────────────────────────────────

export const EdgeType = {
  RENDERS: "RENDERS",
  CHILD_OF: "CHILD_OF",
  TRIGGERS: "TRIGGERS",
  CALLS: "CALLS",
  REQUIRES_STATE: "REQUIRES_STATE",
  TRANSITIONS_TO: "TRANSITIONS_TO",
  READS: "READS",
  WRITES: "WRITES",
  HAS_FIELD: "HAS_FIELD",
  REFERENCES: "REFERENCES",
  VALIDATES: "VALIDATES",
  CONSTRAINS: "CONSTRAINS",
  AUTHORIZES: "AUTHORIZES",
  BELONGS_TO: "BELONGS_TO",
  DEPENDS_ON: "DEPENDS_ON",
  HOSTED_ON: "HOSTED_ON",
  STORED_IN: "STORED_IN",
  NAVIGATES_TO: "NAVIGATES_TO",
  DISPLAYS: "DISPLAYS",
  ACCEPTS_INPUT: "ACCEPTS_INPUT",
  IMPLEMENTED_IN: "IMPLEMENTED_IN",
  FUNDS: "FUNDS",
  PROVIDES: "PROVIDES",
} as const;

export type EdgeType = (typeof EdgeType)[keyof typeof EdgeType];

export const EDGE_TYPES = Object.values(EdgeType);

// ── Type Prefixes for ID Generation ─────────────────────────

export const TYPE_PREFIX: Record<NodeType, string> = {
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
  Account: "acc",
  CLICommand: "cli",
  AgentProcess: "agt",
};

// ── Edge Constraints (source type → target type) ────────────

export const EDGE_CONSTRAINTS: Record<EdgeType, { from: NodeType[]; to: NodeType[] }> = {
  RENDERS: { from: ["Screen"], to: ["Component"] },
  CHILD_OF: { from: ["Screen", "DataEntity", "DataField"], to: ["Screen", "DataEntity"] },
  TRIGGERS: { from: ["Component", "Feature"], to: ["UserAction", "Feature"] },
  CALLS: { from: ["UserAction", "APIEndpoint", "CLICommand", "AgentProcess"], to: ["APIEndpoint", "Feature"] },
  REQUIRES_STATE: { from: ["Screen"], to: ["UserState"] },
  TRANSITIONS_TO: { from: ["UserState"], to: ["UserState"] },
  READS: { from: ["APIEndpoint", "Feature"], to: ["DataEntity"] },
  WRITES: { from: ["APIEndpoint", "Feature"], to: ["DataEntity"] },
  HAS_FIELD: { from: ["DataEntity"], to: ["DataField"] },
  REFERENCES: { from: ["DataField", "DataEntity"], to: ["DataEntity"] },
  VALIDATES: { from: ["BusinessRule"], to: ["DataField"] },
  CONSTRAINS: { from: ["BusinessRule"], to: ["UserAction"] },
  AUTHORIZES: { from: ["BusinessRule"], to: ["APIEndpoint"] },
  BELONGS_TO: {
    from: [
      "Screen",
      "Component",
      "UserState",
      "UserAction",
      "APIEndpoint",
      "DataEntity",
      "DataField",
      "BusinessRule",
      "InfraResource",
      "SourceFile",
      "Account",
      "CLICommand",
      "AgentProcess",
    ],
    to: ["Feature"],
  },
  DEPENDS_ON: { from: ["Feature", "SourceFile", "InfraResource", "CLICommand", "AgentProcess"], to: ["Feature", "SourceFile", "InfraResource"] },
  HOSTED_ON: { from: ["APIEndpoint", "AgentProcess"], to: ["InfraResource"] },
  STORED_IN: { from: ["DataEntity"], to: ["InfraResource", "DataEntity"] },
  NAVIGATES_TO: { from: ["UserAction"], to: ["Screen"] },
  DISPLAYS: { from: ["Component", "APIEndpoint"], to: ["DataField", "Feature"] },
  ACCEPTS_INPUT: { from: ["Component"], to: ["DataField"] },
  IMPLEMENTED_IN: {
    from: ["Screen", "Component", "APIEndpoint", "DataEntity",
           "BusinessRule", "UserAction", "UserState", "InfraResource", "Feature", "Account",
           "CLICommand", "AgentProcess"],
    to: ["SourceFile"],
  },
  FUNDS: { from: ["Account"], to: ["InfraResource", "Account"] },
  PROVIDES: { from: ["Account"], to: ["Feature", "APIEndpoint"] },
};

// ── Type-specific Props Schemas ─────────────────────────────

export const ScreenPropsSchema = z.object({
  route: z.string().optional(),
  platform: z.array(z.string()).default(["web"]),
  accessLevel: z.string().default("authenticated"),
  parentScreen: z.string().optional(),
});

export const ComponentPropsSchema = z.object({
  componentType: z.enum(["interactive", "presentational", "layout", "navigation"]),
  platform: z.array(z.string()).default(["web"]),
  variants: z.array(z.string()).optional(),
  sourceFile: z.string().optional(),
});

export const UserStatePropsSchema = z.object({
  stateType: z.enum(["auth", "permission", "contextual", "composite"]),
  conditions: z.array(z.string()).default([]),
  isTerminal: z.boolean().default(false),
});

export const UserActionPropsSchema = z.object({
  actionType: z.enum(["navigate", "mutate", "query", "authenticate", "configure"]),
  inputType: z.enum(["tap", "form", "gesture", "automatic"]).optional(),
  requiresConfirmation: z.boolean().default(false),
});

export const APIEndpointPropsSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
  path: z.string(),
  authRequired: z.boolean().default(true),
  requiredRole: z.string().optional(),
  requestSchema: z.record(z.unknown()).optional(),
  responseSchema: z.record(z.unknown()).optional(),
  rateLimit: z.string().optional(),
});

export const DataEntityPropsSchema = z.object({
  storageType: z.enum(["dynamodb", "s3", "cognito", "stripe", "cache", "surrealdb", "postgresql"]),
  keyPattern: z.string().optional(),
  indexes: z.array(z.string()).optional(),
  ttl: z.boolean().default(false),
});

export const DataFieldPropsSchema = z.object({
  fieldType: z.enum(["string", "number", "boolean", "enum", "datetime", "object", "array", "reference"]),
  required: z.boolean().default(false),
  enumValues: z.array(z.string()).optional(),
  defaultValue: z.unknown().optional(),
  maxLength: z.number().optional(),
  validation: z.string().optional(),
  pii: z.boolean().default(false),
});

export const BusinessRulePropsSchema = z.object({
  ruleType: z.enum(["validation", "authorization", "workflow", "computation", "constraint", "behavior"]),
  priority: z.enum(["critical", "important", "nice-to-have"]).default("important"),
  enforcement: z.enum(["server", "client", "both"]).default("server"),
  pseudocode: z.string().optional(),
});

export const FeaturePropsSchema = z.object({
  featureId: z.string(),
  status: z.enum(["proposed", "in-progress", "deployed", "deprecated"]).default("proposed"),
  priority: z.enum(["P0", "P1", "P2", "P3"]).default("P2"),
  deployedVersion: z.string().optional(),
  specUrl: z.string().optional(),
});

export const InfraResourcePropsSchema = z.object({
  provider: z.enum(["aws", "stripe", "sendgrid", "google", "surrealdb"]),
  service: z.string(),
  resourceId: z.string().optional(),
  environment: z.enum(["dev", "prod", "both"]).default("both"),
});

export const AccountPropsSchema = z.object({
  accountType: z.enum(["payment", "mapping", "domain", "hosting", "auth", "corporate", "other"]),
  provider: z.string(),
  accountId: z.string().optional(),
  billingMethod: z.string().optional(),
  renewalDate: z.string().optional(),
  cost: z.string().optional(),
  status: z.enum(["active", "inactive", "pending"]).default("active"),
});

export const CLICommandPropsSchema = z.object({
  command: z.string(),
  subcommand: z.string().optional(),
  fullCommand: z.string(),
  flags: z.array(z.string()).optional(),
  repo: z.string(),
});

export const AgentProcessPropsSchema = z.object({
  processType: z.enum(["orchestrator", "evaluator", "reviewer", "prompt-builder", "output-handler", "runner"]),
  runtime: z.enum(["docker", "local", "fargate"]).default("docker"),
  repo: z.string(),
});

export const SourceFilePropsSchema = z.object({
  repo: z.string(),
  relativePath: z.string(),
  language: z.enum(["jsx", "tsx", "js", "ts", "yaml", "json", "css", "surql", "other"]).default("js"),
  layer: z.enum(["page", "component", "hook", "context", "api-handler", "auth-handler",
                  "webhook", "scheduled", "config", "utility", "style", "test", "other"]).default("other"),
});

// ── Props Schema Map ────────────────────────────────────────

export const PROPS_SCHEMA: Record<NodeType, z.ZodType> = {
  Screen: ScreenPropsSchema,
  Component: ComponentPropsSchema,
  UserState: UserStatePropsSchema,
  UserAction: UserActionPropsSchema,
  APIEndpoint: APIEndpointPropsSchema,
  DataEntity: DataEntityPropsSchema,
  DataField: DataFieldPropsSchema,
  BusinessRule: BusinessRulePropsSchema,
  Feature: FeaturePropsSchema,
  InfraResource: InfraResourcePropsSchema,
  SourceFile: SourceFilePropsSchema,
  Account: AccountPropsSchema,
  CLICommand: CLICommandPropsSchema,
  AgentProcess: AgentProcessPropsSchema,
};

// ── Common Node Schema ──────────────────────────────────────

export const NodeSchema = z.object({
  id: z.string(),
  type: z.enum(NODE_TYPES as [string, ...string[]]),
  app: z.string(),
  name: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  props: z.record(z.unknown()).default({}),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  createdBy: z.string().optional(),
  version: z.number().default(1),
});

export type Node = z.infer<typeof NodeSchema>;

// ── Edge Schema ─────────────────────────────────────────────

export const EdgeSchema = z.object({
  id: z.string(),
  type: z.enum(EDGE_TYPES as [string, ...string[]]),
  in: z.string(),
  out: z.string(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().optional(),
});

export type Edge = z.infer<typeof EdgeSchema>;

// ── Create Input Schemas ────────────────────────────────────

export const CreateNodeInput = z.object({
  id: z.string().optional(),
  type: z.enum(NODE_TYPES as [string, ...string[]]),
  app: z.string(),
  name: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  props: z.record(z.unknown()).default({}),
});

export type CreateNodeInput = z.infer<typeof CreateNodeInput>;

export const CreateEdgeInput = z.object({
  type: z.enum(EDGE_TYPES as [string, ...string[]]),
  from: z.string(),
  to: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateEdgeInput = z.infer<typeof CreateEdgeInput>;
