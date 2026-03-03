/**
 * Example Seed: Todo App
 *
 * A simple but complete todo application modeled as a Nexo spec graph.
 * Demonstrates all core node types, edge types, and graph patterns.
 *
 * Usage: npm run seed:example
 */

import { loadConfig } from "../config/loader.js";
import { getDb, closeDb } from "../db/client.js";
import { createNode } from "../db/nodes.js";
import { createEdge } from "../db/edges.js";
import type { CreateNodeInput, CreateEdgeInput } from "../schema/types.js";

const APP = "todo";

// ── Node Helpers ─────────────────────────────────────────────

function scr(name: string, props: Record<string, unknown>, desc?: string): CreateNodeInput {
  return { type: "Screen", app: APP, name, props: { platform: ["web"], ...props }, description: desc, tags: [] };
}

function cmp(name: string, props: Record<string, unknown>, desc?: string): CreateNodeInput {
  return { type: "Component", app: APP, name, props: { platform: ["web"], ...props }, description: desc, tags: [] };
}

function ust(name: string, props: Record<string, unknown>, desc?: string): CreateNodeInput {
  return { type: "UserState", app: APP, name, props, description: desc, tags: [] };
}

function act(name: string, props: Record<string, unknown>, desc?: string): CreateNodeInput {
  return { type: "UserAction", app: APP, name, props, description: desc, tags: [] };
}

function api(name: string, props: Record<string, unknown>, desc?: string): CreateNodeInput {
  return { type: "APIEndpoint", app: APP, name, props, description: desc, tags: [] };
}

function ent(name: string, props: Record<string, unknown>, desc?: string): CreateNodeInput {
  return { type: "DataEntity", app: APP, name, props, description: desc, tags: [] };
}

function fld(name: string, props: Record<string, unknown>, desc?: string): CreateNodeInput {
  return { type: "DataField", app: APP, name, props, description: desc, tags: [] };
}

function rul(name: string, props: Record<string, unknown>, desc?: string): CreateNodeInput {
  return { type: "BusinessRule", app: APP, name, props, description: desc, tags: [] };
}

function ftr(name: string, props: Record<string, unknown>, desc?: string): CreateNodeInput {
  return { type: "Feature", app: APP, name, props, description: desc, tags: [] };
}

function edge(type: string, from: string, to: string): CreateEdgeInput {
  return { type, from, to };
}

// ══════════════════════════════════════════════════════════════
// NODE DEFINITIONS
// ══════════════════════════════════════════════════════════════

// ── Features (4) ─────────────────────────────────────────────

const featureNodes: CreateNodeInput[] = [
  ftr("Authentication", { featureId: "F1", status: "deployed", priority: "P0" }, "Email/password login and registration"),
  ftr("Todo Management", { featureId: "F2", status: "deployed", priority: "P0" }, "Create, edit, complete, and delete todos"),
  ftr("Todo Lists", { featureId: "F3", status: "deployed", priority: "P1" }, "Organize todos into named lists"),
  ftr("Due Dates", { featureId: "F4", status: "in-progress", priority: "P1" }, "Assign and track due dates on todos"),
];

// ── User States (3) ──────────────────────────────────────────

const stateNodes: CreateNodeInput[] = [
  ust("Unauthenticated", { stateType: "auth", conditions: ["no session token"], isTerminal: false }),
  ust("Authenticated", { stateType: "auth", conditions: ["valid session token"], isTerminal: false }),
  ust("Onboarding", { stateType: "composite", conditions: ["authenticated", "zero todos"], isTerminal: false }),
];

// ── Screens (5) ──────────────────────────────────────────────

const screenNodes: CreateNodeInput[] = [
  scr("Login", { route: "/login", accessLevel: "public" }, "Email/password login form"),
  scr("Register", { route: "/register", accessLevel: "public" }, "Create a new account"),
  scr("Todo List", { route: "/", accessLevel: "authenticated" }, "Main view showing all todos with filters"),
  scr("Todo Detail", { route: "/todos/:id", accessLevel: "authenticated" }, "View and edit a single todo"),
  scr("Settings", { route: "/settings", accessLevel: "authenticated" }, "User preferences and account settings"),
];

