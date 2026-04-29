import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import RxUpload from '../../crm/pages/RxUpload.jsx'
import { useCrmPageNavigation } from '../../modules/shared/useCrmPageNavigation.js'
import { usePendingUploadTestOrders, useTestOrderDetail } from '../../modules/test-orders/testOrders.hooks.js'
import { useCreateDocumentMutation, useDocumentAccessFoundationMutation, useUploadUrlFoundationMutation } from '../../modules/documents/documents.hooks.js'

export default function UploadReportsPage() {
  const goTo = useCrmPageNavigation('receptionist')
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTestOrderId = searchParams.get('testOrderId') || ''
  const requestedPatientId = searchParams.get('patientId') || ''
  const [selectedOrderId, setSelectedOrderId] = useState(requestedTestOrderId)

  const pendingUpload = usePendingUploadTestOrders({
    patientId: requestedPatientId || undefined,
    limit: 50,
  })

  useEffect(() => {
    if (requestedTestOrderId) {
      setSelectedOrderId(requestedTestOrderId)
      return
    }

    if (!selectedOrderId && pendingUpload.data?.items?.length) {
      setSelectedOrderId(pendingUpload.data.items[0].id)
    }
  }, [requestedTestOrderId, pendingUpload.data?.items, selectedOrderId])

  const detail = useTestOrderDetail(selectedOrderId, { enabled: Boolean(selectedOrderId) })
  const uploadFoundation = useUploadUrlFoundationMutation()
  const createDocument = useCreateDocumentMutation()
  const documentAccess = useDocumentAccessFoundationMutation()

  const selectedOrder = detail.data || pendingUpload.data?.items?.find((item) => item.id === selectedOrderId) || null
  const pendingOrders = useMemo(() => pendingUpload.data?.items || [], [pendingUpload.data])

  const handleSelectOrder = (orderId) => {
    setSelectedOrderId(orderId)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (orderId) next.set('testOrderId', orderId)
      else next.delete('testOrderId')
      return next
    }, { replace: true })
  }

  const handleRequestFoundation = async (payload) => {
    await uploadFoundation.requestFoundation(payload)
  }

  const handleCreateDocument = async (payload) => {
    const created = await createDocument.create(payload)
    await Promise.all([pendingUpload.reload(), detail.reload()])
    return created
  }

  const handleResetUploadState = () => {
    uploadFoundation.reset()
    createDocument.reset()
    documentAccess.reset()
  }

  const handleRequestDocumentAccess = async (documentId) => {
    if (!documentId) return
    return documentAccess.requestAccess(documentId)
  }

  return (
    <RxUpload
      pendingOrders={pendingOrders}
      listMeta={pendingUpload.data?.meta || null}
      selectedOrderId={selectedOrderId}
      selectedOrder={selectedOrder}
      onSelectOrder={handleSelectOrder}
      onRetryList={pendingUpload.reload}
      onRetryDetail={detail.reload}
      onRequestFoundation={handleRequestFoundation}
      foundation={uploadFoundation.data}
      isRequestingFoundation={uploadFoundation.isLoading}
      foundationError={uploadFoundation.error}
      onCreateDocument={handleCreateDocument}
      createdDocument={createDocument.data}
      isCreatingDocument={createDocument.isLoading}
      createError={createDocument.error}
      onResetUploadState={handleResetUploadState}
      onRequestDocumentAccess={handleRequestDocumentAccess}
      documentAccessFoundation={documentAccess.data}
      isRequestingDocumentAccess={documentAccess.isLoading}
      documentAccessError={documentAccess.error}
      isListLoading={pendingUpload.isLoading}
      listError={pendingUpload.error}
      isDetailLoading={detail.isLoading}
      detailError={detail.error}
      goTo={goTo}
    />
  )
}
