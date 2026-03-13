import type { EdgeType, NodeType } from './types'

export const EDGE_CONSTRAINTS: Record<EdgeType, { from: NodeType[]; to: NodeType[] }> = {
  RENDERS: { from: ['Screen'], to: ['Component'] },
  CHILD_OF: { from: ['Screen', 'DataEntity', 'DataField'], to: ['Screen', 'DataEntity'] },
  TRIGGERS: { from: ['Component', 'Feature'], to: ['UserAction', 'Feature'] },
  CALLS: { from: ['UserAction', 'APIEndpoint'], to: ['APIEndpoint', 'Feature'] },
  REQUIRES_STATE: { from: ['Screen'], to: ['UserState'] },
  TRANSITIONS_TO: { from: ['UserState'], to: ['UserState'] },
  READS: { from: ['APIEndpoint', 'Feature'], to: ['DataEntity'] },
  WRITES: { from: ['APIEndpoint', 'Feature'], to: ['DataEntity'] },
  HAS_FIELD: { from: ['DataEntity'], to: ['DataField'] },
  REFERENCES: { from: ['DataField', 'DataEntity'], to: ['DataEntity'] },
  VALIDATES: { from: ['BusinessRule'], to: ['DataField'] },
  CONSTRAINS: { from: ['BusinessRule'], to: ['UserAction'] },
  AUTHORIZES: { from: ['BusinessRule'], to: ['APIEndpoint'] },
  BELONGS_TO: {
    from: ['Screen', 'Component', 'UserState', 'UserAction', 'APIEndpoint',
           'DataEntity', 'DataField', 'BusinessRule', 'InfraResource', 'SourceFile'],
    to: ['Feature'],
  },
  DEPENDS_ON: { from: ['Feature', 'SourceFile'], to: ['Feature', 'SourceFile'] },
  HOSTED_ON: { from: ['APIEndpoint'], to: ['InfraResource'] },
  STORED_IN: { from: ['DataEntity'], to: ['InfraResource', 'DataEntity'] },
  NAVIGATES_TO: { from: ['UserAction'], to: ['Screen'] },
  DISPLAYS: { from: ['Component', 'APIEndpoint'], to: ['DataField', 'Feature'] },
  ACCEPTS_INPUT: { from: ['Component'], to: ['DataField'] },
  IMPLEMENTED_IN: {
    from: ['Screen', 'Component', 'APIEndpoint', 'DataEntity',
           'BusinessRule', 'UserAction', 'UserState', 'InfraResource', 'Feature'],
    to: ['SourceFile'],
  },
}

const ALL_EDGE_TYPES = Object.keys(EDGE_CONSTRAINTS) as EdgeType[]

export function getValidEdgeTypes(sourceType: NodeType): EdgeType[] {
  return ALL_EDGE_TYPES.filter((et) => EDGE_CONSTRAINTS[et].from.includes(sourceType))
}

export function getValidTargetTypes(edgeType: EdgeType): NodeType[] {
  return EDGE_CONSTRAINTS[edgeType].to
}
