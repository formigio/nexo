import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import type { Surreal } from "surrealdb";
import { listNodes } from "../db/nodes.js";
import { listEdges } from "../db/edges.js";
import type { Node, Edge, NodeType } from "../schema/types.js";
import { INLINE_EDGES } from "./types.js";

export interface ExportOptions {
  app: string;
  outputDir: string;
}

export interface ExportResults {
  files: string[];
}

/**
 * Export all nodes and edges for an app to *.graph.yaml spec files.
 * Groups nodes by feature (via BELONGS_TO edges), and places orphan
 * data/infra/shared nodes into separate kind-specific files.
 */
export async function exportToSpec(
  db: Surreal,
  opts: ExportOptions,
): Promise<ExportResults> {
  const nodes = await listNodes(db, { app: opts.app });
  const allEdges = await listEdges(db);
  const files: string[] = [];

  // Build lookup maps
  const nodeById = new Map<string, Node>();
  for (const n of nodes) nodeById.set(n.id, n);

  // Build BELONGS_TO map: nodeId → featureId
  const nodeToFeature = new Map<string, string>();
  for (const e of allEdges) {
    if (e.type === "BELONGS_TO") {
      // BELONGS_TO: in=node, out=feature
      nodeToFeature.set(e.in, e.out);
    }
  }

  // Create output directories
  const featuresDir = join(opts.outputDir, "features");
  const dataDir = join(opts.outputDir, "data");
  const infraDir = join(opts.outputDir, "infra");
  const sharedDir = join(opts.outputDir, "shared");
  for (const dir of [featuresDir, dataDir, infraDir, sharedDir]) {
    mkdirSync(dir, { recursive: true });
  }

  // Export feature files
  const featureNodes = nodes.filter(n => n.type === "Feature");
  for (const feature of featureNodes) {
    const memberIds = new Set<string>();
    for (const [nodeId, featId] of nodeToFeature) {
      if (featId === feature.id) memberIds.add(nodeId);
    }
    const members = nodes.filter(n => memberIds.has(n.id));
    const content = buildFeatureYaml(opts.app, feature, members, allEdges, nodeById);
    const fileName = slugify(feature.name) + ".graph.yaml";
    const filePath = join(featuresDir, fileName);
    writeFileSync(filePath, content, "utf-8");
    files.push(filePath);
  }

  // Export orphan data entities
  const orphanEntities = nodes.filter(
    n => n.type === "DataEntity" && !nodeToFeature.has(n.id),
  );
  if (orphanEntities.length > 0) {
    const content = buildDataYaml(opts.app, orphanEntities, allEdges, nodeById, nodes);
    const filePath = join(dataDir, "entities.graph.yaml");
    writeFileSync(filePath, content, "utf-8");
    files.push(filePath);
  }

  // Export orphan infra resources
  const orphanInfra = nodes.filter(
    n => n.type === "InfraResource" && !nodeToFeature.has(n.id),
  );
  if (orphanInfra.length > 0) {
    const content = buildInfraYaml(opts.app, orphanInfra);
    const filePath = join(infraDir, "resources.graph.yaml");
    writeFileSync(filePath, content, "utf-8");
    files.push(filePath);
  }

  // Export orphan user states
  const orphanStates = nodes.filter(
    n => n.type === "UserState" && !nodeToFeature.has(n.id),
  );
  if (orphanStates.length > 0) {
    const content = buildSharedYaml(opts.app, orphanStates);
    const filePath = join(sharedDir, "user-states.graph.yaml");
    writeFileSync(filePath, content, "utf-8");
    files.push(filePath);
  }

  return { files };
}

// ── YAML Builders ────────────────────────────────────────────

function buildFeatureYaml(
  app: string,
  feature: Node,
  members: Node[],
  edges: Edge[],
  nodeById: Map<string, Node>,
): string {
  const doc: Record<string, unknown> = {
    nexo: "1.0",
    app,
    kind: "feature",
  };

  // Feature section
  doc.feature = {
    id: feature.id,
    name: feature.name,
    ...feature.props,
    ...(feature.description ? { description: feature.description } : {}),
    ...getInlineEdgeValues(feature.id, "Feature", edges, nodeById),
  };

  // Group members by type
  const byType = groupByType(members);

  if (byType.Screen?.length) {
    doc.screens = byType.Screen.map(n => buildNodeEntry(n, edges, nodeById));
  }
  if (byType.Component?.length) {
    doc.components = byType.Component.map(n => buildNodeEntry(n, edges, nodeById));
  }
  if (byType.UserAction?.length) {
    doc.actions = byType.UserAction.map(n => buildNodeEntry(n, edges, nodeById));
  }
  if (byType.APIEndpoint?.length) {
    doc.endpoints = byType.APIEndpoint.map(n => buildNodeEntry(n, edges, nodeById));
  }
  if (byType.BusinessRule?.length) {
    doc.rules = byType.BusinessRule.map(n => buildNodeEntry(n, edges, nodeById));
  }

  doc.edges = [];

  return yaml.dump(doc, { lineWidth: 120, noRefs: true, quotingType: '"' });
}

