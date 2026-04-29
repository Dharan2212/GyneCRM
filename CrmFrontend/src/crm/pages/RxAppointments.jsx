import { useEffect, useMemo, useState } from 'react'
import { C } from '../data.js'
import { S } from '../styles.js'
import { Bdg, CH, Inp, PH } from '../atoms.jsx'
import { AsyncContent, EmptyState, ErrorState, PageLoadingState } from '../../modules/shared/ui/state/index.js'
import DataTable, { TableActions } from '../../modules/shared/ui/table/DataTable.jsx'
import { TableActionButton, TableCell, TableRow, TableStack, TableToolbar } from '../../modules/shared/ui/table/index.js'
import { FormActions, FormCard, FormGrid, LoadingButton, SelectField, TextAreaField, TextField } from '../../modules/shared/ui/form/index.js'
import { PageToolbar, SectionCard } from '../../modules/shared/ui/layout/index.js'
import { FeedbackBar, useFeedbackState } from '../../modules/shared/ui/feedback/index.js'
import { usePatientsList, useDebouncedValue } from '../../modules/patients/patients.hooks.js'
import { useDoctorsLookup } from '../../modules/doctors/doctors.hooks.js'
import {
  APPOINTMENT_STATUS_OPTIONS,
  VISIT_TYPE_OPTIONS,
  createAppointmentForm,
  createRescheduleForm,
  getVisitTypeLabel,
  mapAppointmentFormToPayload,
  validateAppointmentForm,
  validateRescheduleForm,
  mapRescheduleFormToPayload,
} from '../../modules/appointments/appointments.adapters.js'
import {
  useAppointmentsList,
  useAppointmentDetail,
  useAppointmentTypes,
  useCreateAppointmentMutation,
  useCheckInAppointmentMutation,
  useUpdateAppointmentStatusMutation,
  useRescheduleAppointmentMutation,
} from '../../modules/appointments/appointments.hooks.js'

function formatApiError(error, fallback) {
  return error?.message || fallback
}

