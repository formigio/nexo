import { TagInput } from '@/components/shared/TagInput'
import type { NodeType } from '@/lib/types'

interface TypeSpecificFieldsProps {
  type: NodeType
  props: Record<string, unknown>
  onPropsChange: (key: string, value: unknown) => void
  fieldErrors: { field: string; message: string }[]
  onBlur: (field: string) => void
  disabled: boolean
}

export function TypeSpecificFields({
  type,
  props,
  onPropsChange,
  fieldErrors,
  onBlur,
  disabled,
}: TypeSpecificFieldsProps) {
  const getError = (field: string) => fieldErrors.find((e) => e.field === field)?.message

  switch (type) {
    case 'Screen':
      return (
        <>
          <TextField label="Route" field="route" value={props.route} onChange={onPropsChange} onBlur={onBlur} error={getError('route')} disabled={disabled} placeholder="/path" />
          <SelectField label="Platform" field="platform" value={(props.platform as string[] | undefined)?.[0] ?? 'web'} onChange={(_, v) => onPropsChange('platform', [v])} onBlur={onBlur} error={getError('platform')} disabled={disabled} options={['web', 'ios', 'android']} />
          <SelectField label="Access Level" field="accessLevel" value={props.accessLevel ?? 'authenticated'} onChange={onPropsChange} onBlur={onBlur} error={getError('accessLevel')} disabled={disabled} options={['public', 'authenticated', 'role:organizer', 'role:admin']} />
          <TextField label="Parent Screen" field="parentScreen" value={props.parentScreen} onChange={onPropsChange} onBlur={onBlur} error={getError('parentScreen')} disabled={disabled} placeholder="scr_..." />
        </>
      )
    case 'Component':
      return (
        <>
          <SelectField label="Component Type" field="componentType" value={props.componentType} onChange={onPropsChange} onBlur={onBlur} error={getError('componentType')} disabled={disabled} options={['interactive', 'presentational', 'layout', 'navigation']} required />
          <SelectField label="Platform" field="platform" value={(props.platform as string[] | undefined)?.[0] ?? 'web'} onChange={(_, v) => onPropsChange('platform', [v])} onBlur={onBlur} error={getError('platform')} disabled={disabled} options={['web', 'ios', 'android']} />
          <FormField label="Variants" error={getError('variants')}>
            <TagInput tags={(props.variants as string[]) ?? []} onChange={(v) => onPropsChange('variants', v)} placeholder="Add variant..." disabled={disabled} />
          </FormField>
          <TextField label="Source File" field="sourceFile" value={props.sourceFile} onChange={onPropsChange} onBlur={onBlur} error={getError('sourceFile')} disabled={disabled} placeholder="path/to/file.tsx" />
        </>
      )
    case 'UserState':
      return (
        <>
          <SelectField label="State Type" field="stateType" value={props.stateType} onChange={onPropsChange} onBlur={onBlur} error={getError('stateType')} disabled={disabled} options={['auth', 'permission', 'contextual', 'composite']} required />
          <FormField label="Conditions" error={getError('conditions')}>
            <TagInput tags={(props.conditions as string[]) ?? []} onChange={(v) => onPropsChange('conditions', v)} placeholder="Add condition..." disabled={disabled} />
          </FormField>
          <ToggleField label="Terminal State" field="isTerminal" checked={!!props.isTerminal} onChange={onPropsChange} disabled={disabled} />
        </>
      )
    case 'UserAction':
      return (
        <>
          <SelectField label="Action Type" field="actionType" value={props.actionType} onChange={onPropsChange} onBlur={onBlur} error={getError('actionType')} disabled={disabled} options={['navigate', 'mutate', 'query', 'authenticate', 'configure']} required />
          <SelectField label="Input Type" field="inputType" value={props.inputType} onChange={onPropsChange} onBlur={onBlur} error={getError('inputType')} disabled={disabled} options={['tap', 'form', 'gesture', 'automatic']} />
          <ToggleField label="Requires Confirmation" field="requiresConfirmation" checked={!!props.requiresConfirmation} onChange={onPropsChange} disabled={disabled} />
        </>
      )
    case 'APIEndpoint':
      return (
        <>
          <SelectField label="Method" field="method" value={props.method} onChange={onPropsChange} onBlur={onBlur} error={getError('method')} disabled={disabled} options={['GET', 'POST', 'PUT', 'DELETE', 'PATCH']} required />
          <TextField label="Path" field="path" value={props.path} onChange={onPropsChange} onBlur={onBlur} error={getError('path')} disabled={disabled} placeholder="/api/..." required />
          <ToggleField label="Auth Required" field="authRequired" checked={props.authRequired !== false} onChange={onPropsChange} disabled={disabled} />
          <TextField label="Required Role" field="requiredRole" value={props.requiredRole} onChange={onPropsChange} onBlur={onBlur} error={getError('requiredRole')} disabled={disabled} />
        </>
      )
    case 'DataEntity':
      return (
        <>
          <SelectField label="Storage Type" field="storageType" value={props.storageType} onChange={onPropsChange} onBlur={onBlur} error={getError('storageType')} disabled={disabled} options={['dynamodb', 's3', 'cognito', 'stripe', 'cache', 'surrealdb']} required />
          <TextField label="Key Pattern" field="keyPattern" value={props.keyPattern} onChange={onPropsChange} onBlur={onBlur} error={getError('keyPattern')} disabled={disabled} placeholder="PK#..." />
          <FormField label="Indexes" error={getError('indexes')}>
            <TagInput tags={(props.indexes as string[]) ?? []} onChange={(v) => onPropsChange('indexes', v)} placeholder="Add index..." disabled={disabled} />
          </FormField>
          <ToggleField label="TTL" field="ttl" checked={!!props.ttl} onChange={onPropsChange} disabled={disabled} />
        </>
      )
    case 'DataField':
      return (
        <>
          <SelectField label="Field Type" field="fieldType" value={props.fieldType} onChange={onPropsChange} onBlur={onBlur} error={getError('fieldType')} disabled={disabled} options={['string', 'number', 'boolean', 'enum', 'datetime', 'object', 'array', 'reference']} required />
          <ToggleField label="Required" field="required" checked={!!props.required} onChange={onPropsChange} disabled={disabled} />
          <FormField label="Enum Values" error={getError('enumValues')}>
            <TagInput tags={(props.enumValues as string[]) ?? []} onChange={(v) => onPropsChange('enumValues', v)} placeholder="Add value..." disabled={disabled} />
          </FormField>
          <TextField label="Validation" field="validation" value={props.validation} onChange={onPropsChange} onBlur={onBlur} error={getError('validation')} disabled={disabled} placeholder="regex or rule" />
          <ToggleField label="PII" field="pii" checked={!!props.pii} onChange={onPropsChange} disabled={disabled} />
        </>
      )
    case 'BusinessRule':
      return (
        <>
          <SelectField label="Rule Type" field="ruleType" value={props.ruleType} onChange={onPropsChange} onBlur={onBlur} error={getError('ruleType')} disabled={disabled} options={['validation', 'authorization', 'workflow', 'computation', 'constraint', 'behavior']} required />
          <SelectField label="Priority" field="priority" value={props.priority ?? 'important'} onChange={onPropsChange} onBlur={onBlur} error={getError('priority')} disabled={disabled} options={['critical', 'important', 'nice-to-have']} />
          <SelectField label="Enforcement" field="enforcement" value={props.enforcement ?? 'server'} onChange={onPropsChange} onBlur={onBlur} error={getError('enforcement')} disabled={disabled} options={['server', 'client', 'both']} />
          <FormField label="Pseudocode" error={getError('pseudocode')}>
            <textarea
              value={(props.pseudocode as string) ?? ''}
              onChange={(e) => onPropsChange('pseudocode', e.target.value)}
              onBlur={() => onBlur('pseudocode')}
              disabled={disabled}
              rows={3}
              className="w-full px-3 py-2 bg-surface-2 border border-border-default rounded text-[12px] text-text-primary placeholder:text-text-dim focus:outline-none focus:border-node-screen transition-colors resize-y"
              placeholder="IF condition THEN action..."
            />
          </FormField>
        </>
      )
    case 'Feature':
      return (
        <>
          <TextField label="Feature ID" field="featureId" value={props.featureId} onChange={onPropsChange} onBlur={onBlur} error={getError('featureId')} disabled={disabled} placeholder="P0-1" required />
          <SelectField label="Status" field="status" value={props.status ?? 'proposed'} onChange={onPropsChange} onBlur={onBlur} error={getError('status')} disabled={disabled} options={['proposed', 'in-progress', 'deployed', 'deprecated']} />
          <SelectField label="Priority" field="priority" value={props.priority ?? 'P2'} onChange={onPropsChange} onBlur={onBlur} error={getError('priority')} disabled={disabled} options={['P0', 'P1', 'P2', 'P3']} />
          <TextField label="Spec URL" field="specUrl" value={props.specUrl} onChange={onPropsChange} onBlur={onBlur} error={getError('specUrl')} disabled={disabled} placeholder="https://..." />
        </>
      )
    case 'InfraResource':
      return (
        <>
          <SelectField label="Provider" field="provider" value={props.provider} onChange={onPropsChange} onBlur={onBlur} error={getError('provider')} disabled={disabled} options={['aws', 'stripe', 'sendgrid', 'google', 'surrealdb']} required />
          <TextField label="Service" field="service" value={props.service} onChange={onPropsChange} onBlur={onBlur} error={getError('service')} disabled={disabled} placeholder="e.g. Lambda, S3" required />
          <TextField label="Resource ID" field="resourceId" value={props.resourceId} onChange={onPropsChange} onBlur={onBlur} error={getError('resourceId')} disabled={disabled} />
          <SelectField label="Environment" field="environment" value={props.environment ?? 'both'} onChange={onPropsChange} onBlur={onBlur} error={getError('environment')} disabled={disabled} options={['dev', 'prod', 'both']} />
        </>
      )
    case 'SourceFile':
      return (
        <>
          <TextField label="Repo" field="repo" value={props.repo} onChange={onPropsChange} onBlur={onBlur} error={getError('repo')} disabled={disabled} placeholder="org/repo" required />
          <TextField label="Relative Path" field="relativePath" value={props.relativePath} onChange={onPropsChange} onBlur={onBlur} error={getError('relativePath')} disabled={disabled} placeholder="src/..." required />
          <SelectField label="Language" field="language" value={props.language ?? 'js'} onChange={onPropsChange} onBlur={onBlur} error={getError('language')} disabled={disabled} options={['jsx', 'tsx', 'js', 'ts', 'yaml', 'json', 'css', 'surql', 'other']} />
          <SelectField label="Layer" field="layer" value={props.layer ?? 'other'} onChange={onPropsChange} onBlur={onBlur} error={getError('layer')} disabled={disabled} options={['page', 'component', 'hook', 'context', 'api-handler', 'auth-handler', 'webhook', 'scheduled', 'config', 'utility', 'style', 'test', 'other']} />
        </>
      )
    default:
      return null
  }
}

