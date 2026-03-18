/**
 * GyneCRM — PatientProfile
 * Phase 8.2 — Shared Patient Profile Screen
 *
 * Route:  /patients/:id
 * Roles:  admin, doctor, receptionist, staff (tab visibility is role-filtered)
 *
 * Tab access matrix:
 *   Overview        — all roles
 *   Medical History — doctor, admin
 *   Pregnancies     — doctor, admin
 *   Appointments    — doctor, admin, receptionist
 *   Prescriptions   — doctor, admin
 *   Billing         — admin, receptionist only
 *   Documents       — all roles (upload: admin/receptionist only)
 *
 * Backend data status (Phase 8.2):
 *   ✅ Patient profile     GET /patients/:id  (medical_history embedded)
 *   ✅ Patient consents    GET /patients/:id/consents
 *   ✅ Appointments list   GET /appointments?patient_id=x
 *   ✅ Invoices list       GET /invoices?patient_id=x
 *   ⏳ Pregnancies list    GET /patients/:id/pregnancies   (Phase 9 — graceful fallback)
 *   ⏳ Documents list      GET /documents?patient_id=x     (Phase 9 — graceful fallback)
 *   ⏳ Prescriptions list  GET /prescriptions?patient_id=x (Phase 9 — graceful fallback)
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAuth }                                              from '@hooks/useAuth';
import { usePatient, usePatientConsents }                      from '@hooks/usePatients';
import { useAppointmentList, useMutationUpdateStatus,
         useMutationCheckIn }                                  from '@hooks/useAppointments';
import { useInvoiceList, useMutationRecordPayment }            from '@hooks/useBilling';
import { useMutationUploadDocument, useMutationGetDocumentUrl }from '@hooks/useDocuments';

import {
  Tabs, TabPanel,
  Card,
  InfoPanel,
  StatusBadge,
  PageHeader,
  EmptyState,
  ErrorState,
  SkeletonProfileHeader, SkeletonTable, SkeletonCard,
  Table,
  Button,
  Drawer,
  ConfirmModal,
} from '@components/ui';
import { Select }       from '@components/forms/Select';
import { FileUploader } from '@components/forms/FileUploader';
import { Input }        from '@components/forms/Input';

import apiClient from '@services/apiClient';

import {
  formatDate, formatTime,
  timeAgo, getGestationalWeeks, getEDD,
  formatCurrency, getInitials, extractApiError,
} from '@utils';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TAB_ACCESS = {
  overview:       ['admin', 'doctor', 'receptionist', 'staff'],
  medicalHistory: ['admin', 'doctor'],
  pregnancies:    ['admin', 'doctor'],
  appointments:   ['admin', 'doctor', 'receptionist'],
  prescriptions:  ['admin', 'doctor'],
  billing:        ['admin', 'receptionist'],
  documents:      ['admin', 'doctor', 'receptionist', 'staff'],
};

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'lab_report',        label: 'Lab Report' },
  { value: 'ultrasound',        label: 'Ultrasound' },
  { value: 'scan',              label: 'Scan' },
  { value: 'prescription',      label: 'Prescription' },
  { value: 'consent_form',      label: 'Consent Form' },
  { value: 'id_proof',          label: 'ID Proof' },
  { value: 'insurance_card',    label: 'Insurance Card' },
  { value: 'referral_letter',   label: 'Referral Letter' },
  { value: 'discharge_summary', label: 'Discharge Summary' },
  { value: 'other',             label: 'Other' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function canAccess(role, tab) {
  return TAB_ACCESS[tab]?.includes(role) ?? false;
}

function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

function formatAllergies(allergies) {
  if (!allergies) return null;
  if (typeof allergies === 'string') return allergies;
  if (Array.isArray(allergies)) {
    return allergies.map((a) => (typeof a === 'string' ? a : a.name)).join(', ');
  }
  try { return JSON.stringify(allergies); } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Root — PatientProfile
// ─────────────────────────────────────────────────────────────────────────────

export default function PatientProfile() {
  const { id }   = useParams();
  const { role } = useAuth();

  const { data: patient, isLoading, isError, refetch } = usePatient(id);

  const allTabs = [
    { value: 'overview',       label: 'Overview' },
    { value: 'medicalHistory', label: 'Medical History' },
    { value: 'pregnancies',    label: 'Pregnancies' },
    { value: 'appointments',   label: 'Appointments' },
    { value: 'prescriptions',  label: 'Prescriptions' },
    { value: 'billing',        label: 'Billing' },
    { value: 'documents',      label: 'Documents' },
  ];
  const visibleTabs = allTabs.filter((t) => canAccess(role, t.value));

  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.value ?? 'overview');

  // Re-anchor tab if role changes and current tab becomes inaccessible
  useEffect(() => {
    if (!visibleTabs.find((t) => t.value === activeTab)) {
      setActiveTab(visibleTabs[0]?.value ?? 'overview');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Derived
  const age        = calcAge(patient?.date_of_birth);
  const initials   = patient
    ? getInitials(
        patient.full_name?.split(' ')[0],
        patient.full_name?.split(' ').slice(1).join(' ')
      )
    : '??';
  const activePreg  = patient?.active_pregnancy ?? null;
  const gestWeeks   = activePreg ? getGestationalWeeks(activePreg.lmp_date) : null;
  const isHighRisk  = activePreg?.is_high_risk ?? false;

  const backPath =
    role === 'doctor'       ? '/doctor/patients'    :
    role === 'receptionist' ? '/reception/patients' :
    role === 'staff'        ? '/staff/dashboard'    :
                              '/admin/users';

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="page-content space-y-4">
        <SkeletonProfileHeader />
        <div className="px-4 sm:px-6 space-y-4">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={3} />
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (isError || !patient) {
    return (
      <div className="page-content">
        <ErrorState
          title="Patient not found"
          description="This record could not be loaded. It may have been deleted or you may not have access."
          onRetry={refetch}
        />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page-content">

      {/* Page header */}
      <PageHeader
        title={patient.full_name}
        breadcrumbs={[
          { label: 'Patients', href: backPath },
          { label: patient.full_name },
        ]}
        actions={
          (role === 'admin' || role === 'receptionist') ? (
            <Button variant="primary" size="sm" onClick={() => setActiveTab('appointments')}>
              + New Appointment
            </Button>
          ) : null
        }
      />

      {/* ── Sticky patient context strip ──────────────────────────────────── */}
      <div className="bg-white border-b border-surface-border px-4 sm:px-6 py-4 sticky top-[57px] z-20">
        <div className="flex items-start gap-4 flex-wrap">

          {/* Avatar */}
          <div
            className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center shrink-0 select-none"
            aria-hidden="true"
          >
            <span className="text-primary-700 font-bold text-sm">{initials}</span>
          </div>

          {/* Identity block */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-content-primary leading-tight">
                {patient.full_name}
              </h2>
              {patient.patient_code && (
                <span className="text-xs text-content-tertiary font-mono bg-surface-subtle px-2 py-0.5 rounded">
                  {patient.patient_code}
                </span>
              )}
              {isHighRisk && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-danger-100 text-danger-700">
                  ⚠ High Risk
                </span>
              )}
              {gestWeeks != null && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
                  Week {gestWeeks}
                </span>
              )}
              {!patient.is_active && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                  Inactive
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-content-tertiary">
              {age != null && (
                <span>
                  <span className="text-content-secondary font-medium">{age}</span> yrs
                </span>
              )}
              {patient.blood_group && (
                <span>
                  Blood:{' '}
                  <span className="text-content-secondary font-medium">{patient.blood_group}</span>
                </span>
              )}
              {patient.phone && (
                <span className="text-content-secondary">{patient.phone}</span>
              )}
              {patient.date_of_birth && (
                <span>
                  DOB:{' '}
                  <span className="text-content-secondary">{formatDate(patient.date_of_birth)}</span>
                </span>
              )}
            </div>
          </div>

          {/* Edit action */}
          {(role === 'admin' || role === 'receptionist') && (
            <div className="shrink-0">
              <Button variant="secondary" size="sm">
                Edit Demographics
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-surface-border px-4 sm:px-6">
        <Tabs tabs={visibleTabs} value={activeTab} onChange={setActiveTab} />
      </div>

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-6 space-y-6">

        <TabPanel value="overview" activeTab={activeTab}>
          <OverviewTab patient={patient} />
        </TabPanel>

        <TabPanel value="medicalHistory" activeTab={activeTab}>
          {canAccess(role, 'medicalHistory') && (
            <MedicalHistoryTab patient={patient} patientId={id} />
          )}
        </TabPanel>

        <TabPanel value="pregnancies" activeTab={activeTab}>
          {canAccess(role, 'pregnancies') && (
            <PregnanciesTab patientId={id} role={role} />
          )}
        </TabPanel>

        <TabPanel value="appointments" activeTab={activeTab}>
          {canAccess(role, 'appointments') && (
            <AppointmentsTab patientId={id} role={role} />
          )}
        </TabPanel>

        <TabPanel value="prescriptions" activeTab={activeTab}>
          {canAccess(role, 'prescriptions') && (
            <PrescriptionsTab patientId={id} />
          )}
        </TabPanel>

        <TabPanel value="billing" activeTab={activeTab}>
          {canAccess(role, 'billing') && (
            <BillingTab patientId={id} />
          )}
        </TabPanel>

        <TabPanel value="documents" activeTab={activeTab}>
          <DocumentsTab patientId={id} role={role} />
        </TabPanel>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1 — Overview
// ─────────────────────────────────────────────────────────────────────────────

function OverviewTab({ patient }) {
  const h = patient.medical_history;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <InfoPanel
        title="Demographics"
        cols={2}
        items={[
          { label: 'Full Name',       value: patient.full_name },
          { label: 'Patient Code',    value: patient.patient_code },
          { label: 'Date of Birth',   value: formatDate(patient.date_of_birth) },
          { label: 'Blood Group',     value: patient.blood_group },
          { label: 'Phone',           value: patient.phone },
          { label: 'Family WhatsApp', value: patient.family_whatsapp },
          { label: 'Address',         value: patient.address, span: 2 },
        ]}
      />
      <InfoPanel
        title="Emergency Contact"
        cols={2}
        items={[
          { label: 'Name',  value: patient.emergency_contact_name },
          { label: 'Phone', value: patient.emergency_contact_phone },
        ]}
      />
      <InfoPanel
        title="Health Summary"
        cols={1}
        items={[
          {
            label: 'Known Allergies',
            value: formatAllergies(h?.allergies) || 'None recorded',
          },
          {
            label: 'Existing Conditions',
            value: h?.existing_conditions || 'None recorded',
          },
          {
            label: 'Current Medications',
            value: h?.current_medications || 'None recorded',
          },
        ]}
      />
      <InfoPanel
        title="Record Info"
        cols={2}
        items={[
          { label: 'Registered By', value: patient.registered_by_name },
          { label: 'Registered On', value: formatDate(patient.created_at) },
          { label: 'Last Updated',  value: timeAgo(patient.updated_at) },
          { label: 'Status',        value: patient.is_active ? 'Active' : 'Inactive' },
        ]}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2 — Medical History  (doctor, admin)
// medical_history is embedded in the patient object from GET /patients/:id
// ─────────────────────────────────────────────────────────────────────────────

function MedicalHistoryTab({ patient, patientId }) {
  const h = patient.medical_history;
  const { data: consents, isLoading: consentsLoading } = usePatientConsents(patientId);

  return (
    <div className="space-y-6">
      <Card title="Medical History" padding="md">
        {!h ? (
          <EmptyState
            compact
            title="No medical history recorded"
            description="Medical history will appear here once documented."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            {[
              { label: 'Existing Conditions',  value: h.existing_conditions },
              { label: 'Allergies',             value: formatAllergies(h.allergies) },
              { label: 'Surgical History',      value: h.surgical_history },
              { label: 'Family History',        value: h.family_history },
              { label: 'Current Medications',   value: h.current_medications },
              { label: 'Clinical Notes',        value: h.notes },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="section-header mb-1">{label}</p>
                <p className="text-sm text-content-primary">
                  {value || <span className="text-content-disabled">None recorded</span>}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Consent Records" padding="none">
        {consentsLoading ? (
          <div className="p-4"><SkeletonCard lines={2} /></div>
        ) : !consents || consents.length === 0 ? (
          <EmptyState
            compact
            title="No consent records"
            description="Consent records will appear here once documented."
          />
        ) : (
          <Table
            columns={[
              {
                key: 'consent_type',
                header: 'Type',
                render: (v) => (
                  <span className="capitalize text-sm">{v?.replace(/_/g, ' ')}</span>
                ),
              },
              {
                key: 'consented',
                header: 'Status',
                render: (v) => (
                  <span
                    className={`text-xs font-semibold ${
                      v ? 'text-success-600' : 'text-danger-600'
                    }`}
                  >
                    {v ? 'Consented' : 'Withdrawn'}
                  </span>
                ),
              },
              { key: 'created_at', header: 'Recorded', render: (v) => formatDate(v) },
              { key: 'notes',      header: 'Notes',    render: (v) => v || '—' },
            ]}
            data={consents}
            emptyTitle="No consents recorded"
          />
        )}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 3 — Pregnancies  (doctor, admin)
// GET /patients/:id/pregnancies — not yet mounted on backend (Phase 9).
// useEffect + direct apiClient call; graceful empty on 404.
// ─────────────────────────────────────────────────────────────────────────────

function PregnanciesTab({ patientId, role }) {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setUnavailable(false);
    apiClient
      .get(`${BASE}/patients/${patientId}/pregnancies`)
      .then((r) => {
        if (cancelled) return;
        const data = r.data.data;
        setRows(data?.rows ?? data ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setUnavailable(true);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [patientId, BASE]);

  if (loading) return <SkeletonTable rows={3} cols={6} />;

  if (unavailable) {
    return (
      <EmptyState
        title="Pregnancy records unavailable"
        description="Pregnancy records are not yet available in this view. They can be accessed from the Doctor Dashboard."
      />
    );
  }

  return (
    <div className="space-y-4">
      {role === 'doctor' && rows.length > 0 && (
        <div className="flex justify-end">
          <Button variant="primary" size="sm">+ New Pregnancy</Button>
        </div>
      )}
      <Table
        columns={[
          {
            key: '_num',
            header: '#',
            width: 'w-10',
            render: (_v, _row, idx) => (
              <span className="text-content-tertiary text-xs">{idx + 1}</span>
            ),
          },
          { key: 'lmp_date',     header: 'LMP',      render: (v) => formatDate(v) },
          { key: '_edd',         header: 'EDD',      render: (_v, row) => getEDD(row.lmp_date) },
          {
            key: '_week',
            header: 'Week',
            render: (_v, row) => {
              const w = getGestationalWeeks(row.lmp_date);
              return w != null ? `Week ${w}` : '—';
            },
          },
          { key: 'status',      header: 'Status',   render: (v) => <StatusBadge status={v} /> },
          {
            key: 'is_high_risk',
            header: 'Risk',
            render: (v) =>
              v ? (
                <span className="text-xs font-semibold text-danger-600">High Risk</span>
              ) : (
                <span className="text-xs text-content-disabled">Normal</span>
              ),
          },
          { key: 'delivery_date', header: 'Delivery', render: (v) => (v ? formatDate(v) : '—') },
        ]}
        data={rows}
        emptyTitle="No pregnancy records"
        emptyDescription="No pregnancies have been recorded for this patient."
        emptyAction={
          role === 'doctor' ? (
            <Button variant="primary" size="sm">+ New Pregnancy</Button>
          ) : undefined
        }
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 4 — Appointments  (doctor, admin, receptionist)
// GET /appointments?patient_id=x — fully supported.
// ─────────────────────────────────────────────────────────────────────────────

function AppointmentsTab({ patientId, role }) {
  const [page, setPage]             = useState(1);
  const [detailAppt, setDetailAppt] = useState(null);
  const [cancelAppt, setCancelAppt] = useState(null);
  const canMutate = role === 'admin' || role === 'receptionist';

  const { data, isLoading, isError, refetch } = useAppointmentList({
    patient_id: patientId,
    page,
    limit: 20,
  });

  const { mutate: updateStatus, isPending: cancelling } = useMutationUpdateStatus();
  const { mutate: checkIn,      isPending: checkingIn  } = useMutationCheckIn();

  const appointments = data?.appointments ?? (Array.isArray(data) ? data : []);
  const meta         = data?.meta;

  if (isLoading) return <SkeletonTable rows={5} cols={6} />;
  if (isError)   return <ErrorState onRetry={refetch} />;

  const columns = [
    {
      key: 'scheduled_at',
      header: 'Date & Time',
      render: (v) => (
        <div>
          <div className="text-sm font-medium text-content-primary">{formatDate(v)}</div>
          <div className="text-xs text-content-tertiary">{formatTime(v)}</div>
        </div>
      ),
    },
    { key: 'doctor_name', header: 'Doctor',    render: (v) => v || '—' },
    { key: 'type_name',   header: 'Type',      render: (v) => v || '—' },
    { key: 'status',      header: 'Status',    render: (v) => <StatusBadge status={v} /> },
    {
      key: 'queue_token',
      header: 'Token',
      render: (v) =>
        v ? (
          <span className="font-mono text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded">
            {v}
          </span>
        ) : (
          <span className="text-content-disabled text-xs">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (_v, row) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDetailAppt(row)}>
            View
          </Button>
          {canMutate && row.status === 'arrived' && (
            <Button
              variant="primary"
              size="sm"
              loading={checkingIn}
              onClick={() =>
                checkIn(row.id, {
                  onSuccess: () => { refetch(); toast.success('Patient checked in.'); },
                  onError:   (e) => toast.error(extractApiError(e)),
                })
              }
            >
              Check In
            </Button>
          )}
          {canMutate && !['completed', 'cancelled', 'no_show'].includes(row.status) && (
            <Button variant="ghost" size="sm" onClick={() => setCancelAppt(row)}>
              Cancel
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        data={appointments}
        loading={isLoading}
        emptyTitle="No appointments"
        emptyDescription="Appointments for this patient will appear here."
        pagination={
          meta
            ? {
                page: meta.page,
                limit: meta.limit,
                total: meta.total,
                totalPages: meta.total_pages,
                onPageChange: setPage,
              }
            : undefined
        }
      />

      {/* Appointment detail drawer */}
      <Drawer
        open={!!detailAppt}
        onClose={() => setDetailAppt(null)}
        title="Appointment Detail"
        width="md"
      >
        {detailAppt && (
          <InfoPanel
            cols={2}
            items={[
              { label: 'Date',        value: formatDate(detailAppt.scheduled_at) },
              { label: 'Time',        value: formatTime(detailAppt.scheduled_at) },
              { label: 'Doctor',      value: detailAppt.doctor_name },
              { label: 'Type',        value: detailAppt.type_name },
              { label: 'Status',      value: <StatusBadge status={detailAppt.status} /> },
              { label: 'Queue Token', value: detailAppt.queue_token || '—' },
              { label: 'Branch',      value: detailAppt.branch_name || '—' },
              { label: 'Notes',       value: detailAppt.notes || '—', span: 2 },
            ]}
          />
        )}
      </Drawer>

      {/*
        ConfirmModal: manages its own `reason` state internally.
        onConfirm receives (reason: string | undefined) as first argument.
      */}
      <ConfirmModal
        open={!!cancelAppt}
        onClose={() => setCancelAppt(null)}
        onConfirm={(reason) => {
          if (!cancelAppt) return;
          updateStatus(
            { id: cancelAppt.id, status: 'cancelled', reason },
            {
              onSuccess: () => {
                refetch();
                setCancelAppt(null);
                toast.success('Appointment cancelled.');
              },
              onError: (e) => toast.error(extractApiError(e)),
            }
          );
        }}
        loading={cancelling}
        title="Cancel this appointment?"
        description="The patient will be notified automatically. This action cannot be undone."
        confirmLabel="Cancel Appointment"
        variant="danger"
        requireReason
        reasonLabel="Reason for cancellation"
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 5 — Prescriptions  (doctor, admin)
// GET /prescriptions?patient_id=x — not yet a real endpoint (Phase 9).
// useEffect + direct apiClient; graceful empty on failure.
// ─────────────────────────────────────────────────────────────────────────────

function PrescriptionsTab({ patientId }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient
      .get(`${BASE}/prescriptions`, { params: { patient_id: patientId } })
      .then((r) => {
        if (cancelled) return;
        const data = r.data.data;
        setRows(data?.rows ?? data ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setRows([]);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [patientId, BASE]);

  if (loading) return <SkeletonTable rows={4} cols={4} />;

  return (
    <Table
      columns={[
        { key: 'created_at',  header: 'Date',   render: (v) => formatDate(v) },
        { key: 'doctor_name', header: 'Doctor', render: (v) => v || '—' },
        { key: 'items_count', header: 'Items',  render: (v) => v ?? '—' },
        { key: 'status',      header: 'Status', render: (v) => <StatusBadge status={v} /> },
        {
          key: 'actions',
          header: '',
          align: 'right',
          render: (_v, row) => (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                import('@services/prescriptionService').then(({ getPrescriptionPdf }) => {
                  getPrescriptionPdf(row.id)
                    .then(({ url }) => window.open(url, '_blank', 'noopener'))
                    .catch(() => toast.error('Could not load prescription PDF.'));
                });
              }}
            >
              Download PDF
            </Button>
          ),
        },
      ]}
      data={rows}
      emptyTitle="No prescriptions found"
      emptyDescription="Prescriptions issued to this patient will appear here."
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 6 — Billing  (admin, receptionist)
// GET /invoices?patient_id=x — fully supported.
// ─────────────────────────────────────────────────────────────────────────────

function BillingTab({ patientId }) {
  const [page, setPage]           = useState(1);
  const [payInvoice, setPayInvoice] = useState(null);
  const [payForm, setPayForm]     = useState({
    amount: '', payment_mode: 'cash', reference_number: '',
  });

  const { data, isLoading, isError, refetch } = useInvoiceList({
    patient_id: patientId, page, limit: 20,
  });

  const { mutate: recordPayment, isPending: paying } = useMutationRecordPayment();

  const invoices = data?.invoices ?? (Array.isArray(data) ? data : []);
  const meta     = data?.meta;

  if (isLoading) return <SkeletonTable rows={5} cols={6} />;
  if (isError)   return <ErrorState onRetry={refetch} />;

  const columns = [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      render: (v) => <span className="font-mono text-xs text-content-secondary">{v}</span>,
    },
    { key: 'created_at',   header: 'Date',    render: (v) => formatDate(v) },
    { key: 'total_amount', header: 'Total',   render: (v) => formatCurrency(v) },
    { key: 'paid_amount',  header: 'Paid',    render: (v) => formatCurrency(v) },
    {
      key: '_balance',
      header: 'Balance',
      render: (_v, row) => {
        const bal = (row.total_amount ?? 0) - (row.paid_amount ?? 0);
        return (
          <span
            className={
              bal > 0
                ? 'text-danger-600 font-semibold text-sm'
                : 'text-content-disabled text-sm'
            }
          >
            {formatCurrency(bal)}
          </span>
        );
      },
    },
    { key: 'status',       header: 'Status',  render: (v) => <StatusBadge status={v} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (_v, row) => {
        const balance = (row.total_amount ?? 0) - (row.paid_amount ?? 0);
        return (
          <div className="flex items-center justify-end gap-2">
            {['pending', 'partially_paid'].includes(row.status) && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setPayForm({
                    amount: balance > 0 ? balance.toFixed(2) : '',
                    payment_mode: 'cash',
                    reference_number: '',
                  });
                  setPayInvoice(row);
                }}
              >
                Collect
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                import('@services/billingService').then(({ getInvoicePdf }) => {
                  getInvoicePdf(row.id)
                    .then(({ url }) => window.open(url, '_blank', 'noopener'))
                    .catch(() => toast.error('Could not load invoice PDF.'));
                });
              }}
            >
              PDF
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        data={invoices}
        loading={isLoading}
        emptyTitle="No invoices found"
        emptyDescription="Invoices for this patient will appear here once created."
        pagination={
          meta
            ? {
                page: meta.page,
                limit: meta.limit,
                total: meta.total,
                totalPages: meta.total_pages,
                onPageChange: setPage,
              }
            : undefined
        }
      />

      {/* Record payment drawer */}
      <Drawer
        open={!!payInvoice}
        onClose={() => setPayInvoice(null)}
        title={`Collect Payment — ${payInvoice?.invoice_number ?? ''}`}
        width="sm"
        footer={
          <div className="flex items-center gap-3 w-full">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setPayInvoice(null)}
              disabled={paying}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              loading={paying}
              disabled={!payForm.amount || parseFloat(payForm.amount) <= 0 || paying}
              onClick={() => {
                if (!payInvoice) return;
                recordPayment(
                  {
                    invoiceId:        payInvoice.id,
                    amount:           parseFloat(payForm.amount),
                    payment_mode:     payForm.payment_mode,
                    reference_number: payForm.reference_number || undefined,
                  },
                  {
                    onSuccess: () => {
                      refetch();
                      setPayInvoice(null);
                      toast.success('Payment recorded successfully.');
                    },
                    onError: (e) => toast.error(extractApiError(e)),
                  }
                );
              }}
            >
              Confirm Payment
            </Button>
          </div>
        }
      >
        {payInvoice && (
          <div className="space-y-5">
            <InfoPanel
              cols={2}
              compact
              items={[
                { label: 'Invoice', value: payInvoice.invoice_number },
                { label: 'Total',   value: formatCurrency(payInvoice.total_amount) },
                { label: 'Paid',    value: formatCurrency(payInvoice.paid_amount) },
                {
                  label: 'Balance',
                  value: formatCurrency(
                    (payInvoice.total_amount ?? 0) - (payInvoice.paid_amount ?? 0)
                  ),
                },
              ]}
            />
            <Input
              label="Amount (₹)"
              type="number"
              min="0.01"
              step="0.01"
              value={payForm.amount}
              onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
              required
            />
            <Select
              label="Payment Mode"
              value={payForm.payment_mode}
              onChange={(v) => setPayForm((p) => ({ ...p, payment_mode: v }))}
              options={[
                { value: 'cash',          label: 'Cash' },
                { value: 'card',          label: 'Card' },
                { value: 'upi',           label: 'UPI' },
                { value: 'bank_transfer', label: 'Bank Transfer' },
              ]}
            />
            {payForm.payment_mode !== 'cash' && (
              <Input
                label="Reference / Transaction ID"
                value={payForm.reference_number}
                onChange={(e) =>
                  setPayForm((p) => ({ ...p, reference_number: e.target.value }))
                }
                placeholder="UTR / Transaction ref"
              />
            )}
          </div>
        )}
      </Drawer>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 7 — Documents  (all roles; upload: admin/receptionist only)
// No patient-scoped document list in backend yet (Phase 9).
// useEffect + direct apiClient; graceful empty on failure.
// Upload flow fully wired to useMutationUploadDocument from Batch 8.1.
// ─────────────────────────────────────────────────────────────────────────────

function DocumentsTab({ patientId, role }) {
  const canUpload = role === 'admin' || role === 'receptionist';

  const [rows, setRows]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [uploadDrawer, setUploadDrawer] = useState(false);
  const [docType, setDocType]       = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

  const { mutate: uploadDoc, isPending: uploading } = useMutationUploadDocument();
  const { mutate: getUrl }                           = useMutationGetDocumentUrl();

  function fetchDocs(cancelled = false) {
    apiClient
      .get(`${BASE}/documents`, { params: { patient_id: patientId } })
      .then((r) => {
        if (cancelled) return;
        const data = r.data.data;
        setRows(data?.documents ?? data ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setRows([]);
        setLoading(false);
      });
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDocs(cancelled);
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  function closeUploadDrawer() {
    setUploadDrawer(false);
    setSelectedFile(null);
    setDocType('');
    setUploadProgress(0);
  }

  function handleUpload() {
    if (!selectedFile || !docType) {
      toast.error('Please select a document type and a file.');
      return;
    }
    uploadDoc(
      {
        file:          selectedFile,
        patient_id:    patientId,
        document_type: docType,
        onProgress:    setUploadProgress,
      },
      {
        onSuccess: () => {
          toast.success('Document uploaded successfully.');
          closeUploadDrawer();
          fetchDocs();
        },
        onError: (e) => toast.error(extractApiError(e)),
      }
    );
  }

  function openDocument(docId) {
    getUrl(docId, {
      onSuccess: ({ url }) => window.open(url, '_blank', 'noopener'),
      onError:   ()         => toast.error('Could not retrieve document link.'),
    });
  }

  const columns = [
    {
      key: 'document_type',
      header: 'Type',
      render: (v) => (
        <span className="capitalize text-sm">{v?.replace(/_/g, ' ')}</span>
      ),
    },
    {
      key: 'file_name',
      header: 'File',
      render: (v) => (
        <span className="text-xs text-content-tertiary truncate max-w-[160px] block">{v}</span>
      ),
    },
    {
      key: 'uploaded_by_name',
      header: 'Uploaded By',
      render: (v) => v || '—',
    },
    { key: 'created_at',    header: 'Date',   render: (v) => formatDate(v) },
    {
      key: 'review_status',
      header: 'Review',
      render: (v) =>
        v ? (
          <StatusBadge status={v} size="sm" />
        ) : (
          <span className="text-content-disabled text-xs">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (_v, row) => (
        <Button variant="ghost" size="sm" onClick={() => openDocument(row.id)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <>
      {canUpload && (
        <div className="flex justify-end mb-4">
          <Button variant="primary" size="sm" onClick={() => setUploadDrawer(true)}>
            + Upload Document
          </Button>
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={4} cols={5} />
      ) : (
        <Table
          columns={columns}
          data={rows}
          emptyTitle="No documents uploaded"
          emptyDescription={
            canUpload
              ? 'Upload lab reports, ultrasounds, scans, and other patient documents.'
              : 'Documents for this patient will appear here once uploaded.'
          }
          emptyAction={
            canUpload ? (
              <Button variant="primary" size="sm" onClick={() => setUploadDrawer(true)}>
                Upload Document
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Upload drawer */}
      <Drawer
        open={uploadDrawer}
        onClose={closeUploadDrawer}
        title="Upload Document"
        width="md"
        footer={
          <div className="flex items-center gap-3 w-full">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={closeUploadDrawer}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              loading={uploading}
              disabled={!selectedFile || !docType || uploading}
              onClick={handleUpload}
            >
              {uploading ? `Uploading ${uploadProgress}%…` : 'Upload'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <Select
            label="Document Type"
            required
            value={docType}
            onChange={setDocType}
            options={DOCUMENT_TYPE_OPTIONS}
            placeholder="Select document type…"
          />
          <FileUploader
            label="Select File"
            accept={['application/pdf', 'image/jpeg', 'image/png', 'image/webp']}
            maxSizeMB={10}
            onFilesChange={(files) => setSelectedFile(files[0] ?? null)}
            uploading={uploading}
            progress={uploadProgress}
          />
          {selectedFile && (
            <p className="text-xs text-content-tertiary">
              Selected:{' '}
              <span className="font-medium text-content-secondary">{selectedFile.name}</span>
              {' '}({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>
      </Drawer>
    </>
  );
}
