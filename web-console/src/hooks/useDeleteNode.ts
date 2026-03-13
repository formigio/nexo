import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteNodeApi } from '@/api/nodes'
import { useToast } from '@/hooks/useToast'

interface UseDeleteNodeOptions {
  onSuccess: () => void
}

export function useDeleteNode({ onSuccess }: UseDeleteNodeOptions) {
  const queryClient = useQueryClient()
  const toast = useToast()

  const mutation = useMutation({
    mutationFn: (id: string) => deleteNodeApi(id),
    onSuccess: (_data, nodeId) => {
      // Invalidate all caches that may reference this node
      queryClient.invalidateQueries({ queryKey: ['generic-panel', nodeId] })
      queryClient.invalidateQueries({ queryKey: ['node-edit', nodeId] })
      queryClient.invalidateQueries({ queryKey: ['component-detail', nodeId] })
      queryClient.invalidateQueries({ queryKey: ['graph'] })
      queryClient.invalidateQueries({ queryKey: ['graph-view'] })
      queryClient.invalidateQueries({ queryKey: ['nodes'] })
      queryClient.invalidateQueries({ queryKey: ['node-list'] })
      queryClient.invalidateQueries({ queryKey: ['apps'] })
      queryClient.invalidateQueries({ queryKey: ['screens'] })
      onSuccess()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete node')
    },
  })

  return {
    deleteNode: (id: string, name: string) => {
      mutation.mutate(id, {
        onSuccess: () => toast.success(`Deleted ${name}`),
      })
    },
    isDeleting: mutation.isPending,
  }
}
