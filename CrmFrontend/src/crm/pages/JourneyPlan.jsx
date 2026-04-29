import { C, CAT, calcPreg, calcIVF, calcGynac } from '../data.js'
import { S } from '../styles.js'
import { PH, Sep } from '../atoms.jsx'

export default function JourneyPlan({ patient }) {
  const p = patient
  const cat = p?.cat
  const cm = cat ? CAT[cat] : null
  let phases = []

  if (cat === "Pregnancy" && p.lmp) {
    const pd = p.pregnancyDates || calcPreg(p.lmp)
    phases = [
      { name: "First Trimester (Wks 4-12)", color: C.t, items: pd.ms.filter(m => m.w <= 12).map(m => ({ when: "Wk " + m.w, type: m.w === 10 ? "Test" : "Visit", desc: m.w <= 8 ? "First OPD - Dating scan - CBC, TSH, HIV, HBsAg" : m.w === 10 ? "NT Scan + Double Marker" : "Review NT results - Progesterone", date: m.date, past: m.past })) },
      { name: "Second Trimester (Wks 13-27)", color: C.g, items: pd.ms.filter(m => m.w > 12 && m.w < 28).map(m => ({ when: "Wk " + m.w, type: m.w === 20 ? "Test" : "Visit", desc: m.w === 16 ? "Routine OPD - Weight and BP" : m.w === 20 ? "Anomaly Scan (Level II)" : m.w === 24 ? "Growth scan - GDM screening" : "75g GTT - CBC", date: m.date, past: m.past })) },
      { name: "Third Trimester (Wks 28-40)", color: C.m, items: pd.ms.filter(m => m.w >= 28).map(m => ({ when: "Wk " + m.w, type: m.w === 32 ? "Test" : "Visit", desc: m.w === 28 ? "Review GTT - Doppler - Delivery planning" : m.w === 32 ? "Growth + Doppler scan" : m.w === 36 ? "Weekly NST - Delivery prep" : "Weekly OPD - Induction/LSCS plan", date: m.date, past: m.past })) },
    ]
  } else if (cat === "Infertility" && p.ivfCycleStart) {
    const d = calcIVF(p.ivfCycleStart)
    phases = [
      { name: "Stimulation Phase",        color: C.p,  items: d.slice(0, 4).map(sc => ({ when: "Day " + sc.d, type: "Visit",     desc: sc.t, date: sc.date, past: sc.past })) },
      { name: "Retrieval and Transfer",   color: C.s,  items: d.slice(4, 8).map(sc => ({ when: "Day " + sc.d, type: "Procedure", desc: sc.t, date: sc.date, past: sc.past })) },
      { name: "Two-Week Wait and Result", color: C.ok, items: d.slice(8).map(sc =>    ({ when: "Day " + sc.d, type: "Test",      desc: sc.t, date: sc.date, past: sc.past })) },
    ]
  } else if (cat === "Gynac" && p.firstVisitDate) {
    const d = calcGynac(p.firstVisitDate)
    phases = [
      { name: "Diagnosis and Workup", color: C.m, items: d.slice(0, 2).map((sc, i) => ({ when: ["Day 1","Day 14"][i],    type: "Visit", desc: sc.t, date: sc.date, past: sc.past })) },
      { name: "Treatment Phase",      color: C.g, items: d.slice(2, 4).map((sc, i) => ({ when: ["Month 1","Month 3"][i], type: "Visit", desc: sc.t, date: sc.date, past: sc.past })) },
      { name: "Follow-up",            color: C.t, items: d.slice(4).map((sc, i) =>    ({ when: ["6 Months","Yearly"][i], type: "Visit", desc: sc.t, date: sc.date, past: sc.past })) },
    ]
  }

  const TC = { Visit: C.t, Test: C.s, Procedure: C.m }

  if (!cat) return (
    <div style={{ ...S.card(), textAlign: "center", padding: 50, color: C.kS }}>
      <div style={{ fontFamily: "Georgia,serif", fontSize: 18, color: C.k, marginBottom: 8 }}>Category Not Assigned Yet</div>
      <div style={{ fontSize: 12 }}>Complete First Consultation to generate a journey plan with calculated dates.</div>
    </div>
  )

  return (
    <div>
      <PH title="Patient Journey Plan"
        sub={(p?.name || "") + " - " + (p?.id || "") + " - " + cat + " - Dates auto-calculated"}
        actions={<>
          <button style={S.btn("ghost", true)}>Print</button>
          <button style={S.btn("teal", true)}>WhatsApp to Patient</button>
        </>} />

      <div style={{ ...S.card(), maxWidth: 800, margin: "0 auto" }}>
        <div style={{ background: cm.grad, borderRadius: 9, padding: "15px 18px", color: "#fff", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ width: 32, height: 32, background: "rgba(255,255,255,.18)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia,serif", fontSize: 14, color: "#fff", fontWeight: 700, marginBottom: 6 }}>J</div>
            <div style={{ fontFamily: "Georgia,serif", fontSize: 17, fontWeight: 700 }}>Jijau Hospital</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.75)" }}>Dr. Monica Pawar - MBBS, MD Gynecology - Reg: MH-GYN-7821</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{cat} Care Journey Plan</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.8)", marginTop: 2 }}>Patient: {p?.name} - {p?.id}</div>
            {cat === "Pregnancy" && p?.pregnancyDates && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.8)", marginTop: 1 }}>LMP: {p.lmp} - EDD: {p.pregnancyDates.edd} - Wk {p.pregnancyDates.wks}+{p.pregnancyDates.dr}</div>
            )}
            {cat === "Infertility" && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.8)", marginTop: 1 }}>Cycle Start: {p?.ivfCycleStart} - Cycle {p?.ivfCycleNum}</div>
            )}
          </div>
        </div>

        {phases.map((phase, pi) => (
          <div key={pi} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11 }}>
              <div style={{ width: 3, height: 20, background: phase.color, borderRadius: 4 }} />
              <div style={{ fontFamily: "Georgia,serif", fontSize: 13, fontWeight: 700, color: phase.color }}>{phase.name}</div>
            </div>
            {phase.items.map((item, ii) => (
              <div key={ii} style={{ display: "flex", gap: 9, marginBottom: 7, alignItems: "flex-start", opacity: item.past ? 0.8 : 1 }}>
                <div style={{ minWidth: 62, background: TC[item.type] || C.t, color: "#fff", fontSize: 10, fontWeight: 700, padding: "4px 6px", borderRadius: 6, textAlign: "center", lineHeight: 1.3 }}>{item.when}</div>
                <div style={{ flex: 1, background: item.past ? C.bg : C.w, borderRadius: 7, padding: "8px 12px", border: "1.5px solid " + (item.past ? C.bd : (TC[item.type] || C.t) + "20") }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: TC[item.type] || C.t, textTransform: "uppercase", marginBottom: 3 }}>{item.type}{item.past ? " - Done" : ""}</div>
                      <div style={{ fontSize: 12, color: C.k, lineHeight: 1.4 }}>{item.desc}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: item.past ? C.kS : phase.color, background: item.past ? C.bd : phase.color + "18", padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>{item.date}</div>
                      <input type="date" style={{ ...S.inp, fontSize: 10, padding: "3px 6px", width: 115, marginTop: 4 }} placeholder="Actual date" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

        <Sep />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.kS }}>
          <div>Jijau Hospital - Latur - +91 98765 43210</div>
          <div style={{ fontWeight: 700, color: C.m }}>Dr. Monica Pawar</div>
        </div>
      </div>
    </div>
  )
}
