import { useEffect, useMemo, useRef, useState } from 'react'
import { C } from '../data.js'
import { S } from '../styles.js'
import { Bdg, PH } from '../atoms.jsx'
import { AsyncContent, EmptyState, ErrorState } from '../../modules/shared/ui/state/index.js'
import { DataTable, TableActions, TableActionButton, TableCell, TableRow, TableStack, TableToolbar } from '../../modules/shared/ui/table/index.js'
import { FormActions, FormCard, FormField, FormGrid, LoadingButton, SelectField, TextAreaField } from '../../modules/shared/ui/form/index.js'
import { PageToolbar, SectionCard } from '../../modules/shared/ui/layout/index.js'
import { FeedbackBar, useFeedbackState } from '../../modules/shared/ui/feedback/index.js'
import { mapReceptionDocumentCreatePayload, mapUploadUrlPayload } from '../../modules/documents/documents.adapters.js'

const CATEGORY_OPTIONS = [
  { v: 'lab', l: 'Lab' },
  { v: 'radiology', l: 'Radiology' },
  { v: 'consultation', l: 'Consultation' },
  { v: 'other', l: 'Other' },
]

const UPLOAD_STATUS_OPTIONS = [
  { v: 'pending', l: 'Pending' },
  { v: 'uploaded', l: 'Uploaded' },
  { v: 'failed', l: 'Failed' },
]

function getStatusTone(status) {
  if (status === 'uploaded' || status === 'reviewed') return 'reviewed'
  if (status === 'pending_review') return 'uploaded'
  if (status === 'sent') return 'done'
  if (status === 'failed' || status === 'cancelled') return 'high'
  return 'wait'
}

function guessCategory(order) {
  const raw = String(order?.testCatalogSummary?.category || '').toLowerCase()
  if (raw.includes('radio') || raw.includes('scan') || raw.includes('ultra') || raw.includes('imag')) return 'radiology'
  return 'lab'
}

