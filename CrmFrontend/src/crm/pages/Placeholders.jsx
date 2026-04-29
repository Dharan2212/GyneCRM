import { C } from '../data.js'
import { S } from '../styles.js'
import RxAppointmentsReal from './RxAppointments.jsx'

export function RxAppointments(props) {
  return <RxAppointmentsReal {...props} />
}

export function RxMessages() {
  return (
    <div style={{ ...S.card(), textAlign: 'center', padding: 50, color: C.kS }}>
      <div style={{ fontFamily: 'Georgia,serif', fontSize: 18, color: C.k, marginBottom: 8 }}>WhatsApp Reminders</div>
      <div style={{ fontSize: 12 }}>Send reminders to patients.</div>
    </div>
  )
}

export function AppointmentsPlaceholder() {
  return (
    <div style={{ ...S.card(), textAlign: 'center', padding: 50, color: C.kS }}>
      <div style={{ fontFamily: 'Georgia,serif', fontSize: 18, color: C.k, marginBottom: 8 }}>Appointments Calendar</div>
      <div style={{ fontSize: 12 }}>Full calendar with OPD slots and reschedule logic.</div>
    </div>
  )
}
