import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, INIT_PATIENTS, calcPreg, calcIVF, calcGynac } from './data.js'
import Topbar from './layout/Topbar.jsx'
import Sidebar from './layout/Sidebar.jsx'
import { useAuth } from '../modules/auth/AuthContext.jsx'

// Doctor pages
import DocDash from './pages/DocDash.jsx'
import PatientHub from './pages/PatientHub.jsx'
import FirstConsult from './pages/FirstConsult.jsx'
import Consult from './pages/Consult.jsx'
import JourneyPlan from './pages/JourneyPlan.jsx'
import TestReports from './pages/TestReports.jsx'
import Prescription from './pages/Prescription.jsx'
import CatTracker from './pages/CatTracker.jsx'
import IVFTracker from './pages/IVFTracker.jsx'
import Analytics from './pages/Analytics.jsx'
import AutoHub from './pages/AutoHub.jsx'
import Billing from './pages/Billing.jsx'

// Receptionist pages
import RxQueue from './pages/RxQueue.jsx'
import RxRegister from './pages/RxRegister.jsx'
import RxUpload from './pages/RxUpload.jsx'
import { RxAppointments, RxMessages, AppointmentsPlaceholder } from './pages/Placeholders.jsx'

export default function JijauCRM({ fixedRole = 'doctor' }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const resolvedRole = fixedRole === 'receptionist' ? 'receptionist' : 'doctor'

  const [role, setRole] = useState(resolvedRole)
  const [page, setPage] = useState(resolvedRole === 'doctor' ? 'doc-dash' : 'rx-queue')
  const [patients, setPatients] = useState(INIT_PATIENTS)
  const [sel, setSel] = useState(INIT_PATIENTS[1])

  useEffect(() => {
    setRole(resolvedRole)
    setPage(resolvedRole === 'doctor' ? 'doc-dash' : 'rx-queue')
  }, [resolvedRole])

  const handleLogout = useCallback(async () => {
    await logout()
    navigate('/crm/login', { replace: true })
  }, [logout, navigate])

  const handleChangePassword = useCallback(() => {
    navigate('/crm/change-password')
  }, [navigate])

  const syncedPt = useMemo(
    () => patients.find((p) => p.id === sel?.id) || sel,
    [patients, sel],
  )

  const addPt = useCallback((p) => {
    setPatients((prev) => [...prev, p])
    setSel(p)
  }, [])

  const catPt = useCallback((pid, cat, hist, vit) => {
    setPatients((prev) => prev.map((p) => {
      if (p.id !== pid) return p
      const base = { ...p, status: 'active', cat }

      if (cat === 'Pregnancy') {
        base.lmp = hist.lmp
        base.gpa = hist.gpa
        base.highRisk = hist.highRisk
        if (hist.lmp) base.pregnancyDates = calcPreg(hist.lmp)
      } else if (cat === 'Infertility') {
        base.ivfCycleStart = hist.ivfStart || new Date().toISOString().split('T')[0]
        base.ivfCycleNum = +hist.ivfCycleNum || 1
        base.ivfStage = 'Stimulation'
        base.ivfDates = calcIVF(base.ivfCycleStart)
      } else if (cat === 'Gynac') {
        base.complaint = hist.diagnosis || 'Under evaluation'
        base.gynacDates = calcGynac(p.firstVisitDate)
      }

      base.consultations = [{
        date: new Date().toISOString().split('T')[0],
        bp: vit?.bp || '',
        weight: vit?.weight || '',
        notes: `First consultation. Category: ${cat}. ${hist.complaint || ''}`,
        rx: [],
      }]

      return base
    }))
  }, [])

  const upd = useCallback((pid, action, payload) => {
    setPatients((prev) => prev.map((p) => {
      if (p.id !== pid) return p

      if (action === 'addTest') {
        return { ...p, tests: [...(p.tests || []), payload] }
      }

      if (action === 'updateTest') {
        return {
          ...p,
          tests: (p.tests || []).map((t) => (t.id === payload.id ? { ...t, ...payload } : t)),
        }
      }

      if (action === 'addConsultation') {
        return { ...p, consultations: [...(p.consultations || []), payload] }
      }

      return p
    }))
  }, [])

  const newC = patients.filter((p) => p.status === 'new').length
  const revC = patients.flatMap((p) => (p.tests || []).filter((t) => t.status === 'uploaded')).length
  const upC = patients.flatMap((p) => (p.tests || []).filter((t) => t.status === 'ordered')).length

  const docNav = [
    { label: 'Overview', items: [
      { id: 'doc-dash', icon: '>', label: 'Dashboard', badge: newC > 0 ? newC : null },
    ] },
    { label: 'Patient Flow', items: [
      { id: 'patient-hub', icon: '#', label: 'Patient Hub' },
      { id: 'first-consult', icon: 'N', label: 'First Consultation', badge: newC > 0 ? newC : null, bw: true },
      { id: 'consultation', icon: '~', label: 'Follow-up Consult' },
      { id: 'journey-plan', icon: 'J', label: 'Journey Plan' },
      { id: 'test-reports', icon: 'T', label: 'Test Reports', badge: revC > 0 ? revC : null, bw: true },
      { id: 'prescription', icon: 'R', label: 'Prescription' },
    ] },
    { label: 'Trackers', items: [
      { id: 'cat-tracker', icon: 'C', label: 'Category Tracker' },
      { id: 'ivf-tracker', icon: 'I', label: 'IVF Tracker' },
    ] },
    { label: 'Insights', items: [
      { id: 'analytics', icon: 'A', label: 'Analytics' },
      { id: 'automation', icon: '*', label: 'Automation Hub' },
    ] },
    { label: 'Finance', items: [
      { id: 'billing', icon: '$', label: 'Billing', bw: true },
    ] },
  ]

  const rxNav = [
    { label: 'Main', items: [
      { id: 'rx-queue', icon: '>', label: 'Reception Desk' },
      { id: 'rx-register', icon: '+', label: 'Register New Patient' },
    ] },
    { label: 'Actions', items: [
      { id: 'rx-appointments', icon: '@', label: 'Appointments' },
      { id: 'rx-upload', icon: '^', label: 'Upload Test Report', badge: upC > 0 ? upC : null, bw: true },
    ] },
    { label: 'Finance', items: [
      { id: 'rx-billing', icon: '$', label: 'Billing', bw: true },
      { id: 'rx-messages', icon: '~', label: 'WhatsApp Reminders' },
    ] },
  ]

  const docPages = {
    'doc-dash': <DocDash patients={patients} onSel={setSel} goTo={setPage} />,
    'patient-hub': <PatientHub patients={patients} onSel={setSel} goTo={setPage} />,
    'first-consult': <FirstConsult patient={syncedPt} onCat={catPt} goTo={setPage} />,
    consultation: <Consult patient={syncedPt} onUpdate={upd} goTo={setPage} />,
    'journey-plan': <JourneyPlan patient={syncedPt} />,
    'test-reports': <TestReports patient={syncedPt} patients={patients} onUpdate={upd} onSel={setSel} />,
    prescription: <Prescription patient={syncedPt} />,
    'cat-tracker': <CatTracker patients={patients} onSel={setSel} goTo={setPage} />,
    'ivf-tracker': <IVFTracker patients={patients} onSel={setSel} goTo={setPage} />,
    analytics: <Analytics patients={patients} />,
    automation: <AutoHub />,
    billing: <Billing patients={patients} />,
    appointments: <AppointmentsPlaceholder />,
  }

  const rxPages = {
    'rx-queue': <RxQueue patients={patients} goTo={setPage} onSel={setSel} />,
    'rx-register': <RxRegister onSave={addPt} goTo={setPage} />,
    'rx-upload': <RxUpload patients={patients} onUpdate={upd} />,
    'rx-billing': <Billing patients={patients} />,
    'rx-appointments': <RxAppointments />,
    'rx-messages': <RxMessages />,
  }

  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", background: C.bg, minHeight: '100vh', color: C.k }}>
      <Topbar
        role={role}
        user={user}
        onLogout={handleLogout}
        onChangePassword={handleChangePassword}
      />

      <div style={{ display: 'flex' }}>
        <Sidebar nav={role === 'doctor' ? docNav : rxNav} active={page} onNav={setPage} />
        <div
          key={page}
          style={{
            flex: 1,
            padding: 24,
            minHeight: 'calc(100vh - 58px)',
            overflowX: 'hidden',
            animation: 'rise .2s ease',
          }}
        >
          {role === 'doctor'
            ? (docPages[page] || docPages['doc-dash'])
            : (rxPages[page] || rxPages['rx-queue'])}
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: ${C.bd}; border-radius: 3px; }
        @keyframes rise { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        input, select, textarea, button { font-family: inherit; }
        button:disabled { opacity: .5; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
