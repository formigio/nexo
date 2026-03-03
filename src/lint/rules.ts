import type { LintRule, LintContext, Violation } from "./types.js";

const noOrphanNodes: LintRule = {
  id: "no-orphan-nodes",
  severity: "error",
  category: "connectivity",
  description: "Nodes with zero edges",
  check(ctx: LintContext): Violation[] {
    const violations: Violation[] = [];
    for (const node of ctx.nodes) {
      const from = ctx.edgesFrom.get(node.id);
      const to = ctx.edgesTo.get(node.id);
      if ((!from || from.length === 0) && (!to || to.length === 0)) {
        violations.push({
          nodeId: node.id,
          nodeName: node.name,
          nodeType: node.type,
          message: `${node.type} "${node.name}" has zero edges — invisible to traversal and impact analysis`,
          fix: `Add at least one edge connecting this node (e.g., BELONGS_TO a Feature)`,
        });
      }
    }
    return violations;
  },
};

const screensRenderComponents: LintRule = {
  id: "screens-render-components",
  severity: "warning",
  category: "completeness",
  description: "Screens that don't RENDER any Component",
  check(ctx: LintContext): Violation[] {
    const violations: Violation[] = [];
    const screens = ctx.nodesByType.get("Screen") ?? [];
    for (const screen of screens) {
      const outEdges = ctx.edgesFrom.get(screen.id) ?? [];
      const hasRenders = outEdges.some((e) => e.type === "RENDERS");
      if (!hasRenders) {
        violations.push({
          nodeId: screen.id,
          nodeName: screen.name,
          nodeType: screen.type,
          message: `Screen "${screen.name}" does not RENDER any Component`,
          fix: `Add RENDERS edges from this Screen to its Components`,
        });
      }
    }
    return violations;
  },
};

const componentsRenderedByScreen: LintRule = {
  id: "components-rendered-by-screen",
  severity: "warning",
  category: "completeness",
  description: "Components not RENDERED by any Screen",
  check(ctx: LintContext): Violation[] {
    const violations: Violation[] = [];
    const components = ctx.nodesByType.get("Component") ?? [];
    for (const cmp of components) {
      const inEdges = ctx.edgesTo.get(cmp.id) ?? [];
      const renderedByScreen = inEdges.some((e) => e.type === "RENDERS");
      if (!renderedByScreen) {
        violations.push({
          nodeId: cmp.id,
          nodeName: cmp.name,
          nodeType: cmp.type,
          message: `Component "${cmp.name}" is not RENDERED by any Screen`,
          fix: `Add a RENDERS edge from the parent Screen to this Component`,
        });
      }
    }
    return violations;
  },
};

const apisHaveDataConnections: LintRule = {
  id: "apis-have-data-connections",
  severity: "warning",
  category: "completeness",
  description: "APIEndpoints without READS or WRITES edges",
  check(ctx: LintContext): Violation[] {
    const violations: Violation[] = [];
    const apis = ctx.nodesByType.get("APIEndpoint") ?? [];
    for (const api of apis) {
      const outEdges = ctx.edgesFrom.get(api.id) ?? [];
      const hasData = outEdges.some((e) => e.type === "READS" || e.type === "WRITES");
      if (!hasData) {
        violations.push({
          nodeId: api.id,
          nodeName: api.name,
          nodeType: api.type,
          message: `APIEndpoint "${api.name}" has no READS or WRITES edges to DataEntities`,
          fix: `Add READS/WRITES edges to the DataEntities this endpoint accesses`,
        });
      }
    }
    return violations;
  },
};

const entitiesHaveFields: LintRule = {
  id: "entities-have-fields",
  severity: "warning",
  category: "completeness",
  description: "DataEntities with no HAS_FIELD edges",
  check(ctx: LintContext): Violation[] {
    const violations: Violation[] = [];
    const entities = ctx.nodesByType.get("DataEntity") ?? [];
    for (const ent of entities) {
      const outEdges = ctx.edgesFrom.get(ent.id) ?? [];
      const hasFields = outEdges.some((e) => e.type === "HAS_FIELD");
      if (!hasFields) {
        violations.push({
          nodeId: ent.id,
          nodeName: ent.name,
          nodeType: ent.type,
          message: `DataEntity "${ent.name}" has no HAS_FIELD edges`,
          fix: `Add HAS_FIELD edges to this entity's DataField nodes`,
        });
      }
    }
    return violations;
  },
};

const interactiveComponentsTriggerActions: LintRule = {
  id: "interactive-components-trigger-actions",
  severity: "info",
  category: "completeness",
  description: "Interactive Components that don't TRIGGER any UserAction",
  check(ctx: LintContext): Violation[] {
    const violations: Violation[] = [];
    const components = ctx.nodesByType.get("Component") ?? [];
    for (const cmp of components) {
      if ((cmp.props as any)?.componentType !== "interactive") continue;
      const outEdges = ctx.edgesFrom.get(cmp.id) ?? [];
      const hasTrigger = outEdges.some((e) => e.type === "TRIGGERS");
      if (!hasTrigger) {
        violations.push({
          nodeId: cmp.id,
          nodeName: cmp.name,
          nodeType: cmp.type,
          message: `Interactive Component "${cmp.name}" does not TRIGGER any UserAction`,
          fix: `Add TRIGGERS edges to the UserActions this component initiates`,
        });
      }
    }
    return violations;
  },
};

const mutatingActionsCallApis: LintRule = {
  id: "mutating-actions-call-apis",
  severity: "info",
  category: "completeness",
  description: "Mutate/query UserActions that don't CALL an APIEndpoint",
  check(ctx: LintContext): Violation[] {
    const violations: Violation[] = [];
    const actions = ctx.nodesByType.get("UserAction") ?? [];
    for (const act of actions) {
      const actionType = (act.props as any)?.actionType;
      if (actionType !== "mutate" && actionType !== "query") continue;
      const outEdges = ctx.edgesFrom.get(act.id) ?? [];
      const callsApi = outEdges.some((e) => e.type === "CALLS");
      if (!callsApi) {
        violations.push({
          nodeId: act.id,
          nodeName: act.name,
          nodeType: act.type,
          message: `UserAction "${act.name}" (${actionType}) does not CALL any APIEndpoint`,
          fix: `Add a CALLS edge to the APIEndpoint this action invokes`,
        });
      }
    }
    return violations;
  },
};

const nodesBelongToFeature: LintRule = {
  id: "nodes-belong-to-feature",
  severity: "info",
  category: "consistency",
  description: "Nodes not assigned to any Feature via BELONGS_TO",
  check(ctx: LintContext): Violation[] {
    const violations: Violation[] = [];
    // Skip Feature nodes themselves and DataField (too granular)
    const skip = new Set(["Feature", "DataField", "SourceFile"]);
    for (const node of ctx.nodes) {
      if (skip.has(node.type)) continue;
      const outEdges = ctx.edgesFrom.get(node.id) ?? [];
      const belongsToFeature = outEdges.some((e) => e.type === "BELONGS_TO");
      if (!belongsToFeature) {
        violations.push({
          nodeId: node.id,
          nodeName: node.name,
          nodeType: node.type,
          message: `${node.type} "${node.name}" is not assigned to any Feature`,
          fix: `Add a BELONGS_TO edge from this node to its Feature`,
        });
      }
    }
    return violations;
  },
};

export const ALL_RULES: LintRule[] = [
  noOrphanNodes,
  screensRenderComponents,
  componentsRenderedByScreen,
  apisHaveDataConnections,
  entitiesHaveFields,
  interactiveComponentsTriggerActions,
  mutatingActionsCallApis,
  nodesBelongToFeature,
];
