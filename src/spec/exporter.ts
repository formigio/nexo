import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import type { GraphClient } from "../client/types.js";
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
  client: GraphClient,
  opts: ExportOptions,
): Promise<ExportResults> {
  const nodes = await client.listNodes({ app: opts.app });
  const allEdges = await client.listEdges();
  const files: string[] = [];

  // Build lookup maps
  const nodeById = new Map<string, Node>();
  for (const n of nodes) nodeById.set(n.id, n);

  // Scope edges to this app's nodes (at least one endpoint must be in the app)
  const appNodeIds = new Set(nodes.map(n => n.id));
  const appEdges = allEdges.filter(e => appNodeIds.has(e.in) || appNodeIds.has(e.out));

  // Build BELONGS_TO map: nodeId → featureId (only if feature exists in this app)
  const featureIds = new Set(nodes.filter(n => n.type === "Feature").map(n => n.id));
  const nodeToFeature = new Map<string, string>();
  for (const e of appEdges) {
    if (e.type === "BELONGS_TO" && featureIds.has(e.out)) {
      nodeToFeature.set(e.in, e.out);
    }
  }

  // Build HAS_FIELD map: DataField ID → parent DataEntity ID
  const fieldToEntity = new Map<string, string>();
  for (const e of appEdges) {
    if (e.type === "HAS_FIELD") {
      fieldToEntity.set(e.out, e.in);
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
    const content = buildFeatureYaml(opts.app, feature, members, appEdges, nodeById, fieldToEntity);
    const fileName = slugify(feature.name) + ".graph.yaml";
    const filePath = join(featuresDir, fileName);
    writeFileSync(filePath, content, "utf-8");
    files.push(filePath);
  }

  // Export orphan data entities (with nested fields)
  const orphanEntities = nodes.filter(
    n => n.type === "DataEntity" && !nodeToFeature.has(n.id),
  );
  if (orphanEntities.length > 0) {
    const content = buildDataYaml(opts.app, orphanEntities, appEdges, nodeById);
    const filePath = join(dataDir, "entities.graph.yaml");
    writeFileSync(filePath, content, "utf-8");
    files.push(filePath);
  }

  // Export orphan DataFields (not nested under any entity AND not in any feature)
  const orphanFields = nodes.filter(
    n => n.type === "DataField" && !nodeToFeature.has(n.id) && !fieldToEntity.has(n.id),
  );
  if (orphanFields.length > 0) {
    const content = buildOrphanFileYaml(opts.app, "data", "fields", orphanFields, appEdges, nodeById);
    const filePath = join(dataDir, "fields.graph.yaml");
    writeFileSync(filePath, content, "utf-8");
    files.push(filePath);
  }

  // Export orphan infra resources
  const orphanInfra = nodes.filter(
    n => n.type === "InfraResource" && !nodeToFeature.has(n.id),
  );
  if (orphanInfra.length > 0) {
    const content = buildOrphanFileYaml(opts.app, "infra", "resources", orphanInfra, appEdges, nodeById);
    const filePath = join(infraDir, "resources.graph.yaml");
    writeFileSync(filePath, content, "utf-8");
    files.push(filePath);
  }

  // Export orphan user states
  const orphanStates = nodes.filter(
    n => n.type === "UserState" && !nodeToFeature.has(n.id),
  );
  if (orphanStates.length > 0) {
    const content = buildOrphanFileYaml(opts.app, "shared", "states", orphanStates, appEdges, nodeById);
    const filePath = join(sharedDir, "user-states.graph.yaml");
    writeFileSync(filePath, content, "utf-8");
    files.push(filePath);
  }

  // Export orphan source files
  const orphanSourceFiles = nodes.filter(
    n => n.type === "SourceFile" && !nodeToFeature.has(n.id),
  );
  if (orphanSourceFiles.length > 0) {
    const content = buildOrphanFileYaml(opts.app, "shared", "files", orphanSourceFiles, appEdges, nodeById);
    const filePath = join(sharedDir, "source-files.graph.yaml");
    writeFileSync(filePath, content, "utf-8");
    files.push(filePath);
  }

  // Export orphan screens, components, actions, endpoints, rules
  const sharedSections: Array<{ type: string; section: string; fileName: string }> = [
    { type: "Screen", section: "screens", fileName: "screens" },
    { type: "Component", section: "components", fileName: "components" },
    { type: "UserAction", section: "actions", fileName: "actions" },
    { type: "APIEndpoint", section: "endpoints", fileName: "endpoints" },
    { type: "BusinessRule", section: "rules", fileName: "rules" },
    { type: "CLICommand", section: "commands", fileName: "commands" },
    { type: "AgentProcess", section: "processes", fileName: "processes" },
    { type: "Account", section: "accounts", fileName: "accounts" },
  ];
  for (const { type, section, fileName } of sharedSections) {
    const orphans = nodes.filter(
      n => n.type === type && !nodeToFeature.has(n.id),
    );
    if (orphans.length > 0) {
      const content = buildOrphanFileYaml(opts.app, "shared", section, orphans, appEdges, nodeById);
      const filePath = join(sharedDir, `${fileName}.graph.yaml`);
      writeFileSync(filePath, content, "utf-8");
      files.push(filePath);
    }
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
  fieldToEntity: Map<string, string>,
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

  // All node IDs in this file (feature + members + nested fields)
  const fileNodeIds = new Set<string>([feature.id]);
  for (const m of members) fileNodeIds.add(m.id);

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
  if (byType.DataEntity?.length) {
    doc.entities = byType.DataEntity.map(entity => {
      const entry = buildNodeEntry(entity, edges, nodeById);
      // Nest DataField nodes via HAS_FIELD edges
      const fieldEdges = edges.filter(
        e => e.type === "HAS_FIELD" && e.in === entity.id,
      );
      if (fieldEdges.length > 0) {
        const fields: Record<string, unknown>[] = [];
        for (const fe of fieldEdges) {
          const fieldNode = nodeById.get(fe.out);
          if (fieldNode) {
            fields.push(buildNodeEntry(fieldNode, edges, nodeById));
            fileNodeIds.add(fieldNode.id);
          }
        }
        if (fields.length > 0) entry.fields = fields;
      }
      return entry;
    });
  }
  if (byType.InfraResource?.length) {
    doc.resources = byType.InfraResource.map(n => buildNodeEntry(n, edges, nodeById));
  }
  if (byType.UserState?.length) {
    doc.states = byType.UserState.map(n => buildNodeEntry(n, edges, nodeById));
  }
  if (byType.SourceFile?.length) {
    doc.files = byType.SourceFile.map(n => buildNodeEntry(n, edges, nodeById));
  }
  if (byType.CLICommand?.length) {
    doc.commands = byType.CLICommand.map(n => buildNodeEntry(n, edges, nodeById));
  }
  if (byType.AgentProcess?.length) {
    doc.processes = byType.AgentProcess.map(n => buildNodeEntry(n, edges, nodeById));
  }
  if (byType.Account?.length) {
    doc.accounts = byType.Account.map(n => buildNodeEntry(n, edges, nodeById));
  }

  // Orphan DataFields: belong to this feature but not nested under any DataEntity
  const orphanFields = (byType.DataField ?? []).filter(
    n => !fieldToEntity.has(n.id),
  );
  if (orphanFields.length) {
    doc.fields = orphanFields.map(n => buildNodeEntry(n, edges, nodeById));
  }

  // Compute explicit edges (edges not covered by inline refs, BELONGS_TO, or HAS_FIELD)
  const coveredKeys = buildCoveredEdgeKeys(fileNodeIds, edges, nodeById);
  const explicit = computeExplicitEdges(fileNodeIds, edges, nodeById, coveredKeys);
  if (explicit.length > 0) {
    doc.edges = explicit;
  }

  return yaml.dump(doc, { lineWidth: 120, noRefs: true, quotingType: '"' });
}

function buildDataYaml(
  app: string,
  entities: Node[],
  edges: Edge[],
  nodeById: Map<string, Node>,
): string {
  const doc: Record<string, unknown> = {
    nexo: "1.0",
    app,
    kind: "data",
  };

  const fileNodeIds = new Set<string>();
  for (const e of entities) fileNodeIds.add(e.id);

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
          fileNodeIds.add(fieldNode.id);
        }
      }
      if (fields.length > 0) {
        entry.fields = fields;
      }
    }

    return entry;
  });

  // Compute explicit edges
  const coveredKeys = buildCoveredEdgeKeys(fileNodeIds, edges, nodeById);
  const explicit = computeExplicitEdges(fileNodeIds, edges, nodeById, coveredKeys);
  if (explicit.length > 0) {
    doc.edges = explicit;
  }

  return yaml.dump(doc, { lineWidth: 120, noRefs: true, quotingType: '"' });
}

