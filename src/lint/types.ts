import type { Node, Edge } from "../schema/types.js";

export type Severity = "error" | "warning" | "info";
export type Category = "connectivity" | "completeness" | "consistency";

export interface LintContext {
  nodes: Node[];
  edges: Edge[];
  nodeById: Map<string, Node>;
  nodesByType: Map<string, Node[]>;
  edgesFrom: Map<string, Edge[]>;
  edgesTo: Map<string, Edge[]>;
}

export interface Violation {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  message: string;
  fix?: string;
}

export interface LintRule {
  id: string;
  severity: Severity;
  category: Category;
  description: string;
  check: (ctx: LintContext) => Violation[];
}

export interface LintReport {
  app: string;
  totalNodes: number;
  totalEdges: number;
  results: RuleResult[];
}

export interface RuleResult {
  rule: string;
  severity: Severity;
  category: Category;
  description: string;
  violations: Violation[];
}