export default function RxUpload({
  pendingOrders,
  listMeta,
  selectedOrderId,
  selectedOrder,
  onSelectOrder,
  onRetryList,
  onRetryDetail,
  onRequestFoundation,
  foundation,
  isRequestingFoundation,
  foundationError,
  onCreateDocument,
  createdDocument,
  isCreatingDocument,
  createError,
  onResetUploadState,
  onRequestDocumentAccess,
  documentAccessFoundation,
  isRequestingDocumentAccess,
  documentAccessError,
  isListLoading,
  listError,
  isDetailLoading,
  detailError,
  goTo,
}) {
  const fileInputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'lab',
    upload_status: 'pending',
    clinical_summary: '',
  })
  const [localError, setLocalError] = useState('')
  const { feedback, showSuccess, clearFeedback } = useFeedbackState()

  useEffect(() => {
    if (!selectedOrder) return
    setFile(null)
    setLocalError('')
    clearFeedback()
    setForm({
      title: `${selectedOrder.testName || 'Test'} Result • ${selectedOrder.patientName || 'Patient'}`,
      description: '',
      category: guessCategory(selectedOrder),
      upload_status: selectedOrder.linkedDocumentSummary?.uploadStatus || 'pending',
      clinical_summary: '',
    })
    onResetUploadState?.()
  }, [selectedOrder?.id])

  const headers = useMemo(() => ([
    { key: 'test', label: 'Test Order' },
    { key: 'patient', label: 'Patient' },
    { key: 'status', label: 'Upload Status' },
    { key: 'ordered', label: 'Ordered' },
    { key: 'actions', label: 'Actions' },
  ]), [])

  const linkedDocumentId = createdDocument?.id || selectedOrder?.linkedDocumentSummary?.id || null
  const hasExistingLinkedDocument = Boolean(selectedOrder?.linkedDocumentSummary?.id)

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null
    setFile(nextFile)
    setLocalError('')
    onResetUploadState?.()
  }

  const handlePrepareUpload = async () => {
    if (!selectedOrder) {
      setLocalError('Select a pending upload order first.')
      return
    }
    if (!file) {
      setLocalError('Choose a local file so the upload foundation can capture file metadata.')
      return
    }
    setLocalError('')
    clearFeedback()
    try {
      await onRequestFoundation(mapUploadUrlPayload({ file, testOrderId: selectedOrder.id }))
      showSuccess(`Upload foundation prepared for ${selectedOrder.testName}.`, 'Foundation ready')
    } catch {
      // surfaced by foundationError
    }
  }

  const handleCreateMetadata = async () => {
    if (!selectedOrder) {
      setLocalError('Select a pending upload order first.')
      return
    }
    if (!foundation) {
      setLocalError('Request the upload foundation before recording document metadata.')
      return
    }
    setLocalError('')
    clearFeedback()
    try {
      const created = await onCreateDocument(mapReceptionDocumentCreatePayload({
        order: selectedOrder,
        foundation,
        values: form,
        file,
      }))
      showSuccess(`Document metadata recorded with status ${created?.uploadStatusLabel || form.upload_status}.`, 'Metadata saved')
    } catch {
      // surfaced by createError
    }
  }

  return (
    <div>
      <PH
        title="Upload Test Report"
        icon="upload"
        sub={`Reception upload workflow • ${listMeta?.total || pendingOrders.length || 0} pending upload item${(listMeta?.total || pendingOrders.length || 0) === 1 ? '' : 's'}`}
        actions={(
          <>
            <button style={S.btn('ghost', true)} onClick={onRetryList}>Refresh</button>
            <button style={S.btn('outline', true)} onClick={() => goTo('appointments')}>Appointments</button>
            <button style={S.btn('ghost', true)} onClick={() => goTo('desk')}>Reception Desk</button>
          </>
        )}
      />

      <div style={{ background: C.pP, border: `1.5px solid ${C.pL}`, borderRadius: 8, padding: '9px 13px', marginBottom: 14, fontSize: 12, color: C.p }}>
        Receptionist responsibility in the current backend: request the upload foundation, record document metadata, and keep the upload state honest. Doctor review, abnormal flagging, and patient send happen later in the doctor workflow.
      </div>

      {feedback ? <div style={{ marginBottom: 12 }}><FeedbackBar tone={feedback.tone} title={feedback.title} message={feedback.message} onDismiss={clearFeedback} compact /></div> : null}

      <PageToolbar
        left={(
          <TableToolbar
            actions={<span style={{ fontSize: 12, color: C.kS }}>{pendingOrders.length} shown on this page</span>}
          />
        )}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 16, alignItems: 'start' }}>
        <DataTable
          headers={headers}
          isLoading={isListLoading}
          error={listError}
          onRetry={onRetryList}
          empty={!pendingOrders.length}
          emptyTitle="No pending uploads"
          emptyMessage="Ordered and pending-upload test orders will appear here when reception uploads are expected."
        >
          <tbody>
            {pendingOrders.map((order) => {
              const linked = order.linkedDocumentSummary
              return (
                <TableRow key={order.id} active={selectedOrderId === order.id}>
                  <TableCell>
                    <button type="button" onClick={() => onSelectOrder(order.id)} style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                      <TableStack title={order.testName} subtitle={order.testCode} titleWeight={700} />
                    </button>
                  </TableCell>
                  <TableCell><TableStack title={order.patientName} subtitle={order.patientCode} compact /></TableCell>
                  <TableCell>
                    <div style={{ display: 'grid', gap: 5 }}>
                      <Bdg type={getStatusTone(order.status)} sm>{order.statusLabel}</Bdg>
                      {linked ? <Bdg type={getStatusTone(linked.uploadStatus)} sm>{linked.uploadStatusLabel}</Bdg> : null}
                    </div>
                  </TableCell>
                  <TableCell subtle>{order.orderedAtLabel || order.dueDateLabel || '--'}</TableCell>
                  <TableCell>
                    <TableActions>
                      <TableActionButton label="Open" variant="outline" onClick={() => onSelectOrder(order.id)} />
                    </TableActions>
                  </TableCell>
                </TableRow>
              )
            })}
          </tbody>
        </DataTable>

        <div style={{ display: 'grid', gap: 16 }}>
          <SectionCard title="Upload Foundation + Metadata">
            <AsyncContent
              isLoading={Boolean(selectedOrderId) && isDetailLoading}
              error={detailError}
              onRetry={onRetryDetail}
              isEmpty={!selectedOrder}
              emptyTitle="Select a test order"
              emptyMessage="Choose a pending upload order from the list to begin the receptionist upload flow."
            >
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ background: C.tP, border: `1px solid ${C.tL}`, borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{selectedOrder?.testName}</div>
                  <div style={{ fontSize: 11, color: C.kS, marginTop: 2 }}>{selectedOrder?.patientName} • {selectedOrder?.patientCode}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 7 }}>
                    <Bdg type={getStatusTone(selectedOrder?.status)} sm>{selectedOrder?.statusLabel}</Bdg>
                    <Bdg type={selectedOrder?.priorityBadgeType || 'wait'} sm>{selectedOrder?.priorityLabel}</Bdg>
                  </div>
                </div>

                {hasExistingLinkedDocument ? (
                  <ErrorState
                    compact
                    title="Document metadata already recorded"
                    message={`This test order already has a linked document record (${selectedOrder?.linkedDocumentSummary?.title || 'Document'}). Reception upload is complete enough for doctor-side linking/review later.`}
                  />
                ) : null}

                <FormCard title="Step 1 — Prepare upload foundation" subtitle="Request upload foundation details for the selected test order before recording document metadata.">
                  <FormGrid columns={1} gap={10}>
                    <FormField label="Local file" req hint="The current backend returns foundation metadata only. This file is used for descriptor capture, not a confirmed hosted upload inside the app.">
                      <input ref={fileInputRef} type="file" onChange={handleFileChange} style={{ ...S.inp, padding: '10px 12px' }} disabled={!selectedOrder || hasExistingLinkedDocument} />
                    </FormField>
                    {localError ? <ErrorState compact title="Upload preparation blocked" message={localError} /> : null}
                    <FormActions align="flex-start">
                      <LoadingButton label="Request Upload Foundation" loadingLabel="Preparing Foundation…" loading={isRequestingFoundation} disabled={!selectedOrder || !file || hasExistingLinkedDocument} onClick={handlePrepareUpload} />
                    </FormActions>
                  </FormGrid>
                </FormCard>

                {foundation ? (
                  <div style={{ background: C.bg, borderRadius: 8, padding: '10px 11px', fontSize: 12, color: C.kS }}>
                    <div style={{ fontWeight: 700, color: C.k, marginBottom: 4 }}>Upload foundation payload</div>
                    <div><strong>Mode:</strong> {foundation.mode}</div>
                    <div><strong>Storage Provider:</strong> {foundation.storageProvider}</div>
                    <div><strong>Storage Bucket:</strong> {foundation.storageBucket}</div>
                    <div><strong>Storage Key:</strong> {foundation.storageKey || '--'}</div>
                    <div><strong>Finalize Required:</strong> {foundation.finalizeRequired ? 'Yes' : 'No'}</div>
                    <div style={{ color: C.kS }}>Backend reality: this is foundation-only upload preparation. The app is not claiming a completed hosted binary transfer here.</div>
                  </div>
                ) : null}

                {foundationError ? <ErrorState compact title="Upload foundation failed" message={foundationError?.message || 'Could not request upload foundation.'} onRetry={handlePrepareUpload} /> : null}

                <FormCard title="Step 2 — Record document metadata" subtitle="Store patient-document metadata honestly without claiming a completed hosted upload inside the app.">
                  <FormGrid columns={2} gap={10}>
                    <FormField label="Document title" req>
                      <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} style={S.inp} disabled={!selectedOrder || hasExistingLinkedDocument} />
                    </FormField>
                    <SelectField
                      label="Category"
                      options={CATEGORY_OPTIONS}
                      selectProps={{ value: form.category, onChange: (event) => setForm((current) => ({ ...current, category: event.target.value })), disabled: !selectedOrder || hasExistingLinkedDocument }}
                    />
                    <SelectField
                      label="Upload status"
                      options={UPLOAD_STATUS_OPTIONS}
                      selectProps={{ value: form.upload_status, onChange: (event) => setForm((current) => ({ ...current, upload_status: event.target.value })), disabled: !selectedOrder || hasExistingLinkedDocument }}
                    />
                    <TextAreaField
                      label="Description"
                      textareaProps={{ value: form.description, onChange: (event) => setForm((current) => ({ ...current, description: event.target.value })), placeholder: 'Optional upload note', disabled: !selectedOrder || hasExistingLinkedDocument }}
                    />
                  </FormGrid>
                  <div style={{ marginTop: 10 }}>
                    <TextAreaField
                      label="Result / upload summary"
                      textareaProps={{ value: form.clinical_summary, onChange: (event) => setForm((current) => ({ ...current, clinical_summary: event.target.value })), placeholder: 'Optional operational summary for the doctor review queue', disabled: !selectedOrder || hasExistingLinkedDocument }}
                    />
                  </div>
                  {createError ? <ErrorState compact title="Metadata save failed" message={createError?.message || 'Could not create document metadata.'} onRetry={handleCreateMetadata} /> : null}
                  {createdDocument ? (
                    <div style={{ marginTop: 10, background: C.okP, borderRadius: 8, padding: '9px 11px', fontSize: 12, color: C.ok }}>
                      Document metadata recorded successfully. Current upload state: <strong>{createdDocument.uploadStatusLabel}</strong>. Doctor review/send remains a separate doctor workflow.
                    </div>
                  ) : null}
                  <FormActions align="flex-start">
                    <LoadingButton label="Create Document Metadata" loadingLabel="Recording Metadata…" loading={isCreatingDocument} disabled={!selectedOrder || !foundation || hasExistingLinkedDocument} onClick={handleCreateMetadata} />
                  </FormActions>
                </FormCard>
              </div>
            </AsyncContent>
          </SectionCard>

          <SectionCard title="Document access reality">
            <div style={{ fontSize: 12, color: C.kS, display: 'grid', gap: 8 }}>
              <div>• Reception can request upload preparation and record metadata.</div>
              <div>• The backend currently returns <strong>foundation-only</strong> upload preparation details.</div>
              <div>• Read access is also foundation-style when a stored object reference exists.</div>
              <div>• Doctor review, abnormal flagging, and patient send stay in the doctor workflow.</div>
            </div>
            <div style={{ marginTop: 10 }}>
              <FormActions align="flex-start">
                <LoadingButton
                  label="Request Read Foundation"
                  loadingLabel="Loading access..."
                  loading={isRequestingDocumentAccess}
                  disabled={!linkedDocumentId}
                  onClick={() => onRequestDocumentAccess?.(linkedDocumentId)}
                  variant="ghost"
                  small
                />
              </FormActions>
              {!linkedDocumentId ? <div style={{ marginTop: 8, fontSize: 11, color: C.kS }}>Read foundation becomes available once a linked document record exists.</div> : null}
              {documentAccessError ? <ErrorState compact title="Read foundation failed" message={documentAccessError?.message || 'Could not load document access foundation.'} onRetry={() => onRequestDocumentAccess?.(linkedDocumentId)} /> : null}
              {documentAccessFoundation ? (
                <div style={{ marginTop: 10, background: C.bg, borderRadius: 8, padding: '10px 11px', fontSize: 12, color: C.kS }}>
                  <div style={{ fontWeight: 700, color: C.k, marginBottom: 4 }}>Read-access foundation payload</div>
                  <div>Mode: {documentAccessFoundation.mode}</div>
                  <div>Storage Provider: {documentAccessFoundation.storageProvider}</div>
                  <div>Storage Bucket: {documentAccessFoundation.storageBucket || '--'}</div>
                  <div>Storage Key: {documentAccessFoundation.storageKey || '--'}</div>
                  <div style={{ marginTop: 6 }}>{documentAccessFoundation.notes || 'Current runtime returns access foundation only.'}</div>
                </div>
              ) : null}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
