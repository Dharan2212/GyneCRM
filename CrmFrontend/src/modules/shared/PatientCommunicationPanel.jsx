import { Bdg } from "../../crm/atoms.jsx"
import { C } from "../../crm/data.js"
import { AsyncContent } from "./ui/state/index.js"
import { SectionCard } from "./ui/layout/index.js"
import { usePatientSendHistory } from "./sendHistory.hooks.js"

function getTone(status) {
  if (status === 'sent' || status === 'delivered') return 'done'
  if (status === 'failed' || status === 'cancelled' || status === 'suppressed') return 'high'
  return 'wait'
}

export default function PatientCommunicationPanel({
  patientId,
  sourceType,
  title = 'Communication History',
  emptyTitle = 'No communication history yet',
  emptyMessage = 'Patient communication events will appear here when send actions are recorded.',
  limit = 6,
  compact = true,
}) {
  const historyState = usePatientSendHistory(patientId, { limit, sourceType }, { enabled: Boolean(patientId) })

  return (
    <SectionCard title={title}>
      <AsyncContent
        isLoading={historyState.isLoading}
        error={historyState.error}
        onRetry={historyState.reload}
        isEmpty={!historyState.data?.items?.length}
        emptyTitle={emptyTitle}
        emptyMessage={emptyMessage}
        compact={compact}
      >
        {(historyState.data?.items || []).map((entry, index) => (
          <div key={entry.id} style={{ padding: '8px 0', borderBottom: index < historyState.data.items.length - 1 ? `1px solid ${C.bd}` : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{entry.sourceTypeLabel} • {entry.channelLabel}</div>
                <div style={{ fontSize: 11, color: C.kS }}>{entry.requestedAtLabel || '--'}</div>
              </div>
              <Bdg type={getTone(entry.status)} sm>{entry.statusLabel}</Bdg>
            </div>
            {entry.sourceNumber ? <div style={{ marginTop: 4, fontSize: 11, color: C.kS }}>Ref: {entry.sourceNumber}</div> : null}
            {entry.messageSummary ? <div style={{ marginTop: 4, fontSize: 11, color: C.kB }}>{entry.messageSummary}</div> : null}
          </div>
        ))}
      </AsyncContent>
    </SectionCard>
  )
}
