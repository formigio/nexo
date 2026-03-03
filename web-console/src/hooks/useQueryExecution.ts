import { useQuery } from '@tanstack/react-query'
import { fetchTraversal, fetchImpact } from '@/api/traversal'
import { fetchAllNodes } from '@/api/nodes'
import type { Node, Edge, NodeType } from '@/lib/types'
import type { QueryTemplate } from '@/lib/query-templates'
import { NODE_TYPE_LABELS } from '@/lib/constants'

export interface QueryResultNode {
  node: Node
  connection: string
  depth: number
}

export interface QueryResult {
  templateId: string
  startNode?: Node
  resultNodes: QueryResultNode[]
  edges: Edge[]
  allNodes: Node[]
}

function classifyConnection(
  node: Node,
  startId: string,
  edges: Edge[],
): { connection: string; depth: number } {
  // Check direct connection
  const directEdge = edges.find(
    (e) => (e.in === startId && e.out === node.id) || (e.out === startId && e.in === node.id),
  )
  if (directEdge) {
    const isOutbound = directEdge.in === startId
    return {
      connection: `${directEdge.type} (${isOutbound ? 'outbound' : 'inbound'})`,
      depth: 1,
    }
  }
  // Structural (multi-hop)
  return { connection: 'structural', depth: 2 }
}

export function useQueryExecution(
  template: QueryTemplate | null,
  nodeId: string | null,
  nodeType: NodeType | null,
  app: string,
) {
  return useQuery({
    queryKey: ['query-execution', template?.id, nodeId, nodeType, app],
    queryFn: async (): Promise<QueryResult> => {
      if (!template) throw new Error('No template')

      // List by type: no start node, just fetch all of the chosen type
      if (template.execution.type === 'listByType') {
        if (!nodeType) throw new Error('No node type selected')
        const nodes = await fetchAllNodes({ app, type: nodeType })
        return {
          templateId: template.id,
          resultNodes: nodes.map((n) => ({ node: n, connection: NODE_TYPE_LABELS[nodeType] ?? nodeType, depth: 0 })),
          edges: [],
          allNodes: nodes,
        }
      }

      if (!nodeId) throw new Error('No node selected')
      const exec = template.execution

      if (exec.type === 'impact') {
        const result = await fetchImpact(nodeId, exec.hops ?? 3)
        const directResults: QueryResultNode[] = result.directImpacts.map((n) => ({
          node: n,
          ...classifyConnection(n, nodeId, result.edges),
        }))
        const structuralResults: QueryResultNode[] = result.structuralImpacts.map((n) => ({
          node: n,
          connection: 'structural',
          depth: 2,
        }))
        return {
          templateId: template.id,
          startNode: result.startNode,
          resultNodes: [...directResults, ...structuralResults],
          edges: result.edges,
          allNodes: [result.startNode, ...result.directImpacts, ...result.structuralImpacts],
        }
      }

      // Traverse
      const result = await fetchTraversal(nodeId, {
        depth: exec.depth ?? 2,
        edgeTypes: exec.edgeTypes,
      })

      let resultNodes = result.nodes.filter((n) => n.id !== nodeId)

      // Filter to result types if specified
      if (exec.resultTypes?.length) {
        resultNodes = resultNodes.filter((n) => exec.resultTypes!.includes(n.type))
      }

      const startNode = result.nodes.find((n) => n.id === nodeId)

      return {
        templateId: template.id,
        startNode,
        resultNodes: resultNodes.map((n) => ({
          node: n,
          ...classifyConnection(n, nodeId, result.edges),
        })),
        edges: result.edges,
        allNodes: result.nodes,
      }
    },
    enabled:
      !!template &&
      (template.execution.type === 'listByType' ? !!nodeType : !!nodeId),
    staleTime: 60_000,
  })
}
