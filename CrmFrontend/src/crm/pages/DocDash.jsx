import { C, IVF_STAGES } from '../data.js'
import { S } from '../styles.js'
import { SC, CH, TL, Bdg, Av, PH } from '../atoms.jsx'
import { AsyncContent, EmptyState, ErrorState, PageLoadingState } from '../../modules/shared/ui/state/index.js'

function getStatusBg(status) {
  return status === 'Completed'
    ? { bg: `${C.okL}80`, border: C.ok }
    : status === 'Checked In'
      ? { bg: C.tP, border: C.t }
      : status === 'Cancelled'
        ? { bg: C.erL, border: C.er }
        : { bg: C.mP, border: C.m }
}

export default function DocDash({ dashboard, isLoading, error, onRetry, onOpenPatient, onOpenPregnancyTracker, onOpenTestReview, goTo }) {
  if (isLoading) {
    return <PageLoadingState title="Loading doctor dashboard" message="Clinical KPIs and patient alerts are being prepared." />
  }

  if (error) {
    return <ErrorState title="Unable to load dashboard" message={error?.message || 'Doctor dashboard data could not be loaded.'} onRetry={onRetry} />
  }

  if (!dashboard) {
    return <EmptyState title="No dashboard data available" message="Doctor dashboard information will appear here once the backend responds." />
  }

  const consultAttention = dashboard.consultationsNeedingAttention || []
  const pendingTests = dashboard.pendingTests || []
  const highRiskPatients = dashboard.highRiskPatients || []
  const todayAppointments = dashboard.todayAppointments || []
  const recentActivity = dashboard.recentActivity || []

  return (
    <div>
      <PH
        title={`Good Morning, ${dashboard.header.doctorName}`}
        icon="dashboard"
        sub={dashboard.header.subtitle}
        actions={(
          <>
            <button style={S.btn('ghost', true)} onClick={() => onOpenPatient()}>All Patients</button>
            <button style={S.btn('primary')} onClick={() => goTo('first-consult')}>+ New Consultation</button>
          </>
        )}
      />

      {consultAttention.length > 0 ? (
        <div style={{ background: C.wnL, border: `1.5px solid ${C.wn}40`, borderRadius: 10, padding: '10px 15px', marginBottom: 9, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.wn }}>{consultAttention.length} consultation{consultAttention.length > 1 ? 's' : ''} need attention</div>
            <div style={{ fontSize: 12, color: C.kS }}>{consultAttention.slice(0, 3).map((item) => item.patientName).join(', ')}</div>
          </div>
          <button style={S.btn('saffron', true)} onClick={() => onOpenPatient(consultAttention[0]?.patientId)}>Open Patient</button>
        </div>
      ) : null}

      {pendingTests.length > 0 ? (
        <div style={{ background: C.tP, border: `1.5px solid ${C.tL}`, borderRadius: 10, padding: '10px 15px', marginBottom: 9, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.t }}>{pendingTests.length} test result{pendingTests.length > 1 ? 's' : ''} awaiting review</div>
            <div style={{ fontSize: 12, color: C.kS }}>{pendingTests.slice(0, 3).map((item) => `${item.patientName}: ${item.label}`).join(' | ')}</div>
          </div>
          <button style={S.btn('teal', true)} onClick={() => onOpenTestReview ? onOpenTestReview(pendingTests[0]?.patientId, pendingTests[0]?.id) : onOpenPatient(pendingTests[0]?.patientId)}>Open Review</button>
        </div>
      ) : null}

      {highRiskPatients.length > 0 ? (
        <div style={{ background: C.erL, border: `1.5px solid ${C.er}40`, borderRadius: 10, padding: '10px 15px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.er }}>
              HIGH RISK: {highRiskPatients.map((patient) => `${patient.patientName} ${patient.badgeLabel}`).join(', ')}
            </div>
          </div>
          <button style={S.btn('danger', true)} onClick={() => { if (onOpenPregnancyTracker) onOpenPregnancyTracker(highRiskPatients[0]?.patientId, highRiskPatients[0]?.id); else onOpenPatient(highRiskPatients[0]?.patientId) }}>View</button>
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 11, marginBottom: 18 }}>
        {dashboard.cards.map((card) => (
          <SC key={card.id} icon={card.icon} num={card.num} label={card.label} ac={card.ac} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={S.card()}>
          <CH title="Today's OPD Schedule" />
          <AsyncContent
            isEmpty={todayAppointments.length === 0}
            emptyTitle="No appointments scheduled"
            emptyMessage="Scheduled appointments for the selected day will appear here."
            compact
          >
            {todayAppointments.map((appointment) => {
              const theme = getStatusBg(appointment.statusLabel)
              return (
                <div
                  key={appointment.id}
                  onClick={() => onOpenPatient(appointment.patientId)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, marginBottom: 4, borderLeft: `3px solid ${theme.border}`, background: theme.bg, cursor: 'pointer' }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.kS, minWidth: 54 }}>{appointment.timeLabel}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{appointment.patientName}</div>
                    <div style={{ fontSize: 11, color: C.kS }}>{appointment.appointmentType}{appointment.label ? ` • ${appointment.label}` : ''}</div>
                  </div>
                  <Bdg type={appointment.badgeType}>{appointment.statusLabel}</Bdg>
                  <button style={{ ...S.btn('outline', true), padding: '2px 7px', fontSize: 10 }} onClick={(event) => { event.stopPropagation(); onOpenPatient(appointment.patientId) }}>Open</button>
                </div>
              )
            })}
          </AsyncContent>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={S.card()}>
            <CH title="High Risk Patients" />
            <AsyncContent
              isEmpty={highRiskPatients.length === 0}
              emptyTitle="No high-risk patients"
              emptyMessage="Pregnancy alerts will appear here when a patient is flagged as high-risk."
              compact
            >
              {highRiskPatients.map((patient, index) => (
                <div key={patient.id} onClick={() => { if (onOpenPregnancyTracker) onOpenPregnancyTracker(patient.patientId, patient.id); else onOpenPatient(patient.patientId) }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: index < highRiskPatients.length - 1 ? `1px solid ${C.bd}` : 'none', cursor: 'pointer' }}>
                  <Av i={patient.initials} idx={patient.avatarIndex} sz={28} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{patient.patientName} <Bdg type="high" sm>{patient.badgeLabel}</Bdg></div>
                    <div style={{ fontSize: 11, color: C.kS }}>EDD {patient.eddLabel}{patient.label ? ` • ${patient.label}` : ''}</div>
                  </div>
                  <button style={S.btn('outline', true)} onClick={(event) => { event.stopPropagation(); if (onOpenPregnancyTracker) onOpenPregnancyTracker(patient.patientId, patient.id); else onOpenPatient(patient.patientId) }}>Open</button>
                </div>
              ))}
            </AsyncContent>
          </div>

          <div style={S.card()}>
            <CH title="Tests Awaiting Review" right={pendingTests.length > 0 ? <button style={S.btn('teal', true)} onClick={() => onOpenTestReview ? onOpenTestReview(pendingTests[0]?.patientId, pendingTests[0]?.id) : onOpenPatient(pendingTests[0]?.patientId)}>Open</button> : null} />
            <AsyncContent
              isEmpty={pendingTests.length === 0}
              emptyTitle="All reviewed"
              emptyMessage="Fresh uploaded results awaiting doctor review will appear here."
              compact
            >
              {pendingTests.slice(0, 4).map((test, index) => (
                <div key={test.id} onClick={() => onOpenPatient(test.patientId)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: index < Math.min(pendingTests.length, 4) - 1 ? `1px solid ${C.bd}` : 'none', cursor: 'pointer' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: C.tL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: C.t, fontWeight: 700 }}>T</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{test.patientName}</div>
                    <div style={{ fontSize: 11, color: C.kS }}>{test.label}</div>
                  </div>
                  <Bdg type={test.badgeType} sm>{test.statusLabel}</Bdg>
                  <button style={S.btn('outline', true)} onClick={(event) => { event.stopPropagation(); onOpenTestReview ? onOpenTestReview(test.patientId, test.id) : onOpenPatient(test.patientId) }}>Open</button>
                </div>
              ))}
            </AsyncContent>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={S.card()}>
          <CH title="Pregnancy Progress" right={<button style={S.btn('ghost', true)} onClick={() => highRiskPatients[0] ? onOpenPregnancyTracker?.(highRiskPatients[0].patientId, highRiskPatients[0].id) : goTo('cat-tracker')}>Tracker</button>} />
          <AsyncContent
            isEmpty={dashboard.placeholders.pregnancyProgress}
            emptyTitle="Pregnancy progress will expand later"
            emptyMessage="Use the high-risk list and patient hub for live pregnancy details in this batch."
            compact
          >
            <div />
          </AsyncContent>
        </div>

        <div style={S.card()}>
          <CH title="IVF Active Cycles" />
          <AsyncContent
            isEmpty={dashboard.placeholders.ivfPipeline}
            emptyTitle="IVF tracker is deferred"
            emptyMessage={`Dedicated IVF cycle tracking remains a controlled placeholder until the IVF phase starts. ${IVF_STAGES.length ? '' : ''}`}
            compact
          >
            <div />
          </AsyncContent>
        </div>

        <div style={S.card()}>
          <CH title="Recent Activity" />
          <AsyncContent
            isEmpty={recentActivity.length === 0}
            emptyTitle="No recent activity"
            emptyMessage="Recent clinical activity will appear here once live records are available."
            compact
          >
            <TL items={recentActivity} />
          </AsyncContent>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div style={S.card()}>
          <CH title="Operational Snapshot" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 9, marginBottom: 11 }}>
            {dashboard.snapshot.map((snapshot) => (
              <div key={snapshot.label} style={{ background: C.bg, borderRadius: 8, padding: '9px 11px' }}>
                <div style={{ fontSize: 11, color: C.kS, marginBottom: 2 }}>{snapshot.label}</div>
                <div style={{ fontFamily: 'Georgia,serif', fontSize: 19, fontWeight: 700, color: C.k }}>{snapshot.value}</div>
              </div>
            ))}
          </div>
          {dashboard.notes?.length ? (
            <div style={{ fontSize: 11, color: C.kS, lineHeight: 1.6 }}>{dashboard.notes[0]}</div>
          ) : null}
        </div>

        <div style={S.card()}>
          <CH title="Quick Actions" />
          {[
            { label: 'First Consultation', sub: 'Categorize new patient', page: 'first-consult', color: C.s },
            { label: 'Patient Hub', sub: 'Search and review records', page: 'patient-hub', color: C.t },
            { label: 'Prescription', sub: 'Prepare doctor Rx', page: 'prescription', color: C.p },
            { label: 'Test Reports', sub: 'Review pending results', page: 'test-reports', color: C.m },
            { label: 'Category Tracker', sub: 'Review category mix', page: 'cat-tracker', color: C.g },
          ].map((action, index, list) => (
            <div key={action.page} onClick={() => goTo(action.page)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: index < list.length - 1 ? `1px solid ${C.bd}` : 'none', cursor: 'pointer' }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: `${action.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: action.color }}>{action.label.slice(0, 2)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: action.color }}>{action.label}</div>
                <div style={{ fontSize: 11, color: C.kS }}>{action.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
