import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteEdgeApi } from '@/api/edges'
import { useToast } from '@/hooks/useToast'
import type { Edge } from '@/lib/types'
import type { ReactNode } from 'react'

interface DeletableEdgeRowProps {
  edge: Edge
  panelNodeId: string
  onDeleted: () => void
  children: ReactNode
}

function SmallXIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

export function DeletableEdgeRow({ edge, panelNodeId, onDeleted, children }: DeletableEdgeRowProps) {
  const [confirming, setConfirming] = useState(false)
  const queryClient = useQueryClient()
  const toast = useToast()

  const mutation = useMutation({
    mutationFn: () => deleteEdgeApi(edge.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generic-panel', panelNodeId] })
      queryClient.invalidateQueries({ queryKey: ['component-detail', panelNodeId] })
      queryClient.invalidateQueries({ queryKey: ['graph'] })
      toast.success('Edge deleted')
      onDeleted()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete edge')
      setConfirming(false)
    },
  })

  if (confirming) {
    return (
      <div className="flex items-center gap-2 py-1 px-2 rounded bg-surface-2">
        <span className="text-[11px] text-text-secondary flex-1">Delete edge?</span>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="px-2 py-0.5 text-[11px] font-medium text-white bg-impact-breaking rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {mutation.isPending ? '...' : 'Delete'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={mutation.isPending}
          className="px-2 py-0.5 text-[11px] text-text-secondary border border-border-default rounded hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-0.5">
      <div className="flex-1 min-w-0">{children}</div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setConfirming(true)
        }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-dim hover:text-impact-breaking hover:bg-impact-breaking/10 transition-all shrink-0"
        title="Delete edge"
      >
        <SmallXIcon />
      </button>
    </div>
  )
}