// ── Internal helpers ──────────────────────────────────────────

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}

function FormField({ label, required, error, children }: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-medium text-text-secondary">
        {label}
        {required && <span className="text-node-rule ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-node-rule">{error}</p>}
    </div>
  )
}

interface TextFieldProps {
  label: string
  field: string
  value: unknown
  onChange: (key: string, value: unknown) => void
  onBlur: (field: string) => void
  error?: string
  disabled: boolean
  placeholder?: string
  required?: boolean
}

function TextField({ label, field, value, onChange, onBlur, error, disabled, placeholder, required }: TextFieldProps) {
  return (
    <FormField label={label} required={required} error={error}>
      <input
        type="text"
        value={(value as string) ?? ''}
        onChange={(e) => onChange(field, e.target.value)}
        onBlur={() => onBlur(field)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full px-3 py-1.5 bg-surface-2 border border-border-default rounded text-[12px] text-text-primary placeholder:text-text-dim focus:outline-none focus:border-node-screen transition-colors"
      />
    </FormField>
  )
}

interface SelectFieldProps {
  label: string
  field: string
  value: unknown
  onChange: (key: string, value: unknown) => void
  onBlur: (field: string) => void
  error?: string
  disabled: boolean
  options: string[]
  required?: boolean
}

function SelectField({ label, field, value, onChange, onBlur, error, disabled, options, required }: SelectFieldProps) {
  return (
    <FormField label={label} required={required} error={error}>
      <select
        value={(value as string) ?? ''}
        onChange={(e) => onChange(field, e.target.value)}
        onBlur={() => onBlur(field)}
        disabled={disabled}
        className="w-full px-3 py-1.5 bg-surface-2 border border-border-default rounded text-[12px] text-text-primary focus:outline-none focus:border-node-screen transition-colors"
      >
        {!required && <option value="">—</option>}
        {required && !(value as string) && <option value="">Select...</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </FormField>
  )
}

interface ToggleFieldProps {
  label: string
  field: string
  checked: boolean
  onChange: (key: string, value: unknown) => void
  disabled: boolean
}

function ToggleField({ label, field, checked, onChange, disabled }: ToggleFieldProps) {
  return (
    <label className="flex items-center gap-2 py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(field, e.target.checked)}
        disabled={disabled}
        className="accent-node-screen"
      />
      <span className="text-[12px] text-text-secondary">{label}</span>
    </label>
  )
}
