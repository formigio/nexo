import { useParams } from 'react-router-dom'
import { useScreenDetail } from '@/hooks/useScreenDetail'
import { usePanelStack } from '@/hooks/usePanelStack'
import { TypeBadge } from '@/components/shared/TypeBadge'
import { LoadingState } from '@/components/shared/LoadingState'
import { ErrorState } from '@/components/shared/ErrorState'
import { ComponentsSection } from './ComponentsSection'
import { UserActionsSection } from './UserActionsSection'
import { BusinessRulesSection } from './BusinessRulesSection'
import { RequiredStatesSection } from './RequiredStatesSection'
import { DataAccessedSection } from './DataAccessedSection'
import { SourceFileSection } from './SourceFileSection'
import { FeatureSection } from './FeatureSection'
import type { ScreenProps, FeatureProps } from '@/lib/types'

export function ScreenDetailView() {
  const { screenId } = useParams<{ screenId: string }>()
  const { data, isLoading, error } = useScreenDetail(screenId)
  const { push } = usePanelStack()

  if (isLoading) return <LoadingState message="Loading screen details..." />
  if (error) return <ErrorState message={(error as Error).message} />
  if (!data) return null

  const { screen, components, userActions, businessRules, userStates, feature, sourceFile } = data
  const props = screen.props as ScreenProps
  const featureProps = feature?.props as FeatureProps | undefined

  return (
    <div data-testid="screen-detail-root" className="p-6 max-w-4xl">
      {/* Header */}
      <div data-testid="screen-detail-header" className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 data-testid="screen-detail-name-text" className="text-[16px] font-semibold text-text-primary">
            {screen.name}
          </h1>
          <TypeBadge type="Screen" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {props.route && (
            <span
              data-testid="screen-detail-route-badge"
              className="text-[12px] font-mono px-2 py-0.5 rounded bg-surface-2 text-text-secondary"
            >
              {props.route}
            </span>
          )}
          {props.accessLevel && (
            <span
              data-testid="screen-detail-access-badge"
              className="text-[11px] px-2 py-0.5 rounded bg-surface-2 text-text-dim capitalize"
            >
              {props.accessLevel}
            </span>
          )}
          {featureProps?.priority && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-node-feature/15 text-node-feature">
              {featureProps.priority}
            </span>
          )}
        </div>

        {screen.description && (
          <p className="mt-3 text-[12px] text-text-secondary leading-relaxed">
            {screen.description}
          </p>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-1">
        {components.length > 0 && (
          <ComponentsSection components={components} edges={data.edges} onDrillIn={push} />
        )}

        {userActions.length > 0 && (
          <UserActionsSection actions={userActions} edges={data.edges} onDrillIn={push} />
        )}

        {businessRules.length > 0 && (
          <BusinessRulesSection rules={businessRules} onDrillIn={push} />
        )}

        {components.length > 0 && (
          <DataAccessedSection
            componentIds={components.map((c) => c.id)}
            onDrillIn={push}
          />
        )}

        {userStates.length > 0 && (
          <RequiredStatesSection states={userStates} onDrillIn={push} />
        )}

        {sourceFile && <SourceFileSection sourceFile={sourceFile} />}

        {feature && <FeatureSection feature={feature} onDrillIn={push} />}
      </div>
    </div>
  )
}
