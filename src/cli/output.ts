import chalk from "chalk";
import { ZodError } from "zod";
import type { Node, Edge } from "../schema/types.js";

export function heading(text: string): void {
  console.log(chalk.bold.cyan(`\n${text}`));
  console.log(chalk.dim("─".repeat(text.length + 2)));
}

export function success(text: string): void {
  console.log(chalk.green(`✓ ${text}`));
}

export function error(text: string): void {
  console.error(chalk.red(`✗ ${text}`));
}

export function formatError(err: unknown): string {
  if (err instanceof ZodError) {
    return err.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n  ");
  }
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    return JSON.stringify(err, null, 2);
  }
  return String(err);
}

export function warn(text: string): void {
  console.log(chalk.yellow(`! ${text}`));
}

export function info(text: string): void {
  console.log(chalk.dim(`  ${text}`));
}

export function nodeLabel(node: Node): string {
  return `${chalk.dim(node.type + ":")}${chalk.bold(node.name)} ${chalk.dim(`[${node.id}]`)}`;
}

export function edgeLabel(edge: Edge): string {
  const from = edge.in.replace(/^node:/, "");
  const to = edge.out.replace(/^node:/, "");
  return `${chalk.dim(from)} ${chalk.yellow(`─${edge.type}→`)} ${chalk.dim(to)}`;
}

export function nodeDetail(node: Node): void {
  heading(`${node.type}: ${node.name}`);
  console.log(`  ${chalk.dim("ID:")}          ${node.id}`);
  console.log(`  ${chalk.dim("App:")}         ${node.app}`);
  if (node.description) {
    console.log(`  ${chalk.dim("Description:")} ${node.description}`);
  }
  if (node.tags.length > 0) {
    console.log(`  ${chalk.dim("Tags:")}        ${node.tags.join(", ")}`);
  }
  if (Object.keys(node.props).length > 0) {
    console.log(`  ${chalk.dim("Props:")}`);
    for (const [key, value] of Object.entries(node.props)) {
      const display = Array.isArray(value) ? value.join(", ") : String(value);
      console.log(`    ${chalk.dim(key + ":")} ${display}`);
    }
  }
  console.log(`  ${chalk.dim("Version:")}     ${node.version}`);
  if (node.createdAt) {
    console.log(`  ${chalk.dim("Created:")}     ${node.createdAt}`);
  }
  if (node.updatedAt) {
    console.log(`  ${chalk.dim("Updated:")}     ${node.updatedAt}`);
  }
}

export function nodeTable(nodes: Node[]): void {
  if (nodes.length === 0) {
    info("No nodes found.");
    return;
  }

  // Calculate column widths
  const typeWidth = Math.max(12, ...nodes.map((n) => n.type.length));
  const nameWidth = Math.max(20, ...nodes.map((n) => n.name.length));
  const idWidth = Math.max(15, ...nodes.map((n) => n.id.length));

  // Header
  const header =
    chalk.dim("TYPE".padEnd(typeWidth)) + "  " +
    chalk.dim("NAME".padEnd(nameWidth)) + "  " +
    chalk.dim("ID".padEnd(idWidth));
  console.log(header);
  console.log(chalk.dim("─".repeat(typeWidth + nameWidth + idWidth + 4)));

  // Rows
  for (const node of nodes) {
    console.log(
      chalk.cyan(node.type.padEnd(typeWidth)) + "  " +
      node.name.padEnd(nameWidth) + "  " +
      chalk.dim(node.id.padEnd(idWidth))
    );
  }

  console.log(chalk.dim(`\n${nodes.length} node(s)`));
}

export function edgeTable(edges: Edge[]): void {
  if (edges.length === 0) {
    info("No edges found.");
    return;
  }

  for (const edge of edges) {
    console.log(`  ${edgeLabel(edge)}`);
  }

  console.log(chalk.dim(`\n${edges.length} edge(s)`));
}