// ── Components (8) ───────────────────────────────────────────

const componentNodes: CreateNodeInput[] = [
  cmp("LoginForm", { componentType: "interactive" }, "Email and password input with submit button"),
  cmp("RegisterForm", { componentType: "interactive" }, "Registration form with email, password, confirm password"),
  cmp("TodoItem", { componentType: "interactive", variants: ["compact", "expanded"] }, "Single todo row with checkbox, title, and actions"),
  cmp("TodoForm", { componentType: "interactive" }, "Input for creating or editing a todo"),
  cmp("FilterBar", { componentType: "interactive" }, "Filter todos by status: all, active, completed"),
  cmp("ListSelector", { componentType: "interactive" }, "Dropdown to select or create a todo list"),
  cmp("DueDatePicker", { componentType: "interactive" }, "Date picker for assigning due dates"),
  cmp("NavBar", { componentType: "navigation" }, "Top navigation with logo, list selector, and settings link"),
];

// ── User Actions (8) ─────────────────────────────────────────

const actionNodes: CreateNodeInput[] = [
  act("Log In", { actionType: "authenticate", inputType: "form" }, "Submit email and password to authenticate"),
  act("Register", { actionType: "authenticate", inputType: "form" }, "Create a new account with email and password"),
  act("Create Todo", { actionType: "mutate", inputType: "form" }, "Add a new todo to the current list"),
  act("Toggle Todo", { actionType: "mutate", inputType: "tap" }, "Mark a todo as completed or active"),
  act("Edit Todo", { actionType: "mutate", inputType: "form" }, "Update a todo's title or description"),
  act("Delete Todo", { actionType: "mutate", inputType: "tap", requiresConfirmation: true }, "Permanently remove a todo"),
  act("Filter Todos", { actionType: "query", inputType: "tap" }, "Filter the list by all, active, or completed"),
  act("Set Due Date", { actionType: "mutate", inputType: "form" }, "Assign or change a todo's due date"),
];

// ── API Endpoints (8) ────────────────────────────────────────

const apiNodes: CreateNodeInput[] = [
  api("POST /auth/login", { method: "POST", path: "/auth/login", authRequired: false }, "Authenticate and return session token"),
  api("POST /auth/register", { method: "POST", path: "/auth/register", authRequired: false }, "Create account and return session token"),
  api("GET /todos", { method: "GET", path: "/todos", authRequired: true }, "List todos for the authenticated user, with optional filters"),
  api("POST /todos", { method: "POST", path: "/todos", authRequired: true }, "Create a new todo"),
  api("GET /todos/:id", { method: "GET", path: "/todos/:id", authRequired: true }, "Get a single todo by ID"),
  api("PUT /todos/:id", { method: "PUT", path: "/todos/:id", authRequired: true }, "Update a todo (title, completed, dueDate, listId)"),
  api("DELETE /todos/:id", { method: "DELETE", path: "/todos/:id", authRequired: true }, "Delete a todo"),
  api("GET /lists", { method: "GET", path: "/lists", authRequired: true }, "List all todo lists for the user"),
];

// ── Data Entities (3) ────────────────────────────────────────

const entityNodes: CreateNodeInput[] = [
  ent("User", { storageType: "database" }, "Registered user account"),
  ent("Todo", { storageType: "database" }, "A single todo item belonging to a user"),
  ent("TodoList", { storageType: "database" }, "A named collection of todos"),
];

// ── Data Fields (12) ─────────────────────────────────────────