export default function RxAppointments({ goTo = () => {}, initialAppointmentId = '', initialPatientId = '', onOpenAppointment }) {
  const todayValue = useMemo(() => {
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  }, [])

  const [filters, setFilters] = useState({ date: todayValue, status: '', page: 1, limit: 50, search: '' })
  const [patientSearch, setPatientSearch] = useState('')
  const [doctorSearch, setDoctorSearch] = useState('')
  const [bookingForm, setBookingForm] = useState(() => createAppointmentForm({ patient_id: initialPatientId }))
  const [bookingErrors, setBookingErrors] = useState({})
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(initialAppointmentId || '')
  const [statusError, setStatusError] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [rescheduleForm, setRescheduleForm] = useState(createRescheduleForm())
  const [rescheduleErrors, setRescheduleErrors] = useState({})
  const { feedback, showSuccess, showError, showWarning, clearFeedback } = useFeedbackState()

  const debouncedPatientSearch = useDebouncedValue(patientSearch, 250)
  const debouncedDoctorSearch = useDebouncedValue(doctorSearch, 250)

  const appointmentsResource = useAppointmentsList(filters)
  const appointmentTypesResource = useAppointmentTypes({ isActive: true, limit: 50 })
  const doctorsResource = useDoctorsLookup({ search: debouncedDoctorSearch, isActive: true, limit: 25 })
  const patientsResource = usePatientsList({ search: debouncedPatientSearch, limit: 25 })
  const selectedAppointment = useAppointmentDetail(selectedAppointmentId)

  const createMutation = useCreateAppointmentMutation()
  const checkInMutation = useCheckInAppointmentMutation()
  const statusMutation = useUpdateAppointmentStatusMutation()
  const rescheduleMutation = useRescheduleAppointmentMutation()

  useEffect(() => {
    if (initialPatientId) {
      setBookingForm((current) => ({ ...current, patient_id: current.patient_id || initialPatientId }))
    }
  }, [initialPatientId])

  useEffect(() => {
    if (initialAppointmentId) {
      setSelectedAppointmentId(initialAppointmentId)
    }
  }, [initialAppointmentId])

  useEffect(() => {
    if (!selectedAppointment.data) return
    setRescheduleForm(createRescheduleForm(selectedAppointment.data))
  }, [selectedAppointment.data?.id])

  useEffect(() => {
    if (selectedAppointmentId) return
    const firstId = appointmentsResource.data?.items?.[0]?.id
    if (firstId) setSelectedAppointmentId(firstId)
  }, [appointmentsResource.data?.items?.[0]?.id, selectedAppointmentId])

  const locallyFilteredAppointments = useMemo(() => {
    const search = String(filters.search || '').trim().toLowerCase()
    const items = appointmentsResource.data?.items || []
    if (!search) return items
    return items.filter((item) => [
      item.patientName,
      item.patientCode,
      item.phone,
      item.doctorName,
      item.appointmentTypeLabel,
      item.visitTypeLabel,
    ].some((value) => String(value || '').toLowerCase().includes(search)))
  }, [appointmentsResource.data?.items, filters.search])

  const patientOptions = useMemo(() => {
    const items = patientsResource.data?.items || []
    const options = [{ v: '', l: 'Select patient' }]
    items.forEach((patient) => {
      options.push({
        v: patient.id,
        l: `${patient.name} (${patient.patientCode || '--'})`,
      })
    })
    return options
  }, [patientsResource.data?.items])

  const doctorOptions = useMemo(() => {
    const items = doctorsResource.data?.items || []
    const options = [{ v: '', l: 'Select doctor' }]
    items.forEach((doctor) => {
      options.push({
        v: doctor.id,
        l: `${doctor.fullName}${doctor.speciality && doctor.speciality !== '--' ? ` • ${doctor.speciality}` : ''}`,
      })
    })
    return options
  }, [doctorsResource.data?.items])

  const appointmentTypeOptions = useMemo(() => {
    const items = appointmentTypesResource.data?.items || []
    const options = [{ v: '', l: 'Select appointment type' }]
    items.forEach((item) => options.push({ v: item.id, l: item.label }))
    return options
  }, [appointmentTypesResource.data?.items])

  const selectedDetail = selectedAppointment.data

  const handleBookingChange = (field, value) => {
    setBookingForm((current) => ({ ...current, [field]: value }))
    setBookingErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
    clearFeedback()
  }

  const handleSubmitBooking = async (event) => {
    event.preventDefault()
    const validationErrors = validateAppointmentForm(bookingForm)
    setBookingErrors(validationErrors)
    clearFeedback()

    if (Object.keys(validationErrors).length > 0) return

    try {
      const created = await createMutation.mutate({ payload: mapAppointmentFormToPayload(bookingForm) })
      showSuccess(`Appointment booked for ${created.patientName} at ${created.timeLabel}.`, 'Appointment confirmed')
      setBookingForm(createAppointmentForm({ patient_id: bookingForm.patient_id }))
      setSelectedAppointmentId(created.id)
      appointmentsResource.reload()
      if (typeof onOpenAppointment === 'function') {
        onOpenAppointment({ appointmentId: created.id, patientId: created.patientId })
      }
    } catch (error) {
      showError(formatApiError(error, 'Appointment could not be created.'), 'Booking failed')
    }
  }

  const handleCheckIn = async () => {
    if (!selectedAppointmentId) return
    clearFeedback()
    try {
      const updated = await checkInMutation.mutate({ id: selectedAppointmentId })
      showSuccess(`${updated.patientName} checked in successfully.`, 'Patient checked in')
      appointmentsResource.reload()
      selectedAppointment.reload()
    } catch (error) {
      showError(formatApiError(error, 'Check-in failed.'), 'Check-in failed')
    }
  }

  const handleUpdateStatus = async (status) => {
    if (!selectedAppointmentId) return
    setStatusError('')
    clearFeedback()
    try {
      const payload = {
        status,
        cancellation_reason: status === 'cancelled' ? (statusNote || '') : '',
      }
      const updated = await statusMutation.mutate({ id: selectedAppointmentId, payload })
      showSuccess(`Appointment status updated to ${updated.statusLabel}.`, 'Status updated')
      setStatusNote('')
      appointmentsResource.reload()
      selectedAppointment.reload()
    } catch (error) {
      setStatusError(formatApiError(error, 'Status update failed.'))
    }
  }

  const handleReschedule = async (event) => {
    event.preventDefault()
    const validationErrors = validateRescheduleForm(rescheduleForm)
    setRescheduleErrors(validationErrors)
    clearFeedback()
    if (Object.keys(validationErrors).length > 0 || !selectedAppointmentId) return

    try {
      const result = await rescheduleMutation.mutate({ id: selectedAppointmentId, payload: mapRescheduleFormToPayload(rescheduleForm) })
      const newAppointment = result?.newAppointment
      setFeedback({ type: 'success', message: newAppointment ? `Appointment rescheduled to ${newAppointment.scheduledAtLabel}.` : 'Appointment rescheduled successfully.' })
      appointmentsResource.reload()
      if (newAppointment?.id) {
        setSelectedAppointmentId(newAppointment.id)
        if (typeof onOpenAppointment === 'function') {
          onOpenAppointment({ appointmentId: newAppointment.id, patientId: newAppointment.patientId })
        }
      } else {
        selectedAppointment.reload()
      }
    } catch (error) {
      setFeedback({ type: 'error', message: formatApiError(error, 'Appointment could not be rescheduled.') })
    }
  }

  if (appointmentsResource.isLoading && !appointmentsResource.data?.items?.length) {
    return <PageLoadingState title="Loading appointments" message="Receptionist appointment workflow is being prepared." />
  }

  if (appointmentsResource.error && !appointmentsResource.data?.items?.length) {
    return <ErrorState title="Unable to load appointments" message={appointmentsResource.error?.message || 'Appointment data could not be loaded.'} onRetry={appointmentsResource.reload} />
  }

  return (
    <div>
      <PH title="Appointments" icon="appointments" sub="Book, check-in, reschedule, and manage the live front-desk queue." />

      <PageToolbar
        left={[
          <button key="desk" style={S.btn('ghost', true)} onClick={() => goTo('rx-queue')}>Back to Desk</button>,
          <button key="register" style={S.btn('primary', true)} onClick={() => goTo('rx-register')}>+ Register Patient</button>,
        ]}
        right={feedback ? [<FeedbackBar key="feedback" tone={feedback.tone} title={feedback.title} message={feedback.message} compact onDismiss={clearFeedback} />] : null}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1.2fr', gap: 16, alignItems: 'start', marginBottom: 16 }}>
        <form onSubmit={handleSubmitBooking}>
          <FormCard title="Book Appointment" subtitle="Create a receptionist-side booking with live patient, doctor, and appointment-type lookup." style={{ marginBottom: 14 }}>
            <FormGrid columns={2} gap={10}>
              <TextField
                label="Search patient"
                hint="Search by patient name, MR No, or phone"
                inputProps={{ value: patientSearch, onChange: (event) => setPatientSearch(event.target.value), placeholder: 'Search patient' }}
              />
              <SelectField
                label="Patient"
                req
                error={bookingErrors.patient_id}
                options={patientOptions}
                selectProps={{ value: bookingForm.patient_id, onChange: (event) => handleBookingChange('patient_id', event.target.value) }}
              />
              <TextField
                label="Search doctor"
                hint="Search by doctor or speciality"
                inputProps={{ value: doctorSearch, onChange: (event) => setDoctorSearch(event.target.value), placeholder: 'Search doctor' }}
              />
              <SelectField
                label="Doctor"
                req
                error={bookingErrors.doctor_id}
                options={doctorOptions}
                selectProps={{ value: bookingForm.doctor_id, onChange: (event) => handleBookingChange('doctor_id', event.target.value) }}
              />
              <SelectField
                label="Appointment type"
                req
                error={bookingErrors.appointment_type_id}
                options={appointmentTypeOptions}
                selectProps={{ value: bookingForm.appointment_type_id, onChange: (event) => handleBookingChange('appointment_type_id', event.target.value) }}
              />
              <SelectField
                label="Visit type"
                req
                error={bookingErrors.visit_type}
                options={VISIT_TYPE_OPTIONS.map((option) => ({ v: option.value, l: option.label }))}
                selectProps={{ value: bookingForm.visit_type, onChange: (event) => handleBookingChange('visit_type', event.target.value) }}
              />
              <TextField
                label="Schedule"
                req
                error={bookingErrors.scheduled_at}
                inputProps={{ type: 'datetime-local', value: bookingForm.scheduled_at, onChange: (event) => handleBookingChange('scheduled_at', event.target.value) }}
              />
              <TextField
                label="Duration (minutes)"
                req
                error={bookingErrors.duration_minutes}
                inputProps={{ type: 'number', min: 1, max: 480, value: bookingForm.duration_minutes, onChange: (event) => handleBookingChange('duration_minutes', event.target.value) }}
              />
            </FormGrid>
            <div style={{ marginTop: 10 }}>
              <TextAreaField
                label="Reason for visit"
                textareaProps={{ value: bookingForm.reason_for_visit, onChange: (event) => handleBookingChange('reason_for_visit', event.target.value), placeholder: 'Short visit reason' }}
              />
            </div>
            <div style={{ marginTop: 10 }}>
              <TextAreaField
                label="Reception notes"
                textareaProps={{ value: bookingForm.notes, onChange: (event) => handleBookingChange('notes', event.target.value), placeholder: 'Optional booking note' }}
              />
            </div>
            <FormActions align="flex-start">
              <LoadingButton type="submit" label="Create appointment" loadingLabel="Booking..." loading={createMutation.isLoading} variant="primary" />
              <button type="button" style={S.btn('ghost', true)} onClick={() => { setBookingForm(createAppointmentForm({ patient_id: bookingForm.patient_id || initialPatientId })); setBookingErrors({}); setFeedback(null) }}>Reset</button>
            </FormActions>
          </FormCard>

          <SectionCard title="Lookup readiness" style={{ marginBottom: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              <div style={{ background: C.bg, borderRadius: 8, padding: '9px 11px' }}>
                <div style={{ fontSize: 11, color: C.kS }}>Patients</div>
                <div style={{ fontWeight: 700, color: C.k }}>{patientsResource.data?.meta?.total || patientsResource.data?.items?.length || 0}</div>
              </div>
              <div style={{ background: C.bg, borderRadius: 8, padding: '9px 11px' }}>
                <div style={{ fontSize: 11, color: C.kS }}>Doctors</div>
                <div style={{ fontWeight: 700, color: C.k }}>{doctorsResource.data?.meta?.total || doctorsResource.data?.items?.length || 0}</div>
              </div>
              <div style={{ background: C.bg, borderRadius: 8, padding: '9px 11px' }}>
                <div style={{ fontSize: 11, color: C.kS }}>Types</div>
                <div style={{ fontWeight: 700, color: C.k }}>{appointmentTypeOptions.length > 0 ? appointmentTypeOptions.length - 1 : 0}</div>
              </div>
            </div>
          </SectionCard>
        </form>

        <div>
          <SectionCard
            title="Appointment Detail"
            right={selectedDetail ? <Bdg type={selectedDetail.statusBadgeType} sm>{selectedDetail.statusLabel}</Bdg> : null}
            style={{ marginBottom: 14 }}
          >
            <AsyncContent
              isLoading={Boolean(selectedAppointmentId) && selectedAppointment.isLoading}
              error={selectedAppointment.error}
              onRetry={selectedAppointment.reload}
              isEmpty={!selectedAppointmentId || !selectedDetail}
              emptyTitle="Select an appointment"
              emptyMessage="Choose an appointment from the live list to see detail, check-in, reschedule, or update status."
              compact
            >
              {selectedDetail ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: C.k }}>{selectedDetail.patientName}</div>
                      <div style={{ fontSize: 12, color: C.kS }}>{selectedDetail.patientCode} • {selectedDetail.phone}</div>
                      <div style={{ fontSize: 12, color: C.kS, marginTop: 4 }}>{selectedDetail.doctorName} • {selectedDetail.doctorSpeciality}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: C.k }}>{selectedDetail.timeLabel}</div>
                      <div style={{ fontSize: 12, color: C.kS }}>{selectedDetail.dateLabel}</div>
                      <div style={{ fontSize: 12, color: C.kS, marginTop: 4 }}>{selectedDetail.appointmentTypeLabel} • {selectedDetail.visitTypeLabel}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 10 }}>
                    <div style={{ background: C.bg, borderRadius: 8, padding: '10px 11px' }}>
                      <div style={{ fontSize: 11, color: C.kS }}>Reason</div>
                      <div style={{ fontWeight: 600, color: C.k, marginTop: 3 }}>{selectedDetail.reasonForVisit}</div>
                    </div>
                    <div style={{ background: C.bg, borderRadius: 8, padding: '10px 11px' }}>
                      <div style={{ fontSize: 11, color: C.kS }}>Reception notes</div>
                      <div style={{ fontWeight: 600, color: C.k, marginTop: 3 }}>{selectedDetail.notes || '--'}</div>
                    </div>
                  </div>

                  {statusError ? <div style={{ marginBottom: 10 }}><FeedbackBar tone="error" title="Status update failed" message={statusError} compact onDismiss={() => setStatusError('')} /></div> : null}

                  <FormActions align="flex-start">
                    <LoadingButton label="Check in" loadingLabel="Checking in..." loading={checkInMutation.isLoading} variant="ok" small onClick={handleCheckIn} disabled={!selectedDetail.canCheckIn} />
                    <LoadingButton label="Mark no-show" loadingLabel="Updating..." loading={statusMutation.isLoading} variant="ghost" small onClick={() => handleUpdateStatus('no_show')} disabled={!selectedDetail.canUpdateStatus} />
                    <LoadingButton label="Cancel" loadingLabel="Cancelling..." loading={statusMutation.isLoading} variant="danger" small onClick={() => handleUpdateStatus('cancelled')} disabled={!selectedDetail.canUpdateStatus} />
                  </FormActions>

                  <div style={{ marginTop: 10 }}>
                    <TextAreaField
                      label="Cancellation / desk note"
                      hint="Used when cancelling or marking no-show."
                      textareaProps={{ value: statusNote, onChange: (event) => setStatusNote(event.target.value), placeholder: 'Optional desk note' }}
                    />
                  </div>
                </div>
              ) : null}
            </AsyncContent>
          </SectionCard>

          <form onSubmit={handleReschedule}>
            <FormCard title="Reschedule" subtitle="Create a new scheduled slot while preserving the previous appointment trail." tone="soft">
              <FormGrid columns={2} gap={10}>
                <TextField
                  label="New date & time"
                  req
                  error={rescheduleErrors.scheduled_at}
                  inputProps={{ type: 'datetime-local', value: rescheduleForm.scheduled_at, onChange: (event) => setRescheduleForm((current) => ({ ...current, scheduled_at: event.target.value })) }}
                />
                <TextField
                  label="Duration (minutes)"
                  req
                  error={rescheduleErrors.duration_minutes}
                  inputProps={{ type: 'number', min: 1, max: 480, value: rescheduleForm.duration_minutes, onChange: (event) => setRescheduleForm((current) => ({ ...current, duration_minutes: event.target.value })) }}
                />
              </FormGrid>
              <div style={{ marginTop: 10 }}>
                <TextAreaField
                  label="Reschedule reason"
                  textareaProps={{ value: rescheduleForm.reschedule_reason, onChange: (event) => setRescheduleForm((current) => ({ ...current, reschedule_reason: event.target.value })), placeholder: 'Optional reason' }}
                />
              </div>
              <div style={{ marginTop: 10 }}>
                <TextAreaField
                  label="Desk notes"
                  textareaProps={{ value: rescheduleForm.notes, onChange: (event) => setRescheduleForm((current) => ({ ...current, notes: event.target.value })), placeholder: 'Optional notes' }}
                />
              </div>
              <FormActions align="flex-start">
                <LoadingButton type="submit" label="Reschedule appointment" loadingLabel="Rescheduling..." loading={rescheduleMutation.isLoading} variant="teal" disabled={!selectedDetail?.canReschedule} />
              </FormActions>
            </FormCard>
          </form>
        </div>
      </div>

      <TableToolbar
        searchValue={filters.search}
        onSearchChange={(value) => setFilters((current) => ({ ...current, search: value }))}
        searchPlaceholder="Search patient, MR No, phone, doctor"
        filterValue={filters.status}
        onFilterChange={(value) => setFilters((current) => ({ ...current, status: value }))}
        filterOptions={APPOINTMENT_STATUS_OPTIONS}
        secondaryFilters={[
          <Inp
            key="date"
            type="date"
            value={filters.date}
            onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}
            style={{ ...S.inp, minHeight: 38, minWidth: 170, background: '#fff' }}
          />,
        ]}
        actions={[
          <button key="refresh" style={S.btn('ghost', true)} onClick={appointmentsResource.reload}>Refresh</button>,
        ]}
        summary={<span style={{ fontSize: 12, color: C.kS }}>{locallyFilteredAppointments.length} visible</span>}
      />

      <DataTable
        headers={[
          { key: 'patient', label: 'Patient' },
          { key: 'doctor', label: 'Doctor' },
          { key: 'type', label: 'Type' },
          { key: 'time', label: 'Schedule' },
          { key: 'status', label: 'Status' },
          { key: 'actions', label: 'Actions', align: 'right' },
        ]}
        isLoading={appointmentsResource.isLoading}
        error={appointmentsResource.error}
        onRetry={appointmentsResource.reload}
        empty={locallyFilteredAppointments.length === 0}
        emptyTitle="No appointments found"
        emptyMessage="Adjust the date or status filter to see more live appointment activity."
      >
        <tbody>
          {locallyFilteredAppointments.map((appointment) => (
            <TableRow
              key={appointment.id}
              active={appointment.id === selectedAppointmentId}
              onClick={() => {
                setSelectedAppointmentId(appointment.id)
                if (typeof onOpenAppointment === 'function') {
                  onOpenAppointment({ appointmentId: appointment.id, patientId: appointment.patientId })
                }
              }}
            >
              <TableCell>
                <TableStack title={appointment.patientName} subtitle={`${appointment.patientCode} • ${appointment.phone}`} />
              </TableCell>
              <TableCell>
                <TableStack title={appointment.doctorName} subtitle={appointment.doctorSpeciality} />
              </TableCell>
              <TableCell>
                <TableStack title={appointment.appointmentTypeLabel} subtitle={getVisitTypeLabel(appointment.visitType)} compact />
              </TableCell>
              <TableCell>
                <TableStack title={appointment.timeLabel} subtitle={appointment.dateLabel} compact />
              </TableCell>
              <TableCell><Bdg type={appointment.statusBadgeType} sm>{appointment.statusLabel}</Bdg></TableCell>
              <TableCell align="right">
                <TableActions>
                  <TableActionButton label="Open" variant="ghost" onClick={(event) => { event.stopPropagation(); setSelectedAppointmentId(appointment.id) }} />
                </TableActions>
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </DataTable>
    </div>
  )
}
