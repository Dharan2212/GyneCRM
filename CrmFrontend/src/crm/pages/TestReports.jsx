import { useEffect, useMemo, useState } from 'react'
import { C } from '../data.js'
import { S } from '../styles.js'
import { Av, Bdg, PH } from '../atoms.jsx'
import { AsyncContent, EmptyState, ErrorState } from '../../modules/shared/ui/state/index.js'
import { DataTable, TableActions, TableActionButton, TableCell, TableRow, TableStack, TableToolbar } from '../../modules/shared/ui/table/index.js'
import { FormActions, LoadingButton } from '../../modules/shared/ui/form/index.js'
import { PageToolbar, SectionCard } from '../../modules/shared/ui/layout/index.js'
import { FeedbackBar, useFeedbackState } from '../../modules/shared/ui/feedback/index.js'
import PatientCommunicationPanel from '../../modules/shared/PatientCommunicationPanel.jsx'

const STATUS_FILTERS = [
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'sent', label: 'Sent' },
  { value: 'all', label: 'All' },
]

const CHANNELS = ['whatsapp', 'email', 'sms', 'print']

function getStatusTone(status) {
  if (status === 'sent') return 'done'
  if (status === 'reviewed') return 'reviewed'
  if (status === 'pending_review') return 'uploaded'
  if (status === 'pending_upload') return 'ordered'
  if (status === 'failed' || status === 'cancelled') return 'high'
  return 'wait'
}

