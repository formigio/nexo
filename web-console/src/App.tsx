import { useState } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Toolbar } from '@/components/layout/Toolbar'
import { Sidebar } from '@/components/layout/Sidebar'
import { MainArea } from '@/components/layout/MainArea'
import { SlideInPanel } from '@/components/layout/SlideInPanel'
import { Navigator } from '@/components/sidebar/Navigator'
import { ScreenDetailView } from '@/components/screen-detail/ScreenDetailView'
import { WelcomeView } from '@/components/WelcomeView'
import { PanelRouter } from '@/components/drill-in/PanelRouter'
import { QueryStudioView } from '@/components/query-studio/QueryStudioView'
import { FeatureListView } from '@/components/feature-lens/FeatureListView'
import { FeatureDetailView } from '@/components/feature-lens/FeatureDetailView'
import { GraphRoute } from '@/components/graph/GraphRoute'
import { usePanelStack } from '@/hooks/usePanelStack'
import type { Node, NodeType } from '@/lib/types'

function App() {
  const [appName, setAppName] = useState('todo')
  const [globalSearchQuery, setGlobalSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<NodeType>('Screen')
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const panelStack = usePanelStack()
  const hideSidebar = location.pathname === '/query'

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
          <Routes>
            <Route path="/" element={<WelcomeView />} />
            <Route path="/screens/:screenId" element={<ScreenDetailView />} />
            <Route path="/query" element={<QueryStudioView app={appName} />} />
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
        </MainArea>
        <SlideInPanel>
          {(current, push) => (
            <PanelRouter entry={current} onDrillIn={push} />
          )}
        </SlideInPanel>
      </div>
    </div>
  )
}

export default App
