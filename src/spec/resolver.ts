import { generateNodeId } from "../schema/ids.js";
import type { NodeType, EdgeType } from "../schema/types.js";
import type { GraphClient } from "../client/types.js";
import type {
  ParsedSpecFile,
  ResolvedSpec,
  ResolvedNode,
  ResolvedEdge,
} from "./types.js";

/**
 * Resolve all parsed spec files into a flat list of nodes and edges
 * with fully resolved IDs.
 *
 * Resolution order for inline edge references:
 * 1. Direct ID reference (matches {prefix}_{slug} pattern)
 * 2. All loaded spec files (matching expected type from edge constraint)
 * 3. Database fallback (for gradual migration from seed data)
 * 4. Best-effort generated ID (with warning)
 */
export async function resolveSpecs(
  files: ParsedSpecFile[],
  client?: GraphClient,
): Promise<ResolvedSpec> {
  const warnings: string[] = [];

  // Phase 1: Build name→ID+type index from all spec files
  const nameIndex = new Map<string, { id: string; type: NodeType }>();
  for (const file of files) {
    for (const node of file.nodes) {
      const id = node.id || generateNodeId(node.type, node.name);
      nameIndex.set(node.name, { id, type: node.type });
    }
  }

  // Phase 2: Build DB fallback index if client is available
  let dbIndex: Map<string, { id: string; type: NodeType }> | null = null;
  if (client) {
    dbIndex = new Map();
    const allNodes = await client.listNodes();
    for (const node of allNodes) {
      dbIndex.set(node.name, { id: node.id, type: node.type as NodeType });
    }
  }

  // Phase 3: Resolve all nodes and edges
  const resolvedNodes: ResolvedNode[] = [];
  const resolvedEdges: ResolvedEdge[] = [];

  for (const file of files) {
    const { header } = file;

    // Track the feature node ID for implicit BELONGS_TO edges
    let featureId: string | undefined;
    if (header.kind === "feature") {
      const featureNode = file.nodes.find(n => n.type === "Feature");
      if (featureNode) {
        featureId = featureNode.id || generateNodeId("Feature", featureNode.name);
      }
    }

    for (const node of file.nodes) {
      const id = node.id || generateNodeId(node.type, node.name);

      resolvedNodes.push({
        id,
        type: node.type,
        name: node.name,
        app: header.app,
        description: node.description,
        tags: node.tags ?? [],
        props: node.props,
      });

      // Resolve inline edges
      for (const edge of node.inlineEdges) {
        const resolved = resolveRef(
          edge.targetName, edge.targetType, nameIndex, dbIndex,
        );

        if (!resolved.found) {
          warnings.push(
            `${file.filePath}: Unresolved reference "${edge.targetName}" ` +
            `(expected ${edge.targetType}) from "${node.name}"`,
          );
        }

        const fromId = edge.reverse ? resolved.id : id;
        const toId = edge.reverse ? id : resolved.id;
        resolvedEdges.push({ type: edge.edgeType, from: fromId, to: toId });
      }

      // Implicit BELONGS_TO edge for feature files
      if (featureId && node.type !== "Feature") {
        resolvedEdges.push({ type: "BELONGS_TO", from: id, to: featureId });
      }
    }

    // Resolve explicit edges
    for (const edge of file.explicitEdges) {
      const fromResolved = resolveAnyRef(edge.from, nameIndex, dbIndex);
      const toResolved = resolveAnyRef(edge.to, nameIndex, dbIndex);

      if (!fromResolved.found) {
        warnings.push(`${file.filePath}: Unresolved edge source "${edge.from}"`);
      }
      if (!toResolved.found) {
        warnings.push(`${file.filePath}: Unresolved edge target "${edge.to}"`);
      }

      resolvedEdges.push({
        type: edge.type as EdgeType,
        from: fromResolved.id,
        to: toResolved.id,
        metadata: edge.metadata,
      });
    }
  }

  // Deduplicate edges
  const edgeKey = (e: ResolvedEdge) => `${e.from}|${e.to}|${e.type}`;
  const seenEdges = new Set<string>();
  const uniqueEdges = resolvedEdges.filter(e => {
    const key = edgeKey(e);
    if (seenEdges.has(key)) return false;
    seenEdges.add(key);
    return true;
  });

  return { nodes: resolvedNodes, edges: uniqueEdges, warnings };
}

/**
 * Resolve a reference for a validate-only pass (no DB).
 */
