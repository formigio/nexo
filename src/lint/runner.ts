import type { Surreal } from "surrealdb";
import { listNodes } from "../db/nodes.js";
import { listEdges } from "../db/edges.js";
import type { Node, Edge } from "../schema/types.js";
import type { LintContext, LintRule, LintReport, Severity, Category } from "./types.js";
import { ALL_RULES } from "./rules.js";
import { loadCustomRules } from "./customRules.js";

function buildContext(nodes: Node[], edges: Edge[]): LintContext {
  const nodeById = new Map<string, Node>();
  const nodesByType = new Map<string, Node[]>();
  const edgesFrom = new Map<string, Edge[]>();
  const edgesTo = new Map<string, Edge[]>();

  for (const node of nodes) {
    nodeById.set(node.id, node);
    const byType = nodesByType.get(node.type);
    if (byType) byType.push(node);
    else nodesByType.set(node.type, [node]);
  }

  // Build node ID set for edge filtering
  const nodeIds = new Set(nodes.map((n) => n.id));

  for (const edge of edges) {
    // Only include edges where both endpoints are in our node set
    if (!nodeIds.has(edge.in) || !nodeIds.has(edge.out)) continue;

    const from = edgesFrom.get(edge.in);
    if (from) from.push(edge);
    else edgesFrom.set(edge.in, [edge]);

    const to = edgesTo.get(edge.out);
    if (to) to.push(edge);
    else edgesTo.set(edge.out, [edge]);
  }

  return { nodes, edges, nodeById, nodesByType, edgesFrom, edgesTo };
}

export interface RunLintOptions {
  app?: string;
  rules?: string[];
  severity?: Severity;
  category?: Category;
  skipCustomRules?: boolean;
}

export async function runLint(db: Surreal, opts: RunLintOptions): Promise<LintReport> {
  const nodes = await listNodes(db, opts.app ? { app: opts.app } : undefined);
  const edges = await listEdges(db);
  const ctx = buildContext(nodes, edges);

  const customRules = opts.skipCustomRules ? [] : await loadCustomRules();
  let rules: LintRule[] = [...ALL_RULES, ...customRules];

  if (opts.rules && opts.rules.length > 0) {
    const ruleSet = new Set(opts.rules);
    rules = rules.filter((r) => ruleSet.has(r.id));
  }
  if (opts.severity) {
    const severityOrder: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
    const maxLevel = severityOrder[opts.severity];
    rules = rules.filter((r) => severityOrder[r.severity] <= maxLevel);
  }
  if (opts.category) {
    rules = rules.filter((r) => r.category === opts.category);
  }

  const results = rules.map((rule) => ({
    rule: rule.id,
    severity: rule.severity,
    category: rule.category,
    description: rule.description,
    violations: rule.check(ctx),
  }));

  return {
    app: opts.app ?? "(all)",
    totalNodes: nodes.length,
    totalEdges: edges.length,
    results,
  };
}
