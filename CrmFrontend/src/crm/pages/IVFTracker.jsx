import { useState } from 'react'
import { C, IVF_STAGES } from '../data.js'
import { S } from '../styles.js'
import { PH, CH, PBar, Bdg, Av, Bars } from '../atoms.jsx'

export default function IVFTracker({ patients, onSel, goTo }) {
  const ivfPts = patients.filter(p => p.cat === "Infertility")
  const [sel, setSel] = useState(ivfPts[0])
  const si = IVF_STAGES.indexOf(sel?.ivfStage || "Stimulation")

  return (
    <div>
      <PH title="IVF Tracker" sub="Infertility - Cycle monitoring - Follicle tracking" />

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {ivfPts.map((p, i) => (
          <div key={i} onClick={() => setSel(p)}
            style={{ ...S.card({ padding: "10px 14px", cursor: "pointer", border: "1.5px solid " + (sel?.id === p.id ? C.p : C.bd), background: sel?.id === p.id ? C.pP : C.w }), display: "flex", alignItems: "center", gap: 8, minWidth: 190, transition: "all .2s" }}>
            <Av i={p.av} idx={p.avI} sz={30} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: C.kS }}>Cycle {p.ivfCycleNum} - {p.ivfStage}</div>
            </div>
            <Bdg type="ivf" sm>Active</Bdg>
          </div>
        ))}
      </div>

      {sel && (
        <>
          <div style={{ ...S.card(), marginBottom: 16 }}>
            <CH title={sel.name + " - Cycle " + sel.ivfCycleNum + " Progress"}
              right={<button style={S.btn("ghost", true)} onClick={() => { onSel(sel); goTo("consultation") }}>Consultation</button>} />
            <div style={{ display: "flex", gap: 0, marginBottom: 7, overflowX: "auto" }}>
              {IVF_STAGES.map((stage, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center", padding: "8px 3px", borderBottom: "3px solid " + (i <= si ? C.p : C.bd), minWidth: 68 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: i === si ? C.p : "#fff", background: i < si ? C.ok : i === si ? C.p : C.bd, width: 20, height: 20, borderRadius: "50%", margin: "0 auto 4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {i < si ? "v" : i + 1}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: i === si ? 700 : 400, color: i <= si ? C.p : C.kS, lineHeight: 1.2 }}>{stage}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.kS }}>
              <span>Started: {sel.ivfCycleStart}</span>
              <span style={{ color: C.p, fontWeight: 600 }}>Stage {si + 1}/{IVF_STAGES.length} - {sel.ivfStage}</span>
              <span>Transfer: ~{(sel.ivfDates || [])[7]?.date || "TBD"}</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
            <div style={S.card()}>
              <CH title="Cycle Timeline - Calculated Dates" />
              {(sel.ivfDates || []).map((sc, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6, padding: "8px 10px", borderRadius: 8, background: sc.past ? C.okL + "80" : C.bg, border: "1.5px solid " + (sc.past ? C.ok : C.bd) }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: sc.past ? C.ok : C.bd, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                    {sc.past ? "v" : sc.d}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.kS }}>Day {sc.d}</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{sc.t}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: sc.past ? C.ok : C.p, background: sc.past ? C.okL : C.pL, padding: "3px 8px", borderRadius: 6, alignSelf: "center", whiteSpace: "nowrap" }}>
                    {sc.date}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <div style={S.card()}>
                <CH title="Follicle Monitoring - Day 8" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                  {[{ side: "Right", sizes: [18,16,15,14,12] }, { side: "Left", sizes: [17,15,14,13,11] }].map((o, si2) => (
                    <div key={si2} style={{ background: C.pP, border: "1.5px solid " + C.pL, borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.p, marginBottom: 6 }}>{o.side} Ovary</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
                        {o.sizes.map((sz, i) => (
                          <div key={i} style={{ width: Math.min(34, Math.max(22, sz * 1.4)), height: Math.min(34, Math.max(22, sz * 1.4)), borderRadius: "50%", background: `linear-gradient(135deg,${C.pL},${C.p})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>
                            {sz}
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 10, color: C.kS, marginTop: 6 }}>{o.sizes.length} follicles</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {[["E2","1,840 pg/mL"],["LH","2.1 IU/L"],["Total","11 follicles"],["Ready (14mm+)","6"]].map(([k, vl]) => (
                    <div key={k} style={{ background: C.bg, borderRadius: 6, padding: "6px 8px", display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: C.kS }}>{k}</span>
                      <span style={{ fontWeight: 700, color: C.p }}>{vl}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={S.card()}>
                <CH title="E2 Trend (pg/mL)" />
                <Bars data={[{h:15,l:"D1"},{h:30,l:"D3"},{h:52,l:"D6"},{h:65,l:"D8"}]} ac={C.p} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.kS, marginTop: 3 }}>
                  <span>D1: 45</span><span>D3: 180</span><span>D6: 620</span>
                  <span style={{ color: C.p, fontWeight: 700 }}>D8: 1,840</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
