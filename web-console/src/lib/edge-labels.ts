import type { EdgeType } from './types'

export const EDGE_LABELS: Record<EdgeType, { outbound: string; inbound: string }> = {
  RENDERS: { outbound: 'renders', inbound: 'rendered by' },
  CHILD_OF: { outbound: 'child of', inbound: 'parent of' },
  TRIGGERS: { outbound: 'triggers', inbound: 'triggered by' },
  CALLS: { outbound: 'calls', inbound: 'called by' },
  REQUIRES_STATE: { outbound: 'requires state', inbound: 'required by' },
  TRANSITIONS_TO: { outbound: 'transitions to', inbound: 'transitioned from' },
  READS: { outbound: 'reads', inbound: 'read by' },
  WRITES: { outbound: 'writes', inbound: 'written by' },
  HAS_FIELD: { outbound: 'has field', inbound: 'field of' },
  REFERENCES: { outbound: 'references', inbound: 'referenced by' },
  VALIDATES: { outbound: 'validates', inbound: 'validated by' },
  CONSTRAINS: { outbound: 'constrains', inbound: 'constrained by' },
  AUTHORIZES: { outbound: 'authorizes', inbound: 'authorized by' },
  BELONGS_TO: { outbound: 'belongs to', inbound: 'includes' },
  DEPENDS_ON: { outbound: 'depends on', inbound: 'depended on by' },
  HOSTED_ON: { outbound: 'hosted on', inbound: 'hosts' },
  STORED_IN: { outbound: 'stored in', inbound: 'stores' },
  NAVIGATES_TO: { outbound: 'navigates to', inbound: 'navigated from' },
  DISPLAYS: { outbound: 'displays', inbound: 'displayed by' },
  ACCEPTS_INPUT: { outbound: 'accepts input', inbound: 'input for' },
  IMPLEMENTED_IN: { outbound: 'implemented in', inbound: 'implements' },
}

export function getEdgeLabel(edgeType: EdgeType, direction: 'outbound' | 'inbound'): string {
  return EDGE_LABELS[edgeType]?.[direction] ?? edgeType.toLowerCase().replace(/_/g, ' ')
}