/**
 * Generic builder for orphan node files (infra, shared, data/fields).
 * Accepts a kind + section key to place nodes under the right YAML key.
 */
function buildOrphanFileYaml(
  app: string,
  kind: string,
  sectionKey: string,
  nodes: Node[],
  edges: Edge[],
  nodeById: Map<string, Node>,
): string {
  const doc: Record<string, unknown> = {
    nexo: "1.0",
    app,
    kind,
  };

  const fileNodeIds = new Set<string>();
  for (const n of nodes) fileNodeIds.add(n.id);

  doc[sectionKey] = nodes.map(n => buildNodeEntry(n, edges, nodeById));

  // Compute explicit edges
  const coveredKeys = buildCoveredEdgeKeys(fileNodeIds, edges, nodeById);
  const explicit = computeExplicitEdges(fileNodeIds, edges, nodeById, coveredKeys);
  if (explicit.length > 0) {
    doc.edges = explicit;
  }

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
      for (const e of edges) {
        if (e.type === def.edgeType && e.out === nodeId) {
          const sourceNode = nodeById.get(e.in);
          if (sourceNode) targets.push(sourceNode.name);
        }
      }
    } else {
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

/** Build the set of edge keys that are covered by inline edge definitions for a set of nodes. */
function buildCoveredEdgeKeys(
  fileNodeIds: Set<string>,
  edges: Edge[],
  nodeById: Map<string, Node>,
): Set<string> {
  const covered = new Set<string>();

  for (const nodeId of fileNodeIds) {
    const node = nodeById.get(nodeId);
    if (!node) continue;

    const defs = INLINE_EDGES[node.type as NodeType];
    if (!defs) continue;

    for (const def of Object.values(defs)) {
      if (def.reverse) {
        for (const e of edges) {
          if (e.type === def.edgeType && e.out === nodeId) {
            covered.add(edgeKey(e));
          }
        }
      } else {
        for (const e of edges) {
          if (e.type === def.edgeType && e.in === nodeId) {
            covered.add(edgeKey(e));
          }
        }
      }
    }
  }

  return covered;
}

/**
 * Compute explicit edges for a file — edges not covered by inline refs,
 * BELONGS_TO, or HAS_FIELD. Only includes edges where the source node is in this file.
 */
function computeExplicitEdges(
  fileNodeIds: Set<string>,
  edges: Edge[],
  nodeById: Map<string, Node>,
  coveredEdgeKeys: Set<string>,
): Array<{ type: string; from: string; to: string }> {
  const result: Array<{ type: string; from: string; to: string }> = [];

  for (const e of edges) {
    // Only export edges where the source is in this file
    if (!fileNodeIds.has(e.in)) continue;
    // Skip implicit structural edges
    if (e.type === "BELONGS_TO" || e.type === "HAS_FIELD") continue;
    // Skip edges already covered by inline edge values
    if (coveredEdgeKeys.has(edgeKey(e))) continue;

    const fromNode = nodeById.get(e.in);
    const toNode = nodeById.get(e.out);
    if (fromNode && toNode) {
      result.push({ type: e.type, from: fromNode.name, to: toNode.name });
    }
  }

  return result;
}

function edgeKey(e: Edge): string {
  return `${e.type}:${e.in}:${e.out}`;
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
