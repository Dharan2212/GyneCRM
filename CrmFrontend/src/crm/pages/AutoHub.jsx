import { useState } from 'react'
import { C, CAT, WORKFLOWS } from '../data.js'
import { S } from '../styles.js'
import { SC, PH } from '../atoms.jsx'

export default function AutoHub() {
  const [wf, setWf] = useState(WORKFLOWS)
  const [catF, setCatF] = useState("All")
  const shown = wf.filter(w => catF === "All" || w.cat === catF || w.cat === "All")
  const CC = { All: C.m, Pregnancy: C.t, Infertility: C.p, Gynac: C.m }

  return (
    <div>
      <PH title="Automation Hub"
        sub="13 N8N workflows - WhatsApp Cloud API - Category-specific triggers"
        actions={<>
          <button style={S.btn("ghost", true)}>Delivery Logs</button>
          <button style={S.btn("teal", true)}>+ New Workflow</button>
        </>} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 11, marginBottom: 16 }}>
        <SC icon="On"  num={wf.filter(w => w.on).length} label="Active Workflows" ac="ok" />
        <SC icon="Msg" num="835"                          label="Sent This Month"  ac="t" />
        <SC icon="%"   num="96.2%"                        label="Delivery Rate"    ac="m" />
        <SC icon="T"   num="2.4s"                         label="Avg Send Time"    ac="g" />
      </div>

      <div style={{ display: "flex", gap: 7, marginBottom: 13, flexWrap: "wrap" }}>
        {["All","Pregnancy","Infertility","Gynac"].map(cc => (
          <button key={cc} onClick={() => setCatF(cc)}
            style={{ ...S.btn(catF === cc ? "primary" : "ghost", true), background: catF === cc ? (CC[cc] || C.m) : C.bg, color: catF === cc ? "#fff" : C.kB }}>
            {cc === "All" ? "All Workflows" : CAT[cc]?.label || cc}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
        {shown.map((w, i) => {
          const idx = wf.findIndex(x => x.name === w.name)
          return (
            <div key={i} style={{ ...S.card(), display: "flex", alignItems: "flex-start", gap: 11 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: (CC[w.cat] || C.m) + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: CC[w.cat] || C.m, flexShrink: 0 }}>
                {w.cat.slice(0, 3)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{w.name}</div>
                  <span style={{ background: (CC[w.cat] || C.m) + "20", color: CC[w.cat] || C.m, fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 9 }}>{w.cat}</span>
                </div>
                <div style={{ fontSize: 11, color: C.kS, marginBottom: 4 }}>{w.desc}</div>
                <div style={{ fontSize: 11, color: C.kS }}>Sent: <strong style={{ color: C.k }}>{w.sent}</strong></div>
              </div>
              <div onClick={() => setWf(p => p.map((x, j) => j === idx ? { ...x, on: !x.on } : x))}
                style={{ width: 36, height: 20, background: w.on ? C.ok : C.bd, borderRadius: 20, position: "relative", cursor: "pointer", flexShrink: 0, transition: "background .2s", marginTop: 4 }}>
                <div style={{ position: "absolute", width: 14, height: 14, background: C.w, borderRadius: "50%", top: 3, [w.on ? "right" : "left"]: 3, transition: "all .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
