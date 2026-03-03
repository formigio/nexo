import type { NodeType, EdgeType } from './types'

export type QueryInputType = 'node' | 'nodeType'

export interface QueryInput {
  label: string
  type: QueryInputType
  /** If set, restrict the node selector to these node types */
  allowedTypes?: NodeType[]
}

export type QueryExecutionType = 'traverse' | 'impact' | 'listByType'

export interface QueryExecution {
  type: QueryExecutionType
  /** For traverse: edge types to follow */
  edgeTypes?: EdgeType[]
  /** For traverse: how many hops */
  depth?: number
  /** For impact: hops */
  hops?: number
  /** For traverse: filter result nodes to these types */
  resultTypes?: NodeType[]
  /** Direction to follow edges: 'outbound' (from → to), 'inbound' (to → from), 'both' */
  direction?: 'outbound' | 'inbound' | 'both'
}

export interface QueryTemplate {
  id: string
  name: string
  description: string
  inputs: QueryInput[]
  execution: QueryExecution
}

export const QUERY_TEMPLATES: QueryTemplate[] = [
  {
    id: 'screen-renders',
    name: 'What does this screen render?',
    description: 'Components, user states, and child screens connected to a screen',
    inputs: [{ label: 'Screen', type: 'node', allowedTypes: ['Screen'] }],
    execution: {
      type: 'traverse',
      edgeTypes: ['RENDERS', 'REQUIRES_STATE', 'CHILD_OF'],
      depth: 1,
    },
  },
  {
    id: 'component-data',
    name: 'What data does this component access?',
    description: 'Data fields and entities that a component displays or accepts input for',
    inputs: [{ label: 'Component', type: 'node', allowedTypes: ['Component'] }],
    execution: {
      type: 'traverse',
      edgeTypes: ['DISPLAYS', 'ACCEPTS_INPUT'],
      depth: 2,
      resultTypes: ['DataField', 'DataEntity'],
    },
  },
  {
    id: 'impact-analysis',
    name: 'What changes if I modify this?',
    description: 'Impact analysis — all nodes affected by a change, classified by severity',
    inputs: [{ label: 'Node', type: 'node' }],
    execution: {
      type: 'impact',
      hops: 3,
    },
  },
  {
    id: 'feature-scope',
    name: 'What is the full scope of this feature?',
    description: 'All nodes that belong to a feature',
    inputs: [{ label: 'Feature', type: 'node', allowedTypes: ['Feature'] }],
    execution: {
      type: 'traverse',
      edgeTypes: ['BELONGS_TO'],
      depth: 1,
    },
  },
  {
    id: 'api-callers',
    name: 'Who calls this API endpoint?',
    description: 'User actions, components, and screens that lead to this endpoint',
    inputs: [{ label: 'API Endpoint', type: 'node', allowedTypes: ['APIEndpoint'] }],
    execution: {
      type: 'traverse',
      edgeTypes: ['CALLS', 'TRIGGERS', 'RENDERS'],
      depth: 3,
    },
  },
  {
    id: 'api-data',
    name: 'What does this API endpoint read and write?',
    description: 'Data entities and fields accessed by an endpoint',
    inputs: [{ label: 'API Endpoint', type: 'node', allowedTypes: ['APIEndpoint'] }],
    execution: {
      type: 'traverse',
      edgeTypes: ['READS', 'WRITES', 'HAS_FIELD'],
      depth: 2,
    },
  },
  {
    id: 'business-rules',
    name: 'What business rules apply to this node?',
    description: 'Business rules that validate or constrain this node',
    inputs: [{ label: 'Node', type: 'node' }],
    execution: {
      type: 'traverse',
      edgeTypes: ['VALIDATES', 'CONSTRAINS'],
      depth: 1,
      resultTypes: ['BusinessRule'],
    },
  },
  {
    id: 'auth-chain',
    name: 'What is the auth chain for this screen?',
    description: 'Required user states and state transitions for accessing a screen',
    inputs: [{ label: 'Screen', type: 'node', allowedTypes: ['Screen'] }],
    execution: {
      type: 'traverse',
      edgeTypes: ['REQUIRES_STATE', 'TRANSITIONS_TO', 'AUTHORIZES'],
      depth: 3,
    },
  },
  {
    id: 'implemented-in',
    name: 'Where is this node implemented?',
    description: 'Source files that implement this node',
    inputs: [{ label: 'Node', type: 'node' }],
    execution: {
      type: 'traverse',
      edgeTypes: ['IMPLEMENTED_IN'],
      depth: 1,
      resultTypes: ['SourceFile'],
    },
  },
  {
    id: 'component-features',
    name: 'What features use this component?',
    description: 'Features that include this component, grouped by feature',
    inputs: [{ label: 'Component', type: 'node', allowedTypes: ['Component'] }],
    execution: {
      type: 'traverse',
      edgeTypes: ['BELONGS_TO'],
      depth: 1,
      resultTypes: ['Feature'],
    },
  },
  {
    id: 'list-by-type',
    name: 'Show me all nodes of a type',
    description: 'List every node of a specific type in the app',
    inputs: [{ label: 'Node type', type: 'nodeType' }],
    execution: {
      type: 'listByType',
    },
  },
  {
    id: 'data-field-deps',
    name: 'What depends on this data field?',
    description: 'Components, screens, and rules that use this field',
    inputs: [{ label: 'Data Field', type: 'node', allowedTypes: ['DataField'] }],
    execution: {
      type: 'traverse',
      edgeTypes: ['DISPLAYS', 'ACCEPTS_INPUT', 'VALIDATES'],
      depth: 2,
    },
  },
]
