import type { NodeType } from './types'

/** Required props per node type — shared by create and edit hooks. */
export const REQUIRED_PROPS: Partial<Record<NodeType, string[]>> = {
  Component: ['componentType'],
  UserState: ['stateType'],
  UserAction: ['actionType'],
  APIEndpoint: ['method', 'path'],
  DataEntity: ['storageType'],
  DataField: ['fieldType'],
  BusinessRule: ['ruleType'],
  Feature: ['featureId'],
  InfraResource: ['provider', 'service'],
  SourceFile: ['repo', 'relativePath'],
}
