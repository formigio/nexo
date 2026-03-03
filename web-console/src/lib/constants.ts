import type { NodeType, EdgeType } from './types'

export const NODE_TYPE_COLORS: Record<NodeType, string> = {
  Screen: '#58a6ff',
  APIEndpoint: '#3fb950',
  BusinessRule: '#f85149',
  Component: '#d2a8ff',
  Feature: '#ffa657',
  DataEntity: '#79c0ff',
  DataField: '#a8d8f0',
  UserAction: '#ffd700',
  UserState: '#ff7b72',
  InfraResource: '#8b949e',
  SourceFile: '#56d364',
}

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  Screen: 'Screen',
  Component: 'Component',
  UserState: 'User State',
  UserAction: 'Action',
  APIEndpoint: 'API Endpoint',
  DataEntity: 'Data Entity',
  DataField: 'Data Field',
  BusinessRule: 'Business Rule',
  Feature: 'Feature',
  InfraResource: 'Infrastructure',
  SourceFile: 'Source File',
}

export const NODE_TYPE_PLURALS: Record<NodeType, string> = {
  Screen: 'Screens',
  Component: 'Components',
  UserState: 'User States',
  UserAction: 'Actions',
  APIEndpoint: 'API Endpoints',
  DataEntity: 'Data Entities',
  DataField: 'Data Fields',
  BusinessRule: 'Business Rules',
  Feature: 'Features',
  InfraResource: 'Infrastructure',
  SourceFile: 'Source Files',
}

export const TYPE_PREFIXES: Record<string, NodeType> = {
  scr: 'Screen',
  cmp: 'Component',
  ust: 'UserState',
  act: 'UserAction',
  api: 'APIEndpoint',
  ent: 'DataEntity',
  fld: 'DataField',
  rul: 'BusinessRule',
  ftr: 'Feature',
  inf: 'InfraResource',
  fil: 'SourceFile',
}

export const EDGE_TYPE_COLORS: Record<EdgeType, string> = {
  RENDERS: '#d2a8ff',
  CALLS: '#3fb950',
  AUTHORIZES: '#f85149',
  WRITES: '#ffa657',
  READS: '#79c0ff',
  BELONGS_TO: '#30363d',
  HAS_FIELD: '#30363d',
  VALIDATES: '#ff7b72',
  CONSTRAINS: '#f85149',
  TRIGGERS: '#ffd700',
  NAVIGATES_TO: '#58a6ff',
  STORED_IN: '#8b949e',
  HOSTED_ON: '#8b949e',
  DISPLAYS: '#a8d8f0',
  REQUIRES_STATE: '#ffd700',
  TRANSITIONS_TO: '#ffa657',
  CHILD_OF: '#d2a8ff',
  REFERENCES: '#79c0ff',
  DEPENDS_ON: '#ffa657',
  ACCEPTS_INPUT: '#a8d8f0',
  IMPLEMENTED_IN: '#56d364',
}

export const NODE_TYPE_RADIUS: Record<NodeType, number> = {
  Feature: 12,
  Screen: 9,
  APIEndpoint: 9,
  BusinessRule: 9,
  Component: 7,
  DataEntity: 7,
  UserAction: 6,
  InfraResource: 6,
  DataField: 5,
  UserState: 5,
  SourceFile: 4,
}

export const ACCESS_LEVEL_ORDER = ['public', 'authenticated', 'role:organizer', 'role:admin'] as const

export const ACCESS_LEVEL_LABELS: Record<string, string> = {
  public: 'Public',
  authenticated: 'Authenticated',
  'role:organizer': 'Organizer',
  'role:admin': 'Admin',
}
