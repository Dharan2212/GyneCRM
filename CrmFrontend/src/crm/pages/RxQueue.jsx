import { C } from '../data.js'
import { S } from '../styles.js'
import { SC, PH, CH, Bdg, Av } from '../atoms.jsx'
import { AsyncContent, EmptyState, ErrorState, PageLoadingState } from '../../modules/shared/ui/state/index.js'

export default function RxQueue({ dashboard, isLoading, error, onRetry, goTo, onOpenAppointment }) {
  if (isLoading) {
    return <PageLoadingState title="Loading reception dashboard" message="Front-desk activity is being prepared." />
  }

  if (error) {
    return <ErrorState title="Unable to load reception dashboard" message={error?.message || 'Receptionist dashboard data could not be loaded.'} onRetry={onRetry} />
  }

  if (!dashboard) {
    return <EmptyState title="No dashboard data available" message="Reception dashboard information will appear here once the backend responds." />
  }

  const todayAppointments = dashboard.todayAppointments || []
  const doctorCoverage = dashboard.doctorCoverage || { items: [] }
  const waitlistSummary = dashboard.waitlistSummary || { waiting: 0, contacted: 0, converted: 0, total: 0 }
  const appointmentSummary = dashboard.appointmentSummary || { scheduled: 0, checkedIn: 0, completed: 0, cancelled: 0, noShow: 0 }
  const actionCards = dashboard.actionCards || []

  return (
    <div>
      <PH title="Reception Desk" icon="reception" sub={dashboard.header.subtitle} />

      <div style={{ background: C.tP, border: `1.5px solid ${C.tL}`, borderRadius: 10, padding: '10px 15px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, background: C.ok, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.t }}>{doctorCoverage.primaryDoctorLabel}</div>
          <div style={{ fontSize: 12, color: C.kS }}>{doctorCoverage.subtitle}</div>
        </div>
        <button style={S.btn('primary', true)} onClick={() => goTo('rx-register')}>+ New Patient</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 11, marginBottom: 14 }}>
        {dashboard.cards.map((card) => (
          <SC key={card.id} icon={card.icon} num={card.num} label={card.label} ac={card.ac} />
        ))}
      </div>

      <div style={{ ...S.card({ marginBottom: 14 }) }}>
        <CH title="Quick Actions" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
          {actionCards.map((action) => {
            const color = C[action.color] || C.t
            return (
              <div
                key={action.id}
                onClick={() => goTo(action.page)}
                style={{ background: C.w, border: `1.5px solid ${C.bd}`, borderRadius: 10, padding: '13px 10px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s', position: 'relative' }}
                onMouseEnter={(event) => { event.currentTarget.style.borderColor = color; event.currentTarget.style.background = `${color}10` }}
                onMouseLeave={(event) => { event.currentTarget.style.borderColor = C.bd; event.currentTarget.style.background = C.w }}
              >
                {action.deferred ? (
                  <div style={{ position: 'absolute', top: 6, right: 6 }}>
                    <Bdg type="pending" sm>Soon</Bdg>
                  </div>
                ) : null}
                <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 3 }}>{action.label}</div>
                <div style={{ fontSize: 11, color: C.kS }}>{action.sub}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
        <div style={S.card()}>
          <CH title="Patient Queue" right={<Bdg type={todayAppointments.length > 0 ? 'normal' : 'done'} sm>{todayAppointments.length} scheduled</Bdg>} />
          <AsyncContent
            isEmpty={todayAppointments.length === 0}
            emptyTitle="No appointments scheduled"
            emptyMessage="Today’s front-desk queue will appear here once appointments are available."
            compact
          >
            {todayAppointments.map((appointment, index) => (
              <div
                key={appointment.id}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: index < todayAppointments.length - 1 ? `1px solid ${C.bd}` : 'none', cursor: 'pointer' }}
                onClick={() => onOpenAppointment?.({ appointmentId: appointment.id, patientId: appointment.patientId })}
              >
                <Av i={appointment.initials} idx={appointment.avatarIndex} sz={28} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{appointment.patientName}</span>
                    {appointment.isFirstVisit ? <Bdg type="high" sm>First Visit</Bdg> : <Bdg type="done" sm>{appointment.visitTypeLabel}</Bdg>}
                  </div>
                  <div style={{ fontSize: 11, color: C.kS }}>{appointment.patientCode} • {appointment.phone}</div>
                  <div style={{ fontSize: 11, color: C.kS, marginTop: 2 }}>{appointment.timeLabel} • {appointment.doctorName}{appointment.doctorSpeciality ? ` • ${appointment.doctorSpeciality}` : ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Bdg type={appointment.statusBadgeType} sm>{appointment.statusLabel}</Bdg>
                  <div style={{ fontSize: 11, color: C.kS, marginTop: 4 }}>{appointment.appointmentTypeLabel}</div>
                </div>
              </div>
            ))}
          </AsyncContent>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div style={S.card()}>
            <CH title="Doctor Coverage" right={<button style={S.btn('primary', true)} onClick={() => goTo('rx-appointments')}>Open Desk</button>} />
            <AsyncContent
              isEmpty={!doctorCoverage.items.length}
              emptyTitle="No doctor schedule loaded"
              emptyMessage="Doctor-wise appointment allocation will appear here once today’s desk has appointments."
              compact
            >
              {doctorCoverage.items.slice(0, 4).map((doctor, index) => (
                <div key={doctor.doctorId || index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: index < Math.min(doctorCoverage.items.length, 4) - 1 ? `1px solid ${C.bd}` : 'none' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{doctor.fullName}</div>
                    <div style={{ fontSize: 11, color: C.kS }}>{doctor.speciality}</div>
                  </div>
                  <Bdg type="normal" sm>{doctor.count} slots</Bdg>
                </div>
              ))}
            </AsyncContent>
          </div>

          <div style={S.card()}>
            <CH title="Operational Snapshot" right={<Bdg type={waitlistSummary.total > 0 ? 'wait' : 'done'} sm>{waitlistSummary.total} waitlist</Bdg>} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 10 }}>
              <div style={{ background: C.bg, borderRadius: 8, padding: '9px 11px' }}>
                <div style={{ fontSize: 11, color: C.kS }}>Scheduled</div>
                <div style={{ fontWeight: 700, color: C.k }}>{appointmentSummary.scheduled}</div>
              </div>
              <div style={{ background: C.bg, borderRadius: 8, padding: '9px 11px' }}>
                <div style={{ fontSize: 11, color: C.kS }}>Checked In</div>
                <div style={{ fontWeight: 700, color: C.k }}>{appointmentSummary.checkedIn}</div>
              </div>
              <div style={{ background: C.bg, borderRadius: 8, padding: '9px 11px' }}>
                <div style={{ fontSize: 11, color: C.kS }}>Completed</div>
                <div style={{ fontWeight: 700, color: C.k }}>{appointmentSummary.completed}</div>
              </div>
              <div style={{ background: C.bg, borderRadius: 8, padding: '9px 11px' }}>
                <div style={{ fontSize: 11, color: C.kS }}>No Show / Cancelled</div>
                <div style={{ fontWeight: 700, color: C.k }}>{appointmentSummary.noShow + appointmentSummary.cancelled}</div>
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${C.bd}`, paddingTop: 10, fontSize: 11, color: C.kS, lineHeight: 1.6 }}>
              Upload Report and Billing remain live desk actions through their dedicated pages. Dashboard counts for those areas are intentionally not faked here because this endpoint does not supply safe workflow totals yet.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