export function resolveSpecsOffline(files: ParsedSpecFile[]): ResolvedSpec {
  // Build name→ID+type index
  const nameIndex = new Map<string, { id: string; type: NodeType }>();
  for (const file of files) {
    for (const node of file.nodes) {
      const id = node.id || generateNodeId(node.type, node.name);
      nameIndex.set(node.name, { id, type: node.type });
    }
  }

  const warnings: string[] = [];
  const resolvedNodes: ResolvedNode[] = [];
  const resolvedEdges: ResolvedEdge[] = [];

  for (const file of files) {
    const { header } = file;
    let featureId: string | undefined;
    if (header.kind === "feature") {
      const featureNode = file.nodes.find(n => n.type === "Feature");
      if (featureNode) {
        featureId = featureNode.id || generateNodeId("Feature", featureNode.name);
      }
    }

    for (const node of file.nodes) {
      const id = node.id || generateNodeId(node.type, node.name);

      resolvedNodes.push({
        id,
        type: node.type,
        name: node.name,
        app: header.app,
        description: node.description,
        tags: node.tags ?? [],
        props: node.props,
      });

      for (const edge of node.inlineEdges) {
        const resolved = resolveRef(edge.targetName, edge.targetType, nameIndex, null);
        if (!resolved.found) {
          warnings.push(
            `${file.filePath}: Unresolved reference "${edge.targetName}" ` +
            `(expected ${edge.targetType}) from "${node.name}"`,
          );
        }
        const fromId = edge.reverse ? resolved.id : id;
        const toId = edge.reverse ? id : resolved.id;
        resolvedEdges.push({ type: edge.edgeType, from: fromId, to: toId });
      }

      if (featureId && node.type !== "Feature") {
        resolvedEdges.push({ type: "BELONGS_TO", from: id, to: featureId });
      }
    }

    for (const edge of file.explicitEdges) {
      const fromResolved = resolveAnyRef(edge.from, nameIndex, null);
      const toResolved = resolveAnyRef(edge.to, nameIndex, null);
      if (!fromResolved.found) {
        warnings.push(`${file.filePath}: Unresolved edge source "${edge.from}"`);
      }
      if (!toResolved.found) {
        warnings.push(`${file.filePath}: Unresolved edge target "${edge.to}"`);
      }
      resolvedEdges.push({
        type: edge.type as EdgeType,
        from: fromResolved.id,
        to: toResolved.id,
        metadata: edge.metadata,
      });
    }
  }

  const edgeKey = (e: ResolvedEdge) => `${e.from}|${e.to}|${e.type}`;
  const seenEdges = new Set<string>();
  const uniqueEdges = resolvedEdges.filter(e => {
    const key = edgeKey(e);
    if (seenEdges.has(key)) return false;
    seenEdges.add(key);
    return true;
  });

  return { nodes: resolvedNodes, edges: uniqueEdges, warnings };
}

// ── Internals ────────────────────────────────────────────────

interface ResolveResult {
  id: string;
  type: NodeType;
  found: boolean;
}

/**
 * Resolve a name reference to a node ID, constrained by expected type.
 */
function resolveRef(
  nameOrId: string,
  expectedType: NodeType,
  nameIndex: Map<string, { id: string; type: NodeType }>,
  dbIndex: Map<string, { id: string; type: NodeType }> | null,
): ResolveResult {
  // Direct ID reference (matches {prefix}_{slug} pattern)
  if (/^[a-z]{3}_/.test(nameOrId)) {
    return { id: nameOrId, type: expectedType, found: true };
  }

  // All loaded spec files
  const fromSpec = nameIndex.get(nameOrId);
  if (fromSpec && fromSpec.type === expectedType) {
    return { ...fromSpec, found: true };
  }

  // DB fallback
  if (dbIndex) {
    const fromDb = dbIndex.get(nameOrId);
    if (fromDb && fromDb.type === expectedType) {
      return { ...fromDb, found: true };
    }
  }

  // Best-effort generated ID
  return { id: generateNodeId(expectedType, nameOrId), type: expectedType, found: false };
}

/**
 * Resolve a reference without type constraint (for explicit edges).
 */
function resolveAnyRef(
  nameOrId: string,
  nameIndex: Map<string, { id: string; type: NodeType }>,
  dbIndex: Map<string, { id: string; type: NodeType }> | null,
): ResolveResult {
  // Direct ID reference
  if (/^[a-z]{3}_/.test(nameOrId)) {
    // Try to find in indices to get the actual type
    for (const [, entry] of nameIndex) {
      if (entry.id === nameOrId) return { ...entry, found: true };
    }
    if (dbIndex) {
      for (const [, entry] of dbIndex) {
        if (entry.id === nameOrId) return { ...entry, found: true };
      }
    }
    // ID format matched but not found in any index — still use it
    return { id: nameOrId, type: "Screen", found: true };
  }

  // By name
  const fromSpec = nameIndex.get(nameOrId);
  if (fromSpec) return { ...fromSpec, found: true };

  if (dbIndex) {
    const fromDb = dbIndex.get(nameOrId);
    if (fromDb) return { ...fromDb, found: true };
  }

  return { id: nameOrId, type: "Screen", found: false };
}