function buildDataYaml(
  app: string,
  entities: Node[],
  edges: Edge[],
  nodeById: Map<string, Node>,
  allNodes: Node[],
): string {
  const doc: Record<string, unknown> = {
    nexo: "1.0",
    app,
    kind: "data",
  };

  doc.entities = entities.map(entity => {
    const entry = buildNodeEntry(entity, edges, nodeById);

    // Find nested DataField nodes via HAS_FIELD edges
    const fieldEdges = edges.filter(
      e => e.type === "HAS_FIELD" && e.in === entity.id,
    );
    if (fieldEdges.length > 0) {
      const fields: Record<string, unknown>[] = [];
      for (const fe of fieldEdges) {
        const fieldNode = nodeById.get(fe.out);
        if (fieldNode) {
          fields.push(buildNodeEntry(fieldNode, edges, nodeById));
        }
      }
      if (fields.length > 0) {
        entry.fields = fields;
      }
    }

    return entry;
  });

  return yaml.dump(doc, { lineWidth: 120, noRefs: true, quotingType: '"' });
}

function buildInfraYaml(app: string, resources: Node[]): string {
  const doc: Record<string, unknown> = {
    nexo: "1.0",
    app,
    kind: "infra",
  };

  doc.resources = resources.map(n => ({
    id: n.id,
    name: n.name,
    ...n.props,
    ...(n.description ? { description: n.description } : {}),
  }));

  return yaml.dump(doc, { lineWidth: 120, noRefs: true, quotingType: '"' });
}

function buildSharedYaml(app: string, states: Node[]): string {
  const doc: Record<string, unknown> = {
    nexo: "1.0",
    app,
    kind: "shared",
  };

  doc.states = states.map(n => ({
    id: n.id,
    name: n.name,
    ...n.props,
    ...(n.description ? { description: n.description } : {}),
  }));

  return yaml.dump(doc, { lineWidth: 120, noRefs: true, quotingType: '"' });
}

// ── Helpers ──────────────────────────────────────────────────

function buildNodeEntry(
  node: Node,
  edges: Edge[],
  nodeById: Map<string, Node>,
): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    id: node.id,
    name: node.name,
    ...node.props,
    ...(node.description ? { description: node.description } : {}),
  };

  // Add inline edge values
  const inlineEdges = getInlineEdgeValues(
    node.id, node.type as NodeType, edges, nodeById,
  );
  Object.assign(entry, inlineEdges);

  return entry;
}

/**
 * For a given node, find all edges that can be expressed as inline YAML
 * properties and return them as { propName: [targetName, ...] }.
 */
function getInlineEdgeValues(
  nodeId: string,
  nodeType: NodeType,
  edges: Edge[],
  nodeById: Map<string, Node>,
): Record<string, string[]> {
  const defs = INLINE_EDGES[nodeType];
  if (!defs) return {};

  const result: Record<string, string[]> = {};

  for (const [propName, def] of Object.entries(defs)) {
    const targets: string[] = [];

    if (def.reverse) {
      // Reverse edge: target → self (e.g., RENDERS: Screen → Component)
      // Find edges where out = nodeId (this node is the target)
      for (const e of edges) {
        if (e.type === def.edgeType && e.out === nodeId) {
          const sourceNode = nodeById.get(e.in);
          if (sourceNode) targets.push(sourceNode.name);
        }
      }
    } else {
      // Normal edge: self → target
      // Find edges where in = nodeId (this node is the source)
      for (const e of edges) {
        if (e.type === def.edgeType && e.in === nodeId) {
          const targetNode = nodeById.get(e.out);
          if (targetNode) targets.push(targetNode.name);
        }
      }
    }

    if (targets.length > 0) {
      result[propName] = targets;
    }
  }

  return result;
}

function groupByType(nodes: Node[]): Partial<Record<NodeType, Node[]>> {
  const groups: Partial<Record<NodeType, Node[]>> = {};
  for (const node of nodes) {
    const type = node.type as NodeType;
    if (!groups[type]) groups[type] = [];
    groups[type]!.push(node);
  }
  return groups;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/-+/g, "-");
}
