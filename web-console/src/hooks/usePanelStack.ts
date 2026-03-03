import { useSearchParams } from 'react-router-dom'
import { useCallback, useMemo } from 'react'

export interface PanelEntry {
  nodeId: string
  nodeType: string
  label: string
}

const PANEL_PARAM = 'panel'

function encodePanelStack(stack: PanelEntry[]): string {
  return stack.map((e) => `${e.nodeId}:${e.nodeType}:${encodeURIComponent(e.label)}`).join(',')
}

function decodePanelStack(param: string): PanelEntry[] {
  if (!param) return []
  return param.split(',').map((seg) => {
    const [nodeId, nodeType, label] = seg.split(':')
    return { nodeId, nodeType, label: decodeURIComponent(label ?? '') }
  }).filter((e) => e.nodeId && e.nodeType)
}

export function usePanelStack() {
  const [searchParams, setSearchParams] = useSearchParams()

  const stack = useMemo(() => {
    const raw = searchParams.get(PANEL_PARAM)
    return raw ? decodePanelStack(raw) : []
  }, [searchParams])

  const isOpen = stack.length > 0
  const current = stack[stack.length - 1] ?? null

  const push = useCallback((entry: PanelEntry) => {
    setSearchParams((prev) => {
      const newStack = [...stack, entry]
      prev.set(PANEL_PARAM, encodePanelStack(newStack))
      return prev
    }, { replace: false })
  }, [stack, setSearchParams])

  const pop = useCallback(() => {
    setSearchParams((prev) => {
      const newStack = stack.slice(0, -1)
      if (newStack.length === 0) {
        prev.delete(PANEL_PARAM)
      } else {
        prev.set(PANEL_PARAM, encodePanelStack(newStack))
      }
      return prev
    }, { replace: false })
  }, [stack, setSearchParams])

  const popTo = useCallback((index: number) => {
    setSearchParams((prev) => {
      const newStack = stack.slice(0, index + 1)
      if (newStack.length === 0) {
        prev.delete(PANEL_PARAM)
      } else {
        prev.set(PANEL_PARAM, encodePanelStack(newStack))
      }
      return prev
    }, { replace: false })
  }, [stack, setSearchParams])

  const closeAll = useCallback(() => {
    setSearchParams((prev) => {
      prev.delete(PANEL_PARAM)
      return prev
    }, { replace: false })
  }, [setSearchParams])

  return { stack, current, isOpen, push, pop, popTo, closeAll }
}
