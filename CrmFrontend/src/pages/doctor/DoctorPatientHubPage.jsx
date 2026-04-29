import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PatientHub from '../../crm/pages/PatientHub.jsx'
import { useCrmPageNavigation } from '../../modules/shared/useCrmPageNavigation.js'
import {
  useDebouncedValue,
  usePatientCategoryCounts,
  usePatientCategoryHistory,
  usePatientDetail,
  usePatientHub,
  usePatientsList,
} from '../../modules/patients/patients.hooks.js'
import { usePatientSendHistory } from '../../modules/shared/sendHistory.hooks.js'

export default function DoctorPatientHubPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [category, setCategory] = useState(searchParams.get('category') || 'all')
  const [selectedId, setSelectedId] = useState(searchParams.get('selected') || null)

  const goTo = useCrmPageNavigation('doctor')
  const debouncedSearch = useDebouncedValue(search, 300)
  const backendCategory = category === 'all' ? undefined : category

  const listState = usePatientsList({
    search: debouncedSearch,
    category: backendCategory,
    page: 1,
    limit: 50,
  })
  const countsState = usePatientCategoryCounts()

  const rows = listState.data?.items || []
  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedId) || rows[0] || null,
    [rows, selectedId],
  )

  const detailState = usePatientDetail(selectedRow?.id)
  const hubState = usePatientHub(selectedRow?.id)
  const historyState = usePatientCategoryHistory(selectedRow?.id)
  const sendHistoryState = usePatientSendHistory(selectedRow?.id, { limit: 6 })

  useEffect(() => {
    if (!rows.length) {
      if (selectedId !== null) {
        setSelectedId(null)
      }
      return
    }

    if (!selectedId || !rows.some((row) => row.id === selectedId)) {
      setSelectedId(rows[0].id)
    }
  }, [rows, selectedId])

  const searchParamsString = searchParams.toString()

  useEffect(() => {
    const next = new URLSearchParams(searchParamsString)

    if (search) next.set('search', search)
    else next.delete('search')

    if (category !== 'all') next.set('category', category)
    else next.delete('category')

    if (selectedId) next.set('selected', selectedId)
    else next.delete('selected')

    const currentString = searchParamsString
    const nextString = next.toString()

    if (currentString !== nextString) {
      setSearchParams(next, { replace: true })
    }
  }, [category, search, searchParamsString, selectedId, setSearchParams])

  const openFirstConsultation = (patientId) => {
    if (!patientId) return
    navigate(`/crm/doctor/consultations/first?patientId=${encodeURIComponent(patientId)}`)
  }

  const openFollowUpConsultation = (patientId) => {
    if (!patientId) return
    navigate(`/crm/doctor/consultations/follow-up?patientId=${encodeURIComponent(patientId)}`)
  }

  const openPregnancyTracker = (patientId, pregnancyId = null) => {
    if (!patientId) return

    const next = new URLSearchParams()
    next.set('patientId', patientId)
    if (pregnancyId) {
      next.set('pregnancyId', pregnancyId)
    }

    navigate(`/crm/doctor/category-tracker?${next.toString()}`)
  }

  const openTestReports = (patientId) => {
    if (!patientId) return
    navigate(`/crm/doctor/test-reports?patientId=${encodeURIComponent(patientId)}`)
  }

  return (
    <PatientHub
      rows={rows}
      listMeta={listState.data?.meta || null}
      counts={countsState.data}
      selectedId={selectedRow?.id || null}
      selectedPatient={detailState.data}
      selectedHub={hubState.data}
      categoryHistory={historyState.data || []}
      sendHistory={sendHistoryState.data?.items || []}
      search={search}
      category={category}
      onSearchChange={setSearch}
      onCategoryChange={setCategory}
      onSelectPatient={setSelectedId}
      onRetryList={listState.reload}
      onRetryCounts={countsState.reload}
      onRetryDetail={() => {
        detailState.reload()
        hubState.reload()
        historyState.reload()
      }}
      onRetrySendHistory={sendHistoryState.reload}
      onStartConsultation={openFirstConsultation}
      onOpenFollowUpConsultation={openFollowUpConsultation}
      onOpenPregnancyTracker={openPregnancyTracker}
      onOpenTestReports={openTestReports}
      isListLoading={listState.isLoading}
      listError={listState.error}
      isCountsLoading={countsState.isLoading}
      countsError={countsState.error}
      isDetailLoading={detailState.isLoading || hubState.isLoading || historyState.isLoading}
      detailError={detailState.error || hubState.error || historyState.error}
      isSendHistoryLoading={sendHistoryState.isLoading}
      sendHistoryError={sendHistoryState.error}
      goTo={goTo}
    />
  )
}
