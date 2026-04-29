import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TestReports from '../../crm/pages/TestReports.jsx'
import { usePatientDetail } from '../../modules/patients/patients.hooks.js'
import {
  linkTestOrderResult,
  reviewTestOrderResult,
  sendTestOrderResult,
} from '../../modules/test-orders/testOrders.api.js'
import {
  mapLinkResultPayload,
  mapReviewResultPayload,
  mapSendResultPayload,
} from '../../modules/test-orders/testOrders.adapters.js'
import {
  usePendingReviewTestOrders,
  useTestOrderDetail,
  useTestOrdersList,
} from '../../modules/test-orders/testOrders.hooks.js'
import { useDocumentAccessFoundationMutation, useDocumentReviewInbox } from '../../modules/documents/documents.hooks.js'
import { useCrmPageNavigation } from '../../modules/shared/useCrmPageNavigation.js'

export default function DoctorTestReportsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const patientId = searchParams.get('patientId') || null
  const consultationId = searchParams.get('consultationId') || null
  const selectedId = searchParams.get('testOrderId') || null
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'pending_review')

  const goTo = useCrmPageNavigation('doctor')

  const listState = useTestOrdersList(
    {
      patientId,
      consultationId,
      status: statusFilter,
      page: 1,
      limit: 50,
    },
    { enabled: true },
  )
  const pendingReviewState = usePendingReviewTestOrders({ patientId, page: 1, limit: 50 })
  const rows = listState.data?.items || []
  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedId) || rows[0] || null,
    [rows, selectedId],
  )

  const detailState = useTestOrderDetail(selectedRow?.id)
  const patientState = usePatientDetail(patientId || selectedRow?.patientId || null)
  const reviewInboxState = useDocumentReviewInbox(
    {
      patientId: patientId || selectedRow?.patientId || null,
      reviewStatus: 'pending',
      page: 1,
      limit: 50,
    },
    { enabled: Boolean(patientId || selectedRow?.patientId) },
  )

  useEffect(() => {
    if (!rows.length) return
    if (!selectedId || !rows.some((row) => row.id === selectedId)) {
      const next = new URLSearchParams(searchParams)
      next.set('testOrderId', rows[0].id)
      setSearchParams(next, { replace: true })
    }
  }, [rows, selectedId, searchParams, setSearchParams])

  const documentAccess = useDocumentAccessFoundationMutation()

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (statusFilter && statusFilter !== 'pending_review') next.set('status', statusFilter)
    else next.delete('status')

    const nextString = next.toString()
    const currentString = searchParams.toString()
    if (nextString !== currentString) {
      setSearchParams(next, { replace: true })
    }
  }, [statusFilter, searchParams, setSearchParams])


  useEffect(() => {
    documentAccess.reset()
  }, [selectedRow?.id])

  const selectOrder = (id) => {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('testOrderId', id)
    else next.delete('testOrderId')
    setSearchParams(next, { replace: true })
  }


  const handleRequestDocumentAccess = async (documentId) => {
    if (!documentId) return
    await documentAccess.requestAccess(documentId)
  }

  const openPatientHub = (nextPatientId) => {
    const resolved = nextPatientId || patientId || selectedRow?.patientId
    if (!resolved) return
    navigate(`/crm/doctor/patients?selected=${encodeURIComponent(resolved)}`)
  }

  const retryAll = () => {
    listState.reload()
    pendingReviewState.reload()
    if (detailState.reload) detailState.reload()
    if (patientState.reload) patientState.reload()
    if (reviewInboxState.reload) reviewInboxState.reload()
  }

  const handleLinkResult = async (documentId) => {
    if (!selectedRow?.id || !documentId) return
    await linkTestOrderResult({ id: selectedRow.id, payload: mapLinkResultPayload(documentId) })
    await Promise.all([detailState.reload(), listState.reload(), pendingReviewState.reload(), reviewInboxState.reload()])
  }

  const handleReviewResult = async (values) => {
    if (!selectedRow?.id) return
    await reviewTestOrderResult({ id: selectedRow.id, payload: mapReviewResultPayload(values) })
    await Promise.all([detailState.reload(), listState.reload(), pendingReviewState.reload(), reviewInboxState.reload()])
  }

  const handleSendResult = async (values) => {
    if (!selectedRow?.id) return
    await sendTestOrderResult({ id: selectedRow.id, payload: mapSendResultPayload(values) })
    await Promise.all([detailState.reload(), listState.reload(), pendingReviewState.reload()])
  }

  return (
    <TestReports
      patient={patientState.data}
      rows={rows}
      listMeta={listState.data?.meta || null}
      pendingReviewCount={pendingReviewState.data?.items?.length || 0}
      selectedId={selectedRow?.id || null}
      selectedOrder={detailState.data}
      linkedDocuments={reviewInboxState.data?.items || []}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      onSelectOrder={selectOrder}
      onOpenPatientHub={openPatientHub}
      onRetryList={listState.reload}
      onRetryDetail={detailState.reload}
      onRetryDocuments={reviewInboxState.reload}
      onRetryAll={retryAll}
      onLinkResult={handleLinkResult}
      onReviewResult={handleReviewResult}
      onSendResult={handleSendResult}
      onRequestDocumentAccess={handleRequestDocumentAccess}
      documentAccessFoundation={documentAccess.data}
      isRequestingDocumentAccess={documentAccess.isLoading}
      documentAccessError={documentAccess.error}
      isListLoading={listState.isLoading}
      listError={listState.error}
      isDetailLoading={detailState.isLoading}
      detailError={detailState.error}
      isDocumentsLoading={reviewInboxState.isLoading}
      documentsError={reviewInboxState.error}
      goTo={goTo}
    />
  )
}