const fieldNodes: CreateNodeInput[] = [
  // User fields
  fld("User.email", { fieldType: "string", required: true, pii: true }, "User's email address"),
  fld("User.passwordHash", { fieldType: "string", required: true, pii: true }, "Bcrypt-hashed password"),
  fld("User.createdAt", { fieldType: "datetime", required: true }, "Account creation timestamp"),
  // Todo fields
  fld("Todo.title", { fieldType: "string", required: true, maxLength: 255 }, "Todo title text"),
  fld("Todo.completed", { fieldType: "boolean", required: true, defaultValue: false }, "Whether the todo is done"),
  fld("Todo.description", { fieldType: "string", required: false }, "Optional longer description"),
  fld("Todo.dueDate", { fieldType: "datetime", required: false }, "Optional due date"),
  fld("Todo.createdAt", { fieldType: "datetime", required: true }, "Creation timestamp"),
  fld("Todo.listId", { fieldType: "reference", required: false }, "Which list this todo belongs to"),
  // TodoList fields
  fld("TodoList.name", { fieldType: "string", required: true, maxLength: 100 }, "List name"),
  fld("TodoList.color", { fieldType: "string", required: false }, "Optional display color"),
  fld("TodoList.userId", { fieldType: "reference", required: true }, "Owning user"),
];

// ── Business Rules (4) ───────────────────────────────────────

const ruleNodes: CreateNodeInput[] = [
  rul("Todo title required", { ruleType: "validation", priority: "critical", enforcement: "both" }, "Every todo must have a non-empty title"),
  rul("Todos are user-scoped", { ruleType: "authorization", priority: "critical", enforcement: "server" }, "Users can only see and modify their own todos"),
  rul("Password minimum length", { ruleType: "validation", priority: "critical", enforcement: "both" }, "Passwords must be at least 8 characters"),
  rul("Completed todos sort last", { ruleType: "behavior", priority: "nice-to-have", enforcement: "client" }, "Completed todos appear below active todos in the list"),
];

// ══════════════════════════════════════════════════════════════
// EDGE DEFINITIONS
// ══════════════════════════════════════════════════════════════

