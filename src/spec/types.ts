import type { NodeType, EdgeType } from "../schema/types.js";

// ── File-level types ─────────────────────────────────────────

export type SpecFileKind = "feature" | "shared" | "data" | "infra";

export interface SpecFileHeader {
  nexo: string;
  app: string;
  kind: SpecFileKind;
}

// ── Inline Edge Definition ───────────────────────────────────

export interface InlineEdgeDef {
  edgeType: EdgeType;
  targetType: NodeType;
  /** If true, edge direction is target→self instead of self→target */
  reverse?: boolean;
}

/** Maps YAML property names to edge definitions, keyed by node type */
export const INLINE_EDGES: Partial<Record<NodeType, Record<string, InlineEdgeDef>>> = {
  Screen: {
    renders: { edgeType: "RENDERS", targetType: "Component" },
    child_of: { edgeType: "CHILD_OF", targetType: "Screen" },
    requires_state: { edgeType: "REQUIRES_STATE", targetType: "UserState" },
  },
  Component: {
    renders_on: { edgeType: "RENDERS", targetType: "Screen", reverse: true },
    triggers: { edgeType: "TRIGGERS", targetType: "UserAction" },
    displays: { edgeType: "DISPLAYS", targetType: "DataField" },
    accepts_input: { edgeType: "ACCEPTS_INPUT", targetType: "DataField" },
  },
  UserAction: {
    calls: { edgeType: "CALLS", targetType: "APIEndpoint" },
    navigates_to: { edgeType: "NAVIGATES_TO", targetType: "Screen" },
  },
  APIEndpoint: {
    reads: { edgeType: "READS", targetType: "DataEntity" },
    writes: { edgeType: "WRITES", targetType: "DataEntity" },
    hosted_on: { edgeType: "HOSTED_ON", targetType: "InfraResource" },
  },
  DataEntity: {
    stored_in: { edgeType: "STORED_IN", targetType: "InfraResource" },
    // 'fields' is handled specially as nested nodes, not as a simple edge ref
  },
  DataField: {
    references: { edgeType: "REFERENCES", targetType: "DataEntity" },
  },
  BusinessRule: {
    validates: { edgeType: "VALIDATES", targetType: "DataField" },
    constrains: { edgeType: "CONSTRAINS", targetType: "UserAction" },
    authorizes: { edgeType: "AUTHORIZES", targetType: "APIEndpoint" },
  },
  Feature: {
    depends_on: { edgeType: "DEPENDS_ON", targetType: "Feature" },
  },
};

/** Maps YAML section names to node types */
export const SECTION_NODE_TYPE: Record<string, NodeType> = {
  screens: "Screen",
  components: "Component",
  actions: "UserAction",
  endpoints: "APIEndpoint",
  entities: "DataEntity",
  rules: "BusinessRule",
  resources: "InfraResource",
  states: "UserState",
  feature: "Feature",
};

/** Load order for file kinds (dependencies first) */
export const KIND_LOAD_ORDER: SpecFileKind[] = ["infra", "data", "shared", "feature"];

// ── Parsed (pre-resolution) types ────────────────────────────

export interface ParsedInlineEdge {
  edgeType: EdgeType;
  targetName: string;
  targetType: NodeType;
  reverse: boolean;
}

export interface ParsedNodeEntry {
  id?: string;
  name: string;
  type: NodeType;
  description?: string;
  tags?: string[];
  props: Record<string, unknown>;
  inlineEdges: ParsedInlineEdge[];
}

export interface ParsedExplicitEdge {
  type: EdgeType;
  from: string;
  to: string;
  metadata?: Record<string, unknown>;
}

export interface ParsedSpecFile {
  filePath: string;
  header: SpecFileHeader;
  nodes: ParsedNodeEntry[];
  explicitEdges: ParsedExplicitEdge[];
}

// ── Resolved types ───────────────────────────────────────────

export interface ResolvedNode {
  id: string;
  type: NodeType;
  name: string;
  app: string;
  description?: string;
  tags: string[];
  props: Record<string, unknown>;
}

export interface ResolvedEdge {
  type: EdgeType;
  from: string;
  to: string;
  metadata?: Record<string, unknown>;
}

export interface ResolvedSpec {
  nodes: ResolvedNode[];
  edges: ResolvedEdge[];
  warnings: string[];
}

// ── Sync result types ────────────────────────────────────────

export interface SpecSyncResults {
  nodes: {
    created: string[];
    updated: Array<{ id: string; changes: string[] }>;
    unchanged: string[];
  };
  edges: {
    created: number;
    skipped: number;
  };
}
