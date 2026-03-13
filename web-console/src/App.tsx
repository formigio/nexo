import { useState, useEffect } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/auth/AuthProvider'
import { fetchApps } from '@/api/apps'
import { AuthCallback } from '@/auth/AuthCallback'
import { Toolbar } from '@/components/layout/Toolbar'
import { Sidebar } from '@/components/layout/Sidebar'
import { MainArea } from '@/components/layout/MainArea'
import { SlideInPanel } from '@/components/layout/SlideInPanel'
import { Navigator } from '@/components/sidebar/Navigator'
import { ScreenDetailView } from '@/components/screen-detail/ScreenDetailView'
import { WelcomeView } from '@/components/WelcomeView'
import { PanelRouter } from '@/components/drill-in/PanelRouter'
import { CreateNodeDialog } from '@/components/create-node/CreateNodeDialog'
import { useToast } from '@/hooks/useToast'
import { QueryStudioView } from '@/components/query-studio/QueryStudioView'
import { FeatureListView } from '@/components/feature-lens/FeatureListView'
import { FeatureDetailView } from '@/components/feature-lens/FeatureDetailView'
import { GraphRoute } from '@/components/graph/GraphRoute'
import { NodeEditView } from '@/components/node-edit/NodeEditView'
import { usePanelStack } from '@/hooks/usePanelStack'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import type { Node, NodeType } from '@/lib/types'

function App() {
  const [appName, setAppName] = useState('')
  const [globalSearchQuery, setGlobalSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<NodeType>('Screen')
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const panelStack = usePanelStack()
  const { isLoggedIn, loading, login } = useAuth()
  const toast = useToast()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const hideSidebar = location.pathname === '/query' || location.pathname.match(/^\/nodes\/[^/]+\/edit$/)

  // Auto-select the first available app
  const { data: apps } = useQuery({
    queryKey: ['apps'],
    queryFn: fetchApps,
    enabled: isLoggedIn,
  })

  useEffect(() => {
    if (apps?.length && !appName) {
      setAppName(apps[0].app)
    }
  }, [apps, appName])

  // Handle auth callback route before auth gate
  if (location.pathname === '/auth/callback') {
    return <AuthCallback />
  }

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-body">
        <p className="text-text-dim text-sm">Loading...</p>
      </div>
    )
  }

  // Require login
  if (!isLoggedIn) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-body">
        <div className="text-center">
          <h1 className="text-text-primary text-xl font-semibold mb-2">Nexo Console</h1>
          <p className="text-text-dim text-sm mb-6">Sign in to access the specification graph.</p>
          <button
            onClick={() => login()}
            className="px-6 py-2 text-sm font-medium rounded bg-node-screen text-white hover:opacity-90 transition-opacity"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  const handleAppChange = (app: string) => {
    setAppName(app)
    setGlobalSearchQuery('')
    queryClient.invalidateQueries()
  }

  const handleNodeSelect = (node: Node) => {
    if (node.type === 'Screen') {
      navigate(`/screens/${node.id}`)
    } else if (node.type === 'Feature') {
      navigate(`/features/${node.id}`)
    } else {
      panelStack.push({
        nodeId: node.id,
        nodeType: node.type,
        label: node.name,
      })
    }
  }

  return (
    <div className="h-screen flex flex-col bg-bg-body">
      <Toolbar
        appName={appName}
        onAppChange={handleAppChange}
        globalSearchQuery={globalSearchQuery}
        onGlobalSearchChange={setGlobalSearchQuery}
        onNodeSelect={handleNodeSelect}
        onCreateNode={() => setIsCreateDialogOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden relative">
        {!hideSidebar && (
          <Sidebar>
            <Navigator
              app={appName}
              selectedType={selectedType}
              onTypeChange={setSelectedType}
              onNodeSelect={handleNodeSelect}
            />
          </Sidebar>
        )}
        <MainArea>
          <ErrorBoundary>
          <Routes>
            <Route path="/" element={<WelcomeView />} />
            <Route path="/screens/:screenId" element={<ScreenDetailView />} />
            <Route path="/query" element={<QueryStudioView app={appName} />} />
            <Route path="/nodes/:nodeId/edit" element={<NodeEditView />} />
            <Route path="/graph" element={<GraphRoute app={appName} />} />
            <Route path="/features" element={<FeatureListView app={appName} />} />
            <Route
              path="/features/:featureId"
              element={
                <FeatureDetailView
                  onDrillIn={(id, type, label) =>
                    panelStack.push({ nodeId: id, nodeType: type, label })
                  }
                />
              }
            />
          </Routes>
          </ErrorBoundary>
        </MainArea>
        <SlideInPanel>
          {(current, push) => (
            <PanelRouter entry={current} onDrillIn={push} />
          )}
        </SlideInPanel>
      </div>
      <CreateNodeDialog
        isOpen={isCreateDialogOpen}
        defaultApp={appName}
        onClose={() => setIsCreateDialogOpen(false)}
        onNodeCreated={(node) => {
          setIsCreateDialogOpen(false)
          toast.success(`Created "${node.name}"`, {
            label: 'View',
            onClick: () => handleNodeSelect(node),
          })
        }}
      />
    </div>
  )
}

export default App
