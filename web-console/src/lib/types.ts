// Browser-friendly types mirroring src/schema/types.ts (no Zod dependency)

export type NodeType =
  | 'Screen'
  | 'Component'
  | 'UserState'
  | 'UserAction'
  | 'APIEndpoint'
  | 'DataEntity'
  | 'DataField'
  | 'BusinessRule'
  | 'Feature'
  | 'InfraResource'
  | 'SourceFile'

export type EdgeType =
  | 'RENDERS'
  | 'CHILD_OF'
  | 'TRIGGERS'
  | 'CALLS'
  | 'REQUIRES_STATE'
  | 'TRANSITIONS_TO'
  | 'READS'
  | 'WRITES'
  | 'HAS_FIELD'
  | 'REFERENCES'
  | 'VALIDATES'
  | 'CONSTRAINS'
  | 'AUTHORIZES'
  | 'BELONGS_TO'
  | 'DEPENDS_ON'
  | 'HOSTED_ON'
  | 'STORED_IN'
  | 'NAVIGATES_TO'
  | 'DISPLAYS'
  | 'ACCEPTS_INPUT'
  | 'IMPLEMENTED_IN'

export interface Node {
  id: string
  type: NodeType
  app: string
  name: string
  description?: string
  tags: string[]
  props: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
  version: number
}

export interface Edge {
  id: string
  type: EdgeType
  in: string
  out: string
  metadata?: Record<string, unknown>
  createdAt?: string
}

// Type-specific props interfaces for convenient access
export interface ScreenProps {
  route?: string
  platform?: string[]
  accessLevel?: string
  parentScreen?: string
}

export interface ComponentProps {
  componentType?: 'interactive' | 'presentational' | 'layout' | 'navigation'
  platform?: string[]
  variants?: string[]
  sourceFile?: string
}

export interface UserActionProps {
  actionType?: 'navigate' | 'mutate' | 'query' | 'authenticate' | 'configure'
  inputType?: 'tap' | 'form' | 'gesture' | 'automatic'
  requiresConfirmation?: boolean
}

export interface APIEndpointProps {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path?: string
  authRequired?: boolean
  requiredRole?: string
}

export interface DataEntityProps {
  storageType?: string
  keyPattern?: string
  indexes?: string[]
}

export interface DataFieldProps {
  fieldType?: string
  required?: boolean
  enumValues?: string[]
  validation?: string
  pii?: boolean
}

export interface BusinessRuleProps {
  ruleType?: string
  priority?: string
  enforcement?: string
  pseudocode?: string
}

export interface FeatureProps {
  featureId?: string
  status?: 'proposed' | 'in-progress' | 'deployed' | 'deprecated'
  priority?: 'P0' | 'P1' | 'P2' | 'P3'
}

export interface SourceFileProps {
  repo?: string
  relativePath?: string
  language?: string
  layer?: string
}

// API response types
export interface ScreenTreeResponse {
  screens: Node[]
  childEdges: Edge[]
}

export interface TraversalResult {
  nodes: Node[]
  edges: Edge[]
  startId: string
  depth: number
}

export interface ImpactResult {
  directImpacts: Node[]
  structuralImpacts: Node[]
  edges: Edge[]
  startNode: Node
  hops: number
}
