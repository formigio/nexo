import { z } from "zod";

// ── Common ───────────────────────────────────────────────────

/** Edge reference: single name/ID or array of names/IDs */
const edgeRef = z.union([z.string(), z.array(z.string())]).optional();

const yamlNodeBase = z.object({
  id: z.string().nullable().optional(),
  name: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// ── Section Entry Schemas ────────────────────────────────────

export const ScreenEntrySchema = yamlNodeBase.extend({
  route: z.string().optional(),
  platform: z.array(z.string()).optional(),
  accessLevel: z.string().optional(),
  parentScreen: z.string().optional(),
  // Inline edges
  renders: edgeRef,
  child_of: edgeRef,
  requires_state: edgeRef,
  implemented_in: edgeRef,
});

export const ComponentEntrySchema = yamlNodeBase.extend({
  componentType: z.enum(["interactive", "presentational", "layout", "navigation"]),
  platform: z.array(z.string()).optional(),
  variants: z.array(z.string()).optional(),
  sourceFile: z.string().optional(),
  // Inline edges
  renders_on: edgeRef,
  triggers: edgeRef,
  displays: edgeRef,
  accepts_input: edgeRef,
  implemented_in: edgeRef,
});

export const UserActionEntrySchema = yamlNodeBase.extend({
  actionType: z.enum(["navigate", "mutate", "query", "authenticate", "configure"]),
  inputType: z.enum(["tap", "form", "gesture", "automatic"]).optional(),
  requiresConfirmation: z.boolean().optional(),
  // Inline edges
  calls: edgeRef,
  navigates_to: edgeRef,
  implemented_in: edgeRef,
});

export const APIEndpointEntrySchema = yamlNodeBase.extend({
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
  path: z.string(),
  authRequired: z.boolean().optional(),
  requiredRole: z.string().optional(),
  rateLimit: z.string().optional(),
  // Inline edges
  reads: edgeRef,
  writes: edgeRef,
  hosted_on: edgeRef,
  implemented_in: edgeRef,
});

export const DataFieldEntrySchema = yamlNodeBase.extend({
  fieldType: z.enum(["string", "number", "boolean", "enum", "datetime", "object", "array", "reference"]),
  required: z.boolean().optional(),
  enumValues: z.array(z.string()).optional(),
  defaultValue: z.unknown().optional(),
  maxLength: z.number().optional(),
  validation: z.string().optional(),
  pii: z.boolean().optional(),
  // Inline edges
  references: edgeRef,
});

export const DataEntityEntrySchema = yamlNodeBase.extend({
  storageType: z.enum(["dynamodb", "s3", "cognito", "stripe", "cache", "surrealdb", "postgresql"]),
  keyPattern: z.string().optional(),
  indexes: z.array(z.string()).optional(),
  ttl: z.boolean().optional(),
  // Inline edges
  stored_in: edgeRef,
  implemented_in: edgeRef,
  // Nested DataField nodes
  fields: z.array(DataFieldEntrySchema).optional(),
});

export const BusinessRuleEntrySchema = yamlNodeBase.extend({
  ruleType: z.enum(["validation", "authorization", "workflow", "computation", "constraint", "behavior"]),
  priority: z.enum(["critical", "important", "nice-to-have"]).optional(),
  enforcement: z.enum(["server", "client", "both"]).optional(),
  pseudocode: z.string().optional(),
  // Inline edges
  validates: edgeRef,
  constrains: edgeRef,
  authorizes: edgeRef,
  implemented_in: edgeRef,
});

export const InfraResourceEntrySchema = yamlNodeBase.extend({
  provider: z.enum(["aws", "stripe", "sendgrid", "google", "surrealdb"]),
  service: z.string(),
  resourceId: z.string().optional(),
  environment: z.enum(["dev", "prod", "both"]).optional(),
  // Inline edges
  depends_on: edgeRef,
  implemented_in: edgeRef,
});

export const UserStateEntrySchema = yamlNodeBase.extend({
  stateType: z.enum(["auth", "permission", "contextual", "composite"]),
  conditions: z.array(z.string()).optional(),
  isTerminal: z.boolean().optional(),
  // Inline edges
  transitions_to: edgeRef,
  implemented_in: edgeRef,
});

export const CLICommandEntrySchema = yamlNodeBase.extend({
  command: z.string(),
  subcommand: z.string().optional(),
  fullCommand: z.string(),
  flags: z.array(z.string()).optional(),
  repo: z.string(),
  // Inline edges
  calls: edgeRef,
  depends_on: edgeRef,
  implemented_in: edgeRef,
});

export const AgentProcessEntrySchema = yamlNodeBase.extend({
  processType: z.enum(["orchestrator", "evaluator", "reviewer", "prompt-builder", "output-handler", "runner"]),
  runtime: z.enum(["docker", "local", "fargate"]).optional(),
  repo: z.string(),
  // Inline edges
  calls: edgeRef,
  depends_on: edgeRef,
  hosted_on: edgeRef,
  implemented_in: edgeRef,
});

export const AccountEntrySchema = yamlNodeBase.extend({
  accountType: z.enum(["payment", "mapping", "domain", "hosting", "auth", "corporate", "other"]),
  provider: z.string(),
  accountId: z.string().optional(),
  billingMethod: z.string().optional(),
  // Inline edges
  funds: edgeRef,
  provides: edgeRef,
  implemented_in: edgeRef,
});

export const SourceFileEntrySchema = yamlNodeBase.extend({
  repo: z.string(),
  relativePath: z.string(),
  language: z.enum(["jsx", "tsx", "js", "ts", "yaml", "json", "css", "surql", "other"]).optional(),
  layer: z.enum(["page", "component", "hook", "context", "api-handler", "auth-handler",
                  "webhook", "scheduled", "config", "utility", "style", "test", "other"]).optional(),
});

export const FeatureEntrySchema = yamlNodeBase.extend({
  featureId: z.string(),
  status: z.enum(["proposed", "in-progress", "deployed", "deprecated"]).optional(),
  priority: z.enum(["P0", "P1", "P2", "P3"]).optional(),
  deployedVersion: z.string().optional(),
  specUrl: z.string().optional(),
  // Inline edges
  depends_on: edgeRef,
});

// ── Explicit Edge Schema ─────────────────────────────────────

export const ExplicitEdgeSchema = z.object({
  type: z.string(),
  from: z.string(),
  to: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

// ── File Schemas by Kind ─────────────────────────────────────

const fileBase = z.object({
  nexo: z.union([z.string(), z.number()]).transform(String),
  app: z.string(),
});

export const FeatureFileSchema = fileBase.extend({
  kind: z.literal("feature"),
  feature: FeatureEntrySchema.optional(),
  screens: z.array(ScreenEntrySchema).optional(),
  components: z.array(ComponentEntrySchema).optional(),
  actions: z.array(UserActionEntrySchema).optional(),
  endpoints: z.array(APIEndpointEntrySchema).optional(),
  rules: z.array(BusinessRuleEntrySchema).optional(),
  entities: z.array(DataEntityEntrySchema).optional(),
  resources: z.array(InfraResourceEntrySchema).optional(),
  states: z.array(UserStateEntrySchema).optional(),
  files: z.array(SourceFileEntrySchema).optional(),
  commands: z.array(CLICommandEntrySchema).optional(),
  processes: z.array(AgentProcessEntrySchema).optional(),
  accounts: z.array(AccountEntrySchema).optional(),
  fields: z.array(DataFieldEntrySchema).optional(),
  edges: z.array(ExplicitEdgeSchema).optional(),
});

export const DataFileSchema = fileBase.extend({
  kind: z.literal("data"),
  entities: z.array(DataEntityEntrySchema).optional(),
  fields: z.array(DataFieldEntrySchema).optional(),
  edges: z.array(ExplicitEdgeSchema).optional(),
});

export const InfraFileSchema = fileBase.extend({
  kind: z.literal("infra"),
  resources: z.array(InfraResourceEntrySchema).optional(),
  edges: z.array(ExplicitEdgeSchema).optional(),
});

export const SharedFileSchema = fileBase.extend({
  kind: z.literal("shared"),
  states: z.array(UserStateEntrySchema).optional(),
  components: z.array(ComponentEntrySchema).optional(),
  rules: z.array(BusinessRuleEntrySchema).optional(),
  files: z.array(SourceFileEntrySchema).optional(),
  edges: z.array(ExplicitEdgeSchema).optional(),
});

export const SpecFileSchema = z.discriminatedUnion("kind", [
  FeatureFileSchema,
  DataFileSchema,
  InfraFileSchema,
  SharedFileSchema,
]);

export type SpecFileData = z.infer<typeof SpecFileSchema>;