const edges: CreateEdgeInput[] = [
  // ── REQUIRES_STATE (Screen → UserState)
  edge("REQUIRES_STATE", "scr_login", "ust_unauthenticated"),
  edge("REQUIRES_STATE", "scr_register", "ust_unauthenticated"),
  edge("REQUIRES_STATE", "scr_todo_list", "ust_authenticated"),
  edge("REQUIRES_STATE", "scr_todo_detail", "ust_authenticated"),
  edge("REQUIRES_STATE", "scr_settings", "ust_authenticated"),

  // ── TRANSITIONS_TO (UserState → UserState)
  edge("TRANSITIONS_TO", "ust_unauthenticated", "ust_authenticated"),
  edge("TRANSITIONS_TO", "ust_authenticated", "ust_unauthenticated"),
  edge("TRANSITIONS_TO", "ust_authenticated", "ust_onboarding"),

  // ── RENDERS (Screen → Component)
  edge("RENDERS", "scr_login", "cmp_login_form"),
  edge("RENDERS", "scr_register", "cmp_register_form"),
  edge("RENDERS", "scr_todo_list", "cmp_todo_item"),
  edge("RENDERS", "scr_todo_list", "cmp_todo_form"),
  edge("RENDERS", "scr_todo_list", "cmp_filter_bar"),
  edge("RENDERS", "scr_todo_list", "cmp_list_selector"),
  edge("RENDERS", "scr_todo_list", "cmp_nav_bar"),
  edge("RENDERS", "scr_todo_detail", "cmp_todo_form"),
  edge("RENDERS", "scr_todo_detail", "cmp_due_date_picker"),
  edge("RENDERS", "scr_todo_detail", "cmp_nav_bar"),

  // ── TRIGGERS (Component → UserAction)
  edge("TRIGGERS", "cmp_login_form", "act_log_in"),
  edge("TRIGGERS", "cmp_register_form", "act_register"),
  edge("TRIGGERS", "cmp_todo_form", "act_create_todo"),
  edge("TRIGGERS", "cmp_todo_item", "act_toggle_todo"),
  edge("TRIGGERS", "cmp_todo_item", "act_delete_todo"),
  edge("TRIGGERS", "cmp_todo_form", "act_edit_todo"),
  edge("TRIGGERS", "cmp_filter_bar", "act_filter_todos"),
  edge("TRIGGERS", "cmp_due_date_picker", "act_set_due_date"),

  // ── CALLS (UserAction → APIEndpoint)
  edge("CALLS", "act_log_in", "api_post_auth_login"),
  edge("CALLS", "act_register", "api_post_auth_register"),
  edge("CALLS", "act_create_todo", "api_post_todos"),
  edge("CALLS", "act_toggle_todo", "api_put_todos_id"),
  edge("CALLS", "act_edit_todo", "api_put_todos_id"),
  edge("CALLS", "act_delete_todo", "api_delete_todos_id"),
  edge("CALLS", "act_filter_todos", "api_get_todos"),
  edge("CALLS", "act_set_due_date", "api_put_todos_id"),

  // ── NAVIGATES_TO (UserAction → Screen)
  edge("NAVIGATES_TO", "act_log_in", "scr_todo_list"),
  edge("NAVIGATES_TO", "act_register", "scr_todo_list"),

  // ── READS / WRITES (APIEndpoint → DataEntity)
  edge("READS", "api_post_auth_login", "ent_user"),
  edge("WRITES", "api_post_auth_register", "ent_user"),
  edge("READS", "api_get_todos", "ent_todo"),
  edge("WRITES", "api_post_todos", "ent_todo"),
  edge("READS", "api_get_todos_id", "ent_todo"),
  edge("READS", "api_put_todos_id", "ent_todo"),
  edge("WRITES", "api_put_todos_id", "ent_todo"),
  edge("READS", "api_delete_todos_id", "ent_todo"),
  edge("WRITES", "api_delete_todos_id", "ent_todo"),
  edge("READS", "api_get_lists", "ent_todo_list"),

  // ── HAS_FIELD (DataEntity → DataField)
  edge("HAS_FIELD", "ent_user", "fld_user_email"),
  edge("HAS_FIELD", "ent_user", "fld_user_password_hash"),
  edge("HAS_FIELD", "ent_user", "fld_user_created_at"),
  edge("HAS_FIELD", "ent_todo", "fld_todo_title"),
  edge("HAS_FIELD", "ent_todo", "fld_todo_completed"),
  edge("HAS_FIELD", "ent_todo", "fld_todo_description"),
  edge("HAS_FIELD", "ent_todo", "fld_todo_due_date"),
  edge("HAS_FIELD", "ent_todo", "fld_todo_created_at"),
  edge("HAS_FIELD", "ent_todo", "fld_todo_list_id"),
  edge("HAS_FIELD", "ent_todo_list", "fld_todo_list_name"),
  edge("HAS_FIELD", "ent_todo_list", "fld_todo_list_color"),
  edge("HAS_FIELD", "ent_todo_list", "fld_todo_list_user_id"),

  // ── REFERENCES (DataField → DataEntity)
  edge("REFERENCES", "fld_todo_list_id", "ent_todo_list"),
  edge("REFERENCES", "fld_todo_list_user_id", "ent_user"),

  // ── DISPLAYS (Component → DataField)
  edge("DISPLAYS", "cmp_todo_item", "fld_todo_title"),
  edge("DISPLAYS", "cmp_todo_item", "fld_todo_completed"),
  edge("DISPLAYS", "cmp_todo_item", "fld_todo_due_date"),
  edge("DISPLAYS", "cmp_due_date_picker", "fld_todo_due_date"),

  // ── ACCEPTS_INPUT (Component → DataField)
  edge("ACCEPTS_INPUT", "cmp_todo_form", "fld_todo_title"),
  edge("ACCEPTS_INPUT", "cmp_todo_form", "fld_todo_description"),
  edge("ACCEPTS_INPUT", "cmp_login_form", "fld_user_email"),
  edge("ACCEPTS_INPUT", "cmp_register_form", "fld_user_email"),
  edge("ACCEPTS_INPUT", "cmp_due_date_picker", "fld_todo_due_date"),

  // ── VALIDATES (BusinessRule → DataField)
  edge("VALIDATES", "rul_todo_title_required", "fld_todo_title"),
  edge("VALIDATES", "rul_password_minimum_length", "fld_user_password_hash"),

  // ── AUTHORIZES (BusinessRule → APIEndpoint)
  edge("AUTHORIZES", "rul_todos_are_user_scoped", "api_get_todos"),
  edge("AUTHORIZES", "rul_todos_are_user_scoped", "api_post_todos"),
  edge("AUTHORIZES", "rul_todos_are_user_scoped", "api_get_todos_id"),
  edge("AUTHORIZES", "rul_todos_are_user_scoped", "api_put_todos_id"),
  edge("AUTHORIZES", "rul_todos_are_user_scoped", "api_delete_todos_id"),

  // ── CONSTRAINS (BusinessRule → UserAction)
  edge("CONSTRAINS", "rul_todo_title_required", "act_create_todo"),
  edge("CONSTRAINS", "rul_todo_title_required", "act_edit_todo"),
  edge("CONSTRAINS", "rul_completed_todos_sort_last", "act_filter_todos"),

  // ── BELONGS_TO (Node → Feature)
  // F1: Authentication
  edge("BELONGS_TO", "scr_login", "ftr_authentication"),
  edge("BELONGS_TO", "scr_register", "ftr_authentication"),
  edge("BELONGS_TO", "cmp_login_form", "ftr_authentication"),
  edge("BELONGS_TO", "cmp_register_form", "ftr_authentication"),
  edge("BELONGS_TO", "act_log_in", "ftr_authentication"),
  edge("BELONGS_TO", "act_register", "ftr_authentication"),
  edge("BELONGS_TO", "api_post_auth_login", "ftr_authentication"),
  edge("BELONGS_TO", "api_post_auth_register", "ftr_authentication"),
  edge("BELONGS_TO", "rul_password_minimum_length", "ftr_authentication"),

  // F2: Todo Management
  edge("BELONGS_TO", "scr_todo_list", "ftr_todo_management"),
  edge("BELONGS_TO", "scr_todo_detail", "ftr_todo_management"),
  edge("BELONGS_TO", "cmp_todo_item", "ftr_todo_management"),
  edge("BELONGS_TO", "cmp_todo_form", "ftr_todo_management"),
  edge("BELONGS_TO", "cmp_filter_bar", "ftr_todo_management"),
  edge("BELONGS_TO", "act_create_todo", "ftr_todo_management"),
  edge("BELONGS_TO", "act_toggle_todo", "ftr_todo_management"),
  edge("BELONGS_TO", "act_edit_todo", "ftr_todo_management"),
  edge("BELONGS_TO", "act_delete_todo", "ftr_todo_management"),
  edge("BELONGS_TO", "act_filter_todos", "ftr_todo_management"),
  edge("BELONGS_TO", "api_get_todos", "ftr_todo_management"),
  edge("BELONGS_TO", "api_post_todos", "ftr_todo_management"),
  edge("BELONGS_TO", "api_get_todos_id", "ftr_todo_management"),
  edge("BELONGS_TO", "api_put_todos_id", "ftr_todo_management"),
  edge("BELONGS_TO", "api_delete_todos_id", "ftr_todo_management"),
  edge("BELONGS_TO", "rul_todo_title_required", "ftr_todo_management"),
  edge("BELONGS_TO", "rul_todos_are_user_scoped", "ftr_todo_management"),
  edge("BELONGS_TO", "rul_completed_todos_sort_last", "ftr_todo_management"),

  // F3: Todo Lists
  edge("BELONGS_TO", "cmp_list_selector", "ftr_todo_lists"),
  edge("BELONGS_TO", "api_get_lists", "ftr_todo_lists"),
  edge("BELONGS_TO", "ent_todo_list", "ftr_todo_lists"),

  // F4: Due Dates
  edge("BELONGS_TO", "cmp_due_date_picker", "ftr_due_dates"),
  edge("BELONGS_TO", "act_set_due_date", "ftr_due_dates"),
  edge("BELONGS_TO", "fld_todo_due_date", "ftr_due_dates"),

  // ── DEPENDS_ON (Feature → Feature)
  edge("DEPENDS_ON", "ftr_todo_management", "ftr_authentication"),
  edge("DEPENDS_ON", "ftr_todo_lists", "ftr_todo_management"),
  edge("DEPENDS_ON", "ftr_due_dates", "ftr_todo_management"),
];

