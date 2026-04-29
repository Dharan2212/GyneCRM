import { C } from '../data.js'
import { S } from '../styles.js'
import { SC, PH, CH, Bars } from '../atoms.jsx'

export default function Analytics({ patients }) {
  const preg  = patients.filter(p => p.cat === "Pregnancy")
  const ivf   = patients.filter(p => p.cat === "Infertility")
  const gynac = patients.filter(p => p.cat === "Gynac")
  const allT  = patients.flatMap(p => p.tests || [])

  return (
    <div>
      <PH title="Analytics and Reports" sub="March 2026 - Performance dashboard"
        actions={<>
          <button style={S.btn("ghost", true)}>Export PDF</button>
          <button style={S.btn("primary", true)}>Custom Report</button>
        </>} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 11, marginBottom: 18 }}>
        <SC icon="All"  num={patients.length} label="Total Patients"  trend="Up 18%" up ac="m" />
        <SC icon="Preg" num={preg.length}      label="Pregnancies"     ac="t" />
        <SC icon="IVF"  num={ivf.length}       label="IVF Patients"    ac="p" />
        <SC icon="Gyn"  num={gynac.length}     label="Gynac Patients"  ac="m" />
        <SC icon="Rs"   num="Rs 4.2L"          label="Revenue (Mar)"   trend="Up 12%" up ac="s" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={S.card()}>
          <CH title="Daily Appointments" />
          <Bars data={[{h:55,l:"Mon"},{h:70,l:"Tue"},{h:45,l:"Wed"},{h:85,l:"Thu"},{h:60,l:"Fri"},{h:30,l:"Sat"},{h:20,l:"Today"}]} ac={C.m} />
        </div>
        <div style={S.card()}>
          <CH title="Monthly Revenue (Rs L)" />
          <Bars data={[{h:42,l:"Sep"},{h:55,l:"Oct"},{h:50,l:"Nov"},{h:48,l:"Dec"},{h:60,l:"Jan"},{h:72,l:"Feb"},{h:85,l:"Mar"}]} ac={C.s} />
        </div>
        <div style={S.card()}>
          <CH title="Patient Mix" />
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 65, marginTop: 9 }}>
            {[
              { l: "Preg",  v: Math.round(preg.length / patients.length * 100),  cc: C.t },
              { l: "IVF",   v: Math.round(ivf.length / patients.length * 100),   cc: C.p },
              { l: "Gynac", v: Math.round(gynac.length / patients.length * 100), cc: C.m },
              { l: "New",   v: Math.round(patients.filter(p => !p.cat).length / patients.length * 100), cc: C.wn },
            ].map((b, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: b.cc }}>{b.v}%</div>
                <div style={{ width: "100%", borderRadius: "3px 3px 0 0", height: Math.max(b.v, 4) + "px", background: `linear-gradient(180deg,${b.cc}40,${b.cc})` }} />
                <div style={{ fontSize: 10, color: C.kS }}>{b.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={S.card()}>
          <CH title="Test Report Status" />
          {[
            { l: "Ordered - Pending Upload",   n: allT.filter(t => t.status === "ordered").length,      cc: C.wn, bg: C.wnL },
            { l: "Uploaded - Awaiting Review", n: allT.filter(t => t.status === "uploaded").length,     cc: C.t,  bg: C.tL },
            { l: "Reviewed by Doctor",         n: allT.filter(t => t.status === "reviewed").length,     cc: C.ok, bg: C.okL },
            { l: "Sent to Patient",            n: allT.filter(t => t.sentToPatient).length,             cc: C.p,  bg: C.pL },
          ].map((sc, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 3 ? "1px solid " + C.bd : "none" }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: sc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: sc.cc }}>{sc.n}</div>
              <div style={{ flex: 1, fontSize: 13 }}>{sc.l}</div>
              <div style={{ width: 80, height: 5, background: C.bd, borderRadius: 20, overflow: "hidden" }}>
                <div style={{ height: "100%", background: sc.cc, borderRadius: 20, width: Math.max((sc.n / (allT.length || 1)) * 100, 4) + "%" }} />
              </div>
            </div>
          ))}
        </div>

        <div style={S.card()}>
          <CH title="Monthly Performance" />
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Metric","March","Feb","Change"].map(h => (
                  <th key={h} style={{ fontSize: 10, textTransform: "uppercase", color: C.kS, padding: "6px 8px", borderBottom: "2px solid " + C.bd, textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Appointments","147","124","Up 18.5%",true],
                ["WhatsApp Sent","835","612","Up 36%",true],
                ["Reports Sent","" + allT.filter(t => t.sentToPatient).length,"—","New",null],
                ["Missed Appts","9","14","Down 35%",true],
                ["Revenue","Rs 3.6L","Rs 3.1L","Up 16%",true],
              ].map(([m, c, prev, ch, up2], i) => (
                <tr key={i}
                  onMouseEnter={e => e.currentTarget.querySelectorAll("td").forEach(td => td.style.background = C.mP)}
                  onMouseLeave={e => e.currentTarget.querySelectorAll("td").forEach(td => td.style.background = "")}>
                  <td style={{ padding: "8px", fontSize: 12, fontWeight: 500 }}>{m}</td>
                  <td style={{ padding: "8px", fontSize: 12, fontWeight: 700 }}>{c}</td>
                  <td style={{ padding: "8px", fontSize: 12, color: C.kS }}>{prev}</td>
                  <td style={{ padding: "8px", fontSize: 12, fontWeight: 600, color: up2 === true ? C.ok : up2 === false ? C.er : C.kS }}>{ch}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