export default function TestReports({
  patient,
  rows,
  listMeta,
  pendingReviewCount,
  selectedId,
  selectedOrder,
  linkedDocuments,
  statusFilter,
  onStatusFilterChange,
  onSelectOrder,
  onOpenPatientHub,
  onRetryList,
  onRetryDetail,
  onRetryDocuments,
  onRetryAll,
  onLinkResult,
  onReviewResult,
  onSendResult,
  onRequestDocumentAccess,
  documentAccessFoundation,
  isRequestingDocumentAccess,
  documentAccessError,
  isListLoading,
  listError,
  isDetailLoading,
  detailError,
  isDocumentsLoading,
  documentsError,
  goTo,
}) {
  const [selectedDocumentId, setSelectedDocumentId] = useState('')
  const [reviewForm, setReviewForm] = useState({
    abnormal_flag: false,
    findings_summary: '',
    remarks: '',
    action_required: false,
    result_summary: '',
  })
  const [sendChannels, setSendChannels] = useState(['whatsapp'])
  const [sendNotes, setSendNotes] = useState('')
  const [actionMode, setActionMode] = useState(null)
  const [actionError, setActionError] = useState(null)
  const { feedback, showSuccess, clearFeedback } = useFeedbackState()

  useEffect(() => {
    setSelectedDocumentId('')
    setReviewForm({
      abnormal_flag: Boolean(selectedOrder?.linkedDocumentSummary?.abnormalFlag),
      findings_summary: selectedOrder?.linkedDocumentSummary?.findingsSummary || '',
      remarks: selectedOrder?.linkedDocumentSummary?.remarks || '',
      action_required: Boolean(selectedOrder?.linkedDocumentSummary?.actionRequired),
      result_summary: selectedOrder?.resultSummary || '',
    })
    setSendChannels(selectedOrder?.sendChannels?.length ? selectedOrder.sendChannels : ['whatsapp'])
    setSendNotes('')
    setActionError(null)
    clearFeedback()
    setActionMode(null)
  }, [selectedOrder?.id])

  const headers = [
    { key: 'test', label: 'Test' },
    { key: 'patient', label: 'Patient' },
    { key: 'priority', label: 'Priority' },
    { key: 'status', label: 'Status' },
    { key: 'ordered', label: 'Ordered' },
    { key: 'actions', label: 'Actions' },
  ]

  const selectedPatientLabel = patient?.summary?.name
    ? `${patient.summary.name} • ${patient.summary.patientCode}`
    : rows[0]?.patientName
      ? `${rows[0].patientName} • ${rows[0].patientCode}`
      : 'Doctor-side result review'

  const canLink = Boolean(selectedDocumentId) && ['ordered', 'pending_upload'].includes(selectedOrder?.status)
  const canReview = Boolean(selectedOrder?.linkedDocumentId) && selectedOrder?.status === 'pending_review'
  const canSend = selectedOrder?.status === 'reviewed'

  const linkedDocumentOptions = useMemo(() => (linkedDocuments || []).map((document) => ({
    value: document.id,
    label: `${document.title} • ${document.uploadStatusLabel}`,
  })), [linkedDocuments])

  const runAction = async (mode, handler) => {
    setActionMode(mode)
    setActionError(null)
    clearFeedback()
    try {
      await handler()
      const labels = {
        link: 'Result linked to test order. Doctor review can now continue when the document is ready.',
        review: 'Result marked reviewed. It is now ready for patient send.',
        send: 'Result send state updated for the patient communication log.',
      }
      showSuccess(labels[mode] || 'Review action completed.', 'Test order updated')
    } catch (error) {
      setActionError(error)
    } finally {
      setActionMode(null)
    }
  }

  const toggleChannel = (channel) => {
    setSendChannels((current) => current.includes(channel)
      ? current.filter((item) => item !== channel)
      : [...current, channel])
  }

  return (
    <div>
      <PH
        title="Test Reports"
        icon="test"
        sub={`${selectedPatientLabel} • ${listMeta?.total || rows.length || 0} order${(listMeta?.total || rows.length || 0) === 1 ? '' : 's'} • ${pendingReviewCount} pending review`}
        actions={(
          <>
            <button style={S.btn('ghost', true)} onClick={onRetryAll}>Refresh</button>
            <button style={S.btn('outline', true)} onClick={() => onOpenPatientHub?.(patient?.summary?.id || selectedOrder?.patientId)}>Open Patient Context</button>
            <button style={S.btn('ghost', true)} onClick={() => goTo('patient-hub')}>Patient Hub</button>
          </>
        )}
      />

      <div style={{ background: C.pP, border: `1.5px solid ${C.pL}`, borderRadius: 8, padding: '9px 13px', marginBottom: 14, fontSize: 12, color: C.p }}>
        Doctor responsibility in the current runtime: link the uploaded document, review the result, and send it to the patient. Reception upload remains a separate receptionist workflow.
      </div>

      <PageToolbar
        left={(
          <TableToolbar
            filters={STATUS_FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onStatusFilterChange(item.value)}
                style={{
                  ...S.btn(statusFilter === item.value ? 'primary' : 'ghost', true),
                  background: statusFilter === item.value ? C.t : C.bg,
                  color: statusFilter === item.value ? '#fff' : C.kB,
                }}
              >
                {item.label}
              </button>
            ))}
            actions={rows.length ? <span style={{ fontSize: 12, color: C.kS }}>{rows.length} on this page</span> : null}
          />
        )}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, alignItems: 'start' }}>
        <DataTable
          headers={headers}
          isLoading={isListLoading}
          error={listError}
          onRetry={onRetryList}
          empty={rows.length === 0}
          emptyTitle="No test orders found"
          emptyMessage="Doctor-side review items will appear here once test orders are available for the current filter."
        >
          <tbody>
            {rows.map((order) => (
              <TableRow key={order.id} active={selectedId === order.id}>
                <TableCell>
                  <button type="button" onClick={() => onSelectOrder(order.id)} style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                    <TableStack title={order.testName} subtitle={order.testCode} titleWeight={700} />
                  </button>
                </TableCell>
                <TableCell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Av i={(order.patientName || 'PT').slice(0, 2).toUpperCase()} idx={0} sz={24} />
                    <TableStack title={order.patientName} subtitle={order.patientCode} compact />
                  </div>
                </TableCell>
                <TableCell><Bdg type={order.priorityBadgeType} sm>{order.priorityLabel}</Bdg></TableCell>
                <TableCell><Bdg type={getStatusTone(order.status)} sm>{order.statusLabel}</Bdg></TableCell>
                <TableCell subtle>{order.orderedAtLabel || order.dueDateLabel || '--'}</TableCell>
                <TableCell>
                  <TableActions>
                    <TableActionButton label="Open" variant="outline" onClick={() => onSelectOrder(order.id)} />
                  </TableActions>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </DataTable>

        <AsyncContent
          isLoading={isDetailLoading}
          error={detailError}
          isEmpty={!selectedOrder}
          emptyTitle="Select a test order"
          emptyMessage="Choose a test order to review the linked result document and doctor send actions."
          onRetry={onRetryDetail}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionCard
              title="Test Order Summary"
              right={<Bdg type={getStatusTone(selectedOrder?.status)} sm>{selectedOrder?.statusLabel}</Bdg>}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Av i={(selectedOrder?.patientName || 'PT').slice(0, 2).toUpperCase()} idx={1} sz={34} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedOrder?.patientName}</div>
                  <div style={{ fontSize: 12, color: C.kS }}>{selectedOrder?.patientCode} • {selectedOrder?.testName}</div>
                </div>
                <button type="button" style={S.btn('ghost', true)} onClick={() => onOpenPatientHub?.(selectedOrder?.patientId)}>Patient</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
                <div><strong>Test code:</strong> {selectedOrder?.testCode}</div>
                <div><strong>Priority:</strong> {selectedOrder?.priorityLabel}</div>
                <div><strong>Ordered:</strong> {selectedOrder?.orderedAtLabel || '--'}</div>
                <div><strong>Due:</strong> {selectedOrder?.dueDateLabel || '--'}</div>
                <div style={{ gridColumn: '1 / -1' }}><strong>Summary:</strong> {selectedOrder?.resultSummary || '--'}</div>
              </div>
            </SectionCard>

            <SectionCard title="Linked Result Document" right={selectedOrder?.linkedDocumentSummary ? <Bdg type={getStatusTone(selectedOrder.linkedDocumentSummary.reviewStatus)} sm>{selectedOrder.linkedDocumentSummary.reviewStatusLabel}</Bdg> : null}>
              <AsyncContent
                isLoading={isDocumentsLoading}
                error={documentsError}
                onRetry={onRetryDocuments}
                isEmpty={false}
                compact
              >
                {selectedOrder?.linkedDocumentSummary ? (
                  <div style={{ display: 'grid', gap: 8, fontSize: 12 }}>
                    <div><strong>Title:</strong> {selectedOrder.linkedDocumentSummary.title}</div>
                    <div><strong>Type:</strong> {selectedOrder.linkedDocumentSummary.documentTypeLabel}</div>
                    <div><strong>Upload:</strong> {selectedOrder.linkedDocumentSummary.uploadStatusLabel}</div>
                    <div><strong>Review:</strong> {selectedOrder.linkedDocumentSummary.reviewStatusLabel}</div>
                    {selectedOrder.linkedDocumentSummary.findingsSummary ? <div><strong>Findings:</strong> {selectedOrder.linkedDocumentSummary.findingsSummary}</div> : null}
                    {selectedOrder.linkedDocumentSummary.remarks ? <div><strong>Remarks:</strong> {selectedOrder.linkedDocumentSummary.remarks}</div> : null}
                    <FormActions align="flex-start">
                      <LoadingButton
                        label="Access foundation"
                        loadingLabel="Loading foundation…"
                        loading={isRequestingDocumentAccess}
                        onClick={() => onRequestDocumentAccess?.(selectedOrder.linkedDocumentSummary.id)}
                        variant="ghost"
                        small
                      />
                    </FormActions>
                    {documentAccessError ? <ErrorState compact title="Document access foundation failed" message={documentAccessError.message || 'Document access foundation could not be loaded.'} onRetry={() => onRequestDocumentAccess?.(selectedOrder.linkedDocumentSummary.id)} /> : null}
                    {documentAccessFoundation ? (
                      <div style={{ background: C.bg, borderRadius: 8, padding: '10px 11px', fontSize: 12, color: C.kS }}>
                        <div style={{ fontWeight: 700, color: C.k, marginBottom: 4 }}>Read-access foundation</div>
                        <div>Mode: {documentAccessFoundation.mode}</div>
                        <div>Storage Provider: {documentAccessFoundation.storageProvider}</div>
                        <div>Storage Bucket: {documentAccessFoundation.storageBucket || '--'}</div>
                        <div>Storage Key: {documentAccessFoundation.storageKey || '--'}</div>
                        <div style={{ marginTop: 6 }}>{documentAccessFoundation.notes || 'Current runtime returns access foundation only.'}</div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <EmptyState title="No linked result yet" message="Link an uploaded patient document to this test order before doctor review is recorded." compact />
                )}

                <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.bd}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', marginBottom: 6 }}>Link uploaded document</div>
                  <select value={selectedDocumentId} onChange={(event) => setSelectedDocumentId(event.target.value)} style={{ ...S.inp, width: '100%', marginBottom: 8 }}>
                    <option value="">Choose pending document…</option>
                    {linkedDocumentOptions.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                  <LoadingButton label="Link Result" loadingLabel="Linking…" loading={actionMode === 'link'} onClick={() => runAction('link', () => onLinkResult(selectedDocumentId))} disabled={!canLink} />
                  {!canLink && selectedOrder?.status ? <div style={{ marginTop: 8, fontSize: 11, color: C.kS }}>Linking is available while the test order is ordered or pending upload.</div> : null}
                </div>
              </AsyncContent>
            </SectionCard>

            <SectionCard title="Doctor Review">
              <div style={{ display: 'grid', gap: 10 }}>
                {feedback ? <FeedbackBar tone={feedback.tone} title={feedback.title} message={feedback.message} compact onDismiss={clearFeedback} /> : null}
                {actionError ? <FeedbackBar tone="error" title="Review action failed" message={actionError.message || 'Review action failed.'} compact onDismiss={() => setActionError(null)} /> : null}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <input type="checkbox" checked={reviewForm.abnormal_flag} onChange={(event) => setReviewForm((current) => ({ ...current, abnormal_flag: event.target.checked }))} />
                  Abnormal flag
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <input type="checkbox" checked={reviewForm.action_required} onChange={(event) => setReviewForm((current) => ({ ...current, action_required: event.target.checked }))} />
                  Action required
                </label>
                <textarea value={reviewForm.result_summary} onChange={(event) => setReviewForm((current) => ({ ...current, result_summary: event.target.value }))} style={{ ...S.inp, minHeight: 70, resize: 'vertical' }} placeholder="Result summary" />
                <textarea value={reviewForm.findings_summary} onChange={(event) => setReviewForm((current) => ({ ...current, findings_summary: event.target.value }))} style={{ ...S.inp, minHeight: 70, resize: 'vertical' }} placeholder="Findings summary" />
                <textarea value={reviewForm.remarks} onChange={(event) => setReviewForm((current) => ({ ...current, remarks: event.target.value }))} style={{ ...S.inp, minHeight: 70, resize: 'vertical' }} placeholder="Remarks for the patient chart" />
                <FormActions>
                  <LoadingButton label="Mark Reviewed" loadingLabel="Saving Review…" variant="ok" loading={actionMode === 'review'} onClick={() => runAction('review', () => onReviewResult(reviewForm))} disabled={!canReview} />
                </FormActions>
                {!canReview && selectedOrder?.status ? <div style={{ fontSize: 11, color: C.kS }}>Review is available only while the test order is pending review.</div> : null}
              </div>
            </SectionCard>

            <SectionCard title="Send Result">
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {CHANNELS.map((channel) => (
                    <label key={channel} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, background: C.bg, borderRadius: 20, padding: '6px 10px' }}>
                      <input type="checkbox" checked={sendChannels.includes(channel)} onChange={() => toggleChannel(channel)} />
                      {channel}
                    </label>
                  ))}
                </div>
                <textarea value={sendNotes} onChange={(event) => setSendNotes(event.target.value)} style={{ ...S.inp, minHeight: 72, resize: 'vertical' }} placeholder="Send notes for the communication log" />
                <FormActions>
                  <LoadingButton label="Send Result" loadingLabel="Sending…" variant="teal" loading={actionMode === 'send'} onClick={() => runAction('send', () => onSendResult({ send_channels: sendChannels, send_notes: sendNotes }))} disabled={!canSend || sendChannels.length === 0} />
                </FormActions>
                {!canSend && selectedOrder?.status ? <div style={{ fontSize: 11, color: C.kS }}>Send is available only after the test result has been reviewed.</div> : null}
              </div>
            </SectionCard>

            <PatientCommunicationPanel
              patientId={selectedOrder?.patientId || patient?.summary?.id || null}
              sourceType="test_order"
              title="Patient Communication History"
              emptyMessage="Test-result send history will appear here for the selected patient."
              limit={5}
            />
          </div>
        </AsyncContent>
      </div>
    </div>
  )
}
