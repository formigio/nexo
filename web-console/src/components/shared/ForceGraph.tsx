import {
  useRef,
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react'
import * as d3 from 'd3'
import type { Node, Edge, NodeType, EdgeType } from '@/lib/types'
import {
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  NODE_TYPE_RADIUS,
  EDGE_TYPE_COLORS,
} from '@/lib/constants'

export interface ForceGraphHandle {
  fitView: () => void
}

interface ForceGraphProps {
  nodes: Node[]
  edges: Edge[]
  highlightNodeId?: string
  onNodeClick?: (node: Node, position: { x: number; y: number }) => void
  onEdgeDelete?: (edgeId: string) => void
  activeTypes?: Set<NodeType>
}

interface D3Node extends d3.SimulationNodeDatum {
  id: string
  type: NodeType
  name: string
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  id: string
  type: EdgeType
}

export const ForceGraph = forwardRef<ForceGraphHandle, ForceGraphProps>(
  function ForceGraph({ nodes, edges, highlightNodeId, onNodeClick, onEdgeDelete, activeTypes }, ref) {
    const svgRef = useRef<SVGSVGElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const simRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null)
    const prevNodeIdsRef = useRef<Set<string>>(new Set())
    const prevEdgeIdsRef = useRef<Set<string>>(new Set())
    const edgeHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const edgeLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const onEdgeDeleteRef = useRef(onEdgeDelete)
    onEdgeDeleteRef.current = onEdgeDelete
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

    const fitView = useCallback(() => {
      const svg = svgRef.current
      if (!svg) return
      const g = svg.querySelector('g.graph-container')
      if (!g) return
      const bbox = (g as SVGGElement).getBBox()
      if (!bbox.width || !bbox.height) return
      const { width, height } = dimensions
      const padding = 40
      const scale = Math.min(
        (width - padding * 2) / bbox.width,
        (height - padding * 2) / bbox.height,
        1.5,
      )
      const tx = (width - bbox.width * scale) / 2 - bbox.x * scale
      const ty = (height - bbox.height * scale) / 2 - bbox.y * scale
      d3.select(svg)
        .transition()
        .duration(700)
        .call(
          (d3.zoom() as d3.ZoomBehavior<SVGSVGElement, unknown>).transform as never,
          d3.zoomIdentity.translate(tx, ty).scale(scale),
        )
    }, [dimensions])

    useImperativeHandle(ref, () => ({ fitView }), [fitView])

    // Observe container size
    useEffect(() => {
      const el = containerRef.current
      if (!el) return
      const ro = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (entry) {
          setDimensions({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          })
        }
      })
      ro.observe(el)
      return () => ro.disconnect()
    }, [])

    // Main D3 effect
    useEffect(() => {
      const svg = d3.select(svgRef.current!)
      const { width, height } = dimensions

      svg.attr('width', width).attr('height', height)

      // Filter nodes by activeTypes
      const visibleNodes: D3Node[] = nodes
        .filter((n) => !activeTypes || activeTypes.has(n.type))
        .map((n) => ({ ...n }))
      const visibleIds = new Set(visibleNodes.map((n) => n.id))

      // Deep-copy edges and map in/out → source/target for D3
      const visibleLinks: D3Link[] = edges
        .filter((e) => visibleIds.has(e.in) && visibleIds.has(e.out))
        .map((e) => ({
          id: e.id,
          type: e.type,
          source: e.in,
          target: e.out,
        }))

      // Detect data mutation vs filter/resize change
      const currentNodeIds = new Set(nodes.map((n) => n.id))
      const currentEdgeIds = new Set(edges.map((e) => e.id))
      const prevNodes = prevNodeIdsRef.current
      const prevEdges = prevEdgeIdsRef.current
      const isDataMutation =
        prevNodes.size > 0 &&
        (currentNodeIds.size !== prevNodes.size ||
          currentEdgeIds.size !== prevEdges.size ||
          [...currentNodeIds].some((id) => !prevNodes.has(id)) ||
          [...prevNodes].some((id) => !currentNodeIds.has(id)) ||
          [...currentEdgeIds].some((id) => !prevEdges.has(id)) ||
          [...prevEdges].some((id) => !currentEdgeIds.has(id)))
      prevNodeIdsRef.current = currentNodeIds
      prevEdgeIdsRef.current = currentEdgeIds

      // Clear previous
      svg.selectAll('*').remove()

      const container = svg.append('g').attr('class', 'graph-container')

      // Zoom
      const zoomBehavior = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.05, 4])
        .on('zoom', (e) => container.attr('transform', e.transform))
      svg.call(zoomBehavior)
      svg.on('dblclick.zoom', null)

      // Click background to deselect
      svg.on('click', () => setSelectedId(null))

      // Links group
      const linkGroup = container.append('g').attr('class', 'links')

      // Visible edge lines
      const linkSel = linkGroup
        .selectAll<SVGLineElement, D3Link>('line.edge-line')
        .data(visibleLinks, (d) => d.id)
        .enter()
        .append('line')
        .attr('class', 'edge-line')
        .attr('stroke', (d) => EDGE_TYPE_COLORS[d.type] || '#444')
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.35)

      // Invisible wider hit areas for hover targeting
      const hitSel = linkGroup
        .selectAll<SVGLineElement, D3Link>('line.edge-hit')
        .data(visibleLinks, (d) => d.id)
        .enter()
        .append('line')
        .attr('class', 'edge-hit')
        .attr('stroke', 'transparent')
        .attr('stroke-width', 12)
        .style('cursor', 'pointer')

      // Edge delete overlay — single reusable group
      const edgeOverlay = container.append('g')
        .attr('class', 'edge-delete-overlay')
        .style('display', 'none')
        .style('pointer-events', 'all')

      // Delete circle + X
      edgeOverlay.append('circle')
        .attr('r', 10)
        .attr('fill', '#161b22')
        .attr('stroke', '#30363d')
        .attr('stroke-width', 1)
        .attr('class', 'delete-circle')
        .style('cursor', 'pointer')

      edgeOverlay.append('line')
        .attr('x1', -4).attr('y1', -4).attr('x2', 4).attr('y2', 4)
        .attr('stroke', '#8b949e').attr('stroke-width', 1.5).attr('stroke-linecap', 'round')
        .style('pointer-events', 'none')
      edgeOverlay.append('line')
        .attr('x1', 4).attr('y1', -4).attr('x2', -4).attr('y2', 4)
        .attr('stroke', '#8b949e').attr('stroke-width', 1.5).attr('stroke-linecap', 'round')
        .style('pointer-events', 'none')

      // Confirm popover (foreignObject)
      const confirmFO = container.append('foreignObject')
        .attr('class', 'edge-confirm-fo')
        .attr('width', 120).attr('height', 28)
        .style('display', 'none')
        .style('overflow', 'visible')

      const confirmDiv = confirmFO.append('xhtml:div')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('gap', '4px')
        .style('background', '#161b22')
        .style('border', '1px solid #30363d')
        .style('border-radius', '6px')
        .style('padding', '3px 8px')
        .style('font-size', '11px')
        .style('white-space', 'nowrap')

      confirmDiv.append('xhtml:span')
        .style('color', '#8b949e')
        .text('Delete?')

      let activeEdgeId: string | null = null

      const hideOverlay = () => {
        edgeOverlay.style('display', 'none')
        confirmFO.style('display', 'none')
        activeEdgeId = null
        // Reset edge highlight
        linkSel.attr('stroke-width', 1)
      }

      confirmDiv.append('xhtml:button')
        .style('background', 'none').style('border', 'none').style('color', '#f85149')
        .style('cursor', 'pointer').style('font-size', '11px').style('font-weight', '600')
        .style('padding', '0 2px')
        .text('Yes')
        .on('click', () => {
          if (activeEdgeId && onEdgeDeleteRef.current) onEdgeDeleteRef.current(activeEdgeId)
          hideOverlay()
        })

      confirmDiv.append('xhtml:button')
        .style('background', 'none').style('border', 'none').style('color', '#8b949e')
        .style('cursor', 'pointer').style('font-size', '11px').style('padding', '0 2px')
        .text('No')
        .on('click', hideOverlay)

      // Overlay hover — keep it visible while mouse is on it
      edgeOverlay
        .on('mouseenter', () => {
          if (edgeLeaveTimerRef.current) { clearTimeout(edgeLeaveTimerRef.current); edgeLeaveTimerRef.current = null }
        })
        .on('mouseleave', () => {
          edgeLeaveTimerRef.current = setTimeout(hideOverlay, 200)
        })
        .on('click', () => {
          // Show confirm popover, hide the X button
          if (!activeEdgeId) return
          edgeOverlay.style('display', 'none')
          const overlayTransform = edgeOverlay.attr('transform')
          const match = overlayTransform?.match(/translate\(([^,]+),([^)]+)\)/)
          if (match) {
            confirmFO
              .attr('x', parseFloat(match[1]) - 60)
              .attr('y', parseFloat(match[2]) - 14)
              .style('display', null)
          }
        })

      // Confirm FO hover
      confirmFO
        .on('mouseenter', () => {
          if (edgeLeaveTimerRef.current) { clearTimeout(edgeLeaveTimerRef.current); edgeLeaveTimerRef.current = null }
        })
        .on('mouseleave', () => {
          edgeLeaveTimerRef.current = setTimeout(hideOverlay, 200)
        })

      // Edge hover handlers
      hitSel
        .on('mouseenter', function (_event, d) {
          if (edgeLeaveTimerRef.current) { clearTimeout(edgeLeaveTimerRef.current); edgeLeaveTimerRef.current = null }
          // Thicken the visible line
          linkSel.filter((l) => l.id === d.id).attr('stroke-width', 3)

          edgeHoverTimerRef.current = setTimeout(() => {
            const src = d.source as D3Node
            const tgt = d.target as D3Node
            const mx = ((src.x || 0) + (tgt.x || 0)) / 2
            const my = ((src.y || 0) + (tgt.y || 0)) / 2
            activeEdgeId = d.id
            edgeOverlay
              .attr('transform', `translate(${mx},${my})`)
              .style('display', null)
            confirmFO.style('display', 'none')
          }, 200)
        })
        .on('mouseleave', function (_event, d) {
          if (edgeHoverTimerRef.current) { clearTimeout(edgeHoverTimerRef.current); edgeHoverTimerRef.current = null }
          // Reset line width after delay (allow mouse to reach overlay)
          edgeLeaveTimerRef.current = setTimeout(() => {
            linkSel.filter((l) => l.id === d.id).attr('stroke-width', 1)
            hideOverlay()
          }, 300)
        })

      // Hover style on delete circle
      edgeOverlay.select('.delete-circle')
        .on('mouseenter', function () {
          d3.select(this).attr('fill', '#f85149').attr('stroke', '#f85149')
          edgeOverlay.selectAll('line').attr('stroke', '#fff')
        })
        .on('mouseleave', function () {
          d3.select(this).attr('fill', '#161b22').attr('stroke', '#30363d')
          edgeOverlay.selectAll('line').attr('stroke', '#8b949e')
        })

      // Nodes
      const nodeGroup = container.append('g').attr('class', 'node-group')
      const nodeSel = nodeGroup
        .selectAll<SVGGElement, D3Node>('.node')
        .data(visibleNodes, (d) => d.id)
        .enter()
        .append('g')
        .attr('class', 'node')
        .style('cursor', 'pointer')
        .style('transform-origin', '0 0')
        .on('click', (event, d) => {
          event.stopPropagation()
          setSelectedId(d.id)
          const original = nodes.find((n) => n.id === d.id)
          if (original && onNodeClick) onNodeClick(original, { x: event.clientX, y: event.clientY })
        })
        .call(
          d3
            .drag<SVGGElement, D3Node>()
            .on('start', (event, d) => {
              if (!event.active) sim.alphaTarget(0.3).restart()
              d.fx = d.x
              d.fy = d.y
            })
            .on('drag', (event, d) => {
              d.fx = event.x
              d.fy = event.y
            })
            .on('end', (event, d) => {
              if (!event.active) sim.alphaTarget(0)
              d.fx = null
              d.fy = null
            }),
        )

      // Highlight ring for highlightNodeId
      nodeSel
        .filter((d) => d.id === highlightNodeId)
        .append('circle')
        .attr('r', (d) => (NODE_TYPE_RADIUS[d.type] || 6) + 5)
        .attr('fill', 'none')
        .attr('stroke', (d) => NODE_TYPE_COLORS[d.type] || '#888')
        .attr('stroke-width', 2)
        .attr('class', 'pulse-ring')

      nodeSel
        .append('circle')
        .attr('r', (d) => NODE_TYPE_RADIUS[d.type] || 6)
        .attr('fill', (d) => NODE_TYPE_COLORS[d.type] || '#888')
        .attr('stroke', (d) =>
          d3.color(NODE_TYPE_COLORS[d.type] || '#888')!.darker(0.5).formatHex(),
        )
        .attr('stroke-width', 1.5)

      nodeSel
        .append('text')
        .attr('dy', (d) => (NODE_TYPE_RADIUS[d.type] || 6) + 11)
        .attr('text-anchor', 'middle')
        .attr('fill', '#8b949e')
        .attr('font-size', '9px')
        .attr('pointer-events', 'none')
        .text((d) => (d.name.length > 22 ? d.name.slice(0, 20) + '\u2026' : d.name))

      // Enter animations for data mutations
      if (isDataMutation) {
        nodeSel
          .style('transform', 'scale(0)')
          .style('opacity', '0')
          .transition()
          .duration(300)
          .ease(d3.easeBackOut.overshoot(1.2))
          .style('transform', 'scale(1)')
          .style('opacity', '1')

        linkSel
          .attr('stroke-dasharray', function () {
            return (this as SVGLineElement).getTotalLength?.() || 100
          })
          .attr('stroke-dashoffset', function () {
            return (this as SVGLineElement).getTotalLength?.() || 100
          })
          .transition()
          .duration(400)
          .ease(d3.easeLinear)
          .attr('stroke-dashoffset', 0)
          .on('end', function () {
            d3.select(this).attr('stroke-dasharray', null)
          })
      }

      // Pre-spread nodes
      visibleNodes.forEach((n) => {
        if (n.x == null || n.x === 0) {
          n.x = (Math.random() - 0.5) * width * 0.7 + width / 2
          n.y = (Math.random() - 0.5) * height * 0.7 + height / 2
        }
      })

      // Simulation
      const sim = d3
        .forceSimulation<D3Node>(visibleNodes)
        .force(
          'link',
          d3
            .forceLink<D3Node, D3Link>(visibleLinks)
            .id((d) => d.id)
            .distance(80)
            .strength(0.3),
        )
        .force('charge', d3.forceManyBody().strength(-150).distanceMax(400))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force(
          'collision',
          d3.forceCollide<D3Node>().radius((d) => (NODE_TYPE_RADIUS[d.type] || 6) + 8),
        )
        .alphaDecay(0.015)

      simRef.current = sim

      sim.on('tick', () => {
        linkSel
          .attr('x1', (d) => (d.source as D3Node).x!)
          .attr('y1', (d) => (d.source as D3Node).y!)
          .attr('x2', (d) => (d.target as D3Node).x!)
          .attr('y2', (d) => (d.target as D3Node).y!)
        hitSel
          .attr('x1', (d) => (d.source as D3Node).x!)
          .attr('y1', (d) => (d.source as D3Node).y!)
          .attr('x2', (d) => (d.target as D3Node).x!)
          .attr('y2', (d) => (d.target as D3Node).y!)
        nodeSel.attr('transform', (d) => `translate(${d.x},${d.y})`)
      })

      sim.on('end', () => {
        // Auto fit when simulation settles
        const g = svgRef.current?.querySelector('g.graph-container')
        if (!g) return
        const bbox = (g as SVGGElement).getBBox()
        if (!bbox.width || !bbox.height) return
        const padding = 40
        const scale = Math.min(
          (width - padding * 2) / bbox.width,
          (height - padding * 2) / bbox.height,
          1.5,
        )
        const tx = (width - bbox.width * scale) / 2 - bbox.x * scale
        const ty = (height - bbox.height * scale) / 2 - bbox.y * scale
        svg
          .transition()
          .duration(700)
          .call(
            zoomBehavior.transform,
            d3.zoomIdentity.translate(tx, ty).scale(scale),
          )
      })

      return () => {
        sim.stop()
      }
    }, [nodes, edges, activeTypes, highlightNodeId, onNodeClick, onEdgeDelete, dimensions])

    // Apply highlight/dim classes based on selection
    useEffect(() => {
      const svg = d3.select(svgRef.current!)
      const active = selectedId || highlightNodeId

      if (!active) {
        svg.selectAll('.node').style('opacity', null)
        svg.selectAll('.node text').style('fill', '#8b949e')
        svg.selectAll('.edge-line').style('stroke-opacity', 0.35)
        return
      }

      // Build neighbor set
      const neighbors = new Set<string>([active])
      const highlightEdges = new Set<string>()
      edges.forEach((e) => {
        if (e.in === active || e.out === active) {
          neighbors.add(e.in)
          neighbors.add(e.out)
          highlightEdges.add(e.id)
        }
      })

      svg.selectAll<SVGGElement, D3Node>('.node').style('opacity', (d) =>
        neighbors.has(d.id) ? 1 : 0.15,
      )
      svg
        .selectAll<SVGTextElement, D3Node>('.node text')
        .style('fill', (d) => (neighbors.has(d.id) ? '#e1e4e8' : '#8b949e'))
      svg.selectAll<SVGLineElement, D3Link>('.edge-line').style('stroke-opacity', (d) =>
        highlightEdges.has(d.id) ? 0.9 : 0.05,
      )
    }, [selectedId, highlightNodeId, edges])

    // Count visible types for legend
    const typeCounts = new Map<NodeType, number>()
    nodes.forEach((n) => {
      if (!activeTypes || activeTypes.has(n.type)) {
        typeCounts.set(n.type, (typeCounts.get(n.type) || 0) + 1)
      }
    })
    const visibleNodeCount = activeTypes
      ? nodes.filter((n) => activeTypes.has(n.type)).length
      : nodes.length
    const visibleIds = new Set(
      activeTypes ? nodes.filter((n) => activeTypes.has(n.type)).map((n) => n.id) : nodes.map((n) => n.id),
    )
    const visibleEdgeCount = edges.filter(
      (e) => visibleIds.has(e.in) && visibleIds.has(e.out),
    ).length

    return (
      <div ref={containerRef} className="relative w-full h-full">
        <svg ref={svgRef} className="w-full h-full" />

        {/* Stats overlay */}
        <div className="absolute top-3 right-3 text-[11px] text-text-dim">
          {visibleNodeCount} nodes &middot; {visibleEdgeCount} edges
        </div>

        {/* Legend overlay */}
        <div className="absolute bottom-3 left-3 bg-surface-1/80 backdrop-blur-sm border border-border-default rounded-lg px-3 py-2 text-[11px]">
          <div className="font-semibold text-text-dim uppercase tracking-wide text-[10px] mb-1.5">
            Node Types
          </div>
          {Array.from(typeCounts.entries())
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => (
              <div key={type} className="flex items-center gap-1.5 mb-0.5">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: NODE_TYPE_COLORS[type] }}
                />
                <span className="text-text-secondary">
                  {NODE_TYPE_LABELS[type]} ({count})
                </span>
              </div>
            ))}
        </div>
      </div>
    )
  },
)