// ══════════════════════════════════════════════════════════════
// ORCHESTRATION
// ══════════════════════════════════════════════════════════════

async function main() {
  loadConfig();
  console.log("Connecting to SurrealDB...");
  const db = await getDb();

  // Wipe existing todo app data
  console.log("Wiping existing todo app data...");
  await db.query(
    `DELETE edge WHERE in IN (SELECT id FROM node WHERE app = $app) OR out IN (SELECT id FROM node WHERE app = $app)`,
    { app: APP }
  );
  await db.query(`DELETE node WHERE app = $app`, { app: APP });
  console.log("  Wiped.");

  // Create all nodes
  const allNodes: CreateNodeInput[] = [
    ...featureNodes,
    ...stateNodes,
    ...screenNodes,
    ...componentNodes,
    ...actionNodes,
    ...apiNodes,
    ...entityNodes,
    ...fieldNodes,
    ...ruleNodes,
  ];

  console.log(`\nCreating ${allNodes.length} nodes...`);
  let nodeCount = 0;
  let nodeErrors = 0;
  for (const input of allNodes) {
    try {
      await createNode(db, input);
      nodeCount++;
    } catch (err) {
      nodeErrors++;
      console.error(`  Node error [${input.type}] "${input.name}": ${(err as Error).message}`);
    }
  }
  console.log(`  ${nodeCount} nodes created (${nodeErrors} errors).`);

  // Create all edges
  console.log(`\nCreating ${edges.length} edges...`);
  let edgeCount = 0;
  let edgeErrors = 0;
  for (const input of edges) {
    try {
      await createEdge(db, input);
      edgeCount++;
    } catch (err) {
      edgeErrors++;
      console.error(`  Edge error [${input.type}] ${input.from} -> ${input.to}: ${(err as Error).message}`);
    }
  }
  console.log(`  ${edgeCount} edges created (${edgeErrors} errors).`);

  // Verification
  console.log("\n═══ Verification ═══");

  const [nodeCounts] = await db.query<[any[]]>(
    `SELECT type, count() as cnt FROM node WHERE app = $app GROUP BY type ORDER BY type`,
    { app: APP }
  );
  console.log("\nNode counts by type:");
  let totalNodes = 0;
  for (const row of (nodeCounts ?? [])) {
    console.log(`  ${row.type}: ${row.cnt}`);
    totalNodes += row.cnt;
  }
  console.log(`  TOTAL: ${totalNodes}`);

  const [edgeCounts] = await db.query<[any[]]>(
    `SELECT type, count() as cnt FROM edge WHERE in.app = $app GROUP BY type ORDER BY type`,
    { app: APP }
  );
  console.log("\nEdge counts by type:");
  let totalEdges = 0;
  for (const row of (edgeCounts ?? [])) {
    console.log(`  ${row.type}: ${row.cnt}`);
    totalEdges += row.cnt;
  }
  console.log(`  TOTAL: ${totalEdges}`);

  console.log(`\nSeed complete: ${totalNodes} nodes, ${totalEdges} edges`);

  await closeDb();
}

main().catch(async (err) => {
  console.error("Seed failed:", err);
  await closeDb();
  process.exit(1);
});
