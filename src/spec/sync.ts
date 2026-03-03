import type { Surreal } from "surrealdb";
import chalk from "chalk";
import { getNode, createNode, updateNode } from "../db/nodes.js";
import { createEdge, listEdges } from "../db/edges.js";
import type { ResolvedSpec, SpecSyncResults } from "./types.js";

/**
 * Diff resolved spec against the database and apply changes.
 * Dry-run by default unless `apply` is true.
 */
export async function runSpecSync(
  db: Surreal,
  spec: ResolvedSpec,
  apply: boolean,
): Promise<SpecSyncResults> {
  const results: SpecSyncResults = {
    nodes: { created: [], updated: [], unchanged: [] },
    edges: { created: 0, skipped: 0 },
  };

  // Sync nodes
  for (const node of spec.nodes) {
    const existing = await getNode(db, node.id);

    if (!existing) {
      if (apply) {
        await createNode(db, {
          id: node.id,
          type: node.type,
          app: node.app,
          name: node.name,
          description: node.description,
          tags: node.tags,
          props: node.props,
        });
      }
      results.nodes.created.push(node.id);
    } else {
      const changes = diffProps(existing.props, node.props);
      if (node.description && node.description !== existing.description) {
        changes.push(`description: "${existing.description ?? ""}" → "${node.description}"`);
      }

      if (changes.length === 0) {
        results.nodes.unchanged.push(node.id);
      } else {
        if (apply) {
          await updateNode(db, node.id, {
            description: node.description,
            tags: node.tags,
            props: { ...existing.props, ...node.props },
          });
        }
        results.nodes.updated.push({ id: node.id, changes });
      }
    }
  }

  // Sync edges
  for (const edge of spec.edges) {
    const existing = await listEdges(db, {
      from: edge.from,
      to: edge.to,
      type: edge.type,
    });

    if (existing.length > 0) {
      results.edges.skipped++;
      continue;
    }

    if (apply) {
      try {
        await createEdge(db, {
          type: edge.type,
          from: edge.from,
          to: edge.to,
          metadata: edge.metadata,
        });
        results.edges.created++;
      } catch {
        results.edges.skipped++;
      }
    } else {
      results.edges.created++;
    }
  }

  return results;
}

/**
 * Print a formatted sync report to stdout.
 */
export function printSpecSyncResults(
  results: SpecSyncResults,
  warnings: string[],
  apply: boolean,
): void {
  const { nodes, edges } = results;
  const totalNodes = nodes.created.length + nodes.updated.length + nodes.unchanged.length;

  console.log(`\n${chalk.bold("Nodes:")}  (${totalNodes} total)`);

  if (nodes.unchanged.length > 0) {
    console.log(chalk.dim(`  = Unchanged: ${nodes.unchanged.length}`));
  }
  if (nodes.created.length > 0) {
    const ids = nodes.created.slice(0, 8).join(", ") +
      (nodes.created.length > 8 ? ", ..." : "");
    console.log(
      chalk.green(`  + New:       ${nodes.created.length}`) +
      chalk.dim(`  → ${ids}`),
    );
  }
  for (const u of nodes.updated) {
    console.log(
      chalk.yellow(`  ~ Updated: ${u.id}`) +
      chalk.dim(` (${u.changes.join("; ")})`),
    );
  }

  if (edges.created > 0 || edges.skipped > 0) {
    console.log(`\n${chalk.bold("Edges:")}`);
    if (edges.created > 0) {
      console.log(chalk.green(`  + New: ${edges.created}`));
    }
    if (edges.skipped > 0) {
      console.log(chalk.dim(`  = Existing/skipped: ${edges.skipped}`));
    }
  }

  if (warnings.length > 0) {
    console.log(`\n${chalk.yellow("Warnings:")} (${warnings.length})`);
    for (const w of warnings) {
      console.log(chalk.yellow(`  ! ${w}`));
    }
  }

  if (!apply) {
    console.log(`\n${chalk.yellow("Dry run. Pass --apply to commit changes.")}`);
  } else {
    console.log(`\n${chalk.green("Changes applied.")}`);
  }
}

// ── Internals ────────────────────────────────────────────────

function diffProps(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): string[] {
  const changes: string[] = [];
  for (const [key, newVal] of Object.entries(incoming)) {
    const oldVal = existing[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push(`${key}: ${JSON.stringify(oldVal)} → ${JSON.stringify(newVal)}`);
    }
  }
  return changes;
}
