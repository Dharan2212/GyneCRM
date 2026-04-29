import { C, CAT } from './data.js'
import { S } from './styles.js'
import { Icon, IconBadge } from '../modules/shared/ui/icons.jsx'

export const Bdg = ({ type, sm, children }) => {
  const M = {
    wait: { bg: '#FEF3C7', fg: '#92400E' },
    done: { bg: C.okL, fg: C.ok },
    high: { bg: C.erL, fg: C.er },
    critical: { bg: C.erL, fg: C.er },
    paid: { bg: C.okL, fg: C.ok },
    pending: { bg: C.wnL, fg: C.wn },
    partial: { bg: '#FEF3C7', fg: '#92400E' },
    normal: { bg: C.tL, fg: C.t },
    ivf: { bg: C.pL, fg: C.p },
    uploaded: { bg: C.tL, fg: C.t },
    reviewed: { bg: C.okL, fg: C.ok },
    issued: { bg: C.tL, fg: C.t },
    finalised: { bg: C.okL, fg: C.ok },
    cancelled: { bg: C.erL, fg: C.er },
    'sent-to-patient': { bg: C.pL, fg: C.p },
    ordered: { bg: C.wnL, fg: C.wn },
    uncategorized: { bg: '#F3F4F6', fg: '#6B7280' },
  }
  const b = M[type] || M.normal
  return (
    <span
      style={{
        background: b.bg,
        color: b.fg,
        padding: sm ? '3px 8px' : '4px 10px',
        borderRadius: 999,
        minHeight: sm ? 20 : 22,
        fontSize: sm ? 10 : 11,
        fontWeight: 700,
        letterSpacing: '.01em',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  )
}

export const Av = ({ i, idx, sz = 34 }) => {
  const G = [
    'linear-gradient(135deg,#E8748A,#7B1F3A)',
    'linear-gradient(135deg,#4A9B9B,#1A6B6B)',
    'linear-gradient(135deg,#E8A44A,#C06820)',
    'linear-gradient(135deg,#9B59B6,#6C3483)',
    'linear-gradient(135deg,#3498DB,#1A5276)',
  ]
  return (
    <div
      style={{
        width: sz,
        height: sz,
        borderRadius: '50%',
        background: G[idx % 5],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: sz * 0.34,
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
        boxShadow: '0 8px 18px rgba(26,24,40,.12)',
      }}
    >
      {i}
    </div>
  )
}

export const CatBdg = ({ cat }) => {
  if (!cat) return <Bdg type="uncategorized">New</Bdg>
  const m = CAT[cat]
  return (
    <span
      style={{
        background: m.l,
        color: m.c,
        fontSize: 11,
        fontWeight: 700,
        padding: '4px 10px',
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        lineHeight: 1,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.c, opacity: 0.8 }} />
      {m.label}
    </span>
  )
}

export const Sep = () => <div style={{ height: 1, background: C.bd, margin: '16px 0' }} />

export const FG = ({ label, req, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
    <label style={{ fontSize: 10, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.08em', lineHeight: 1.4 }}>
      {label}
      {req && <span style={{ color: C.er }}> *</span>}
    </label>
    {children}
  </div>
)

export const Inp = (p) => <input style={S.inp} {...p} />
export const Sel = ({ opts, ...p }) => (
  <select style={S.inp} {...p}>
    {opts.map((o, i) => (
      <option key={i} value={o.v != null ? o.v : o}>{o.l != null ? o.l : o}</option>
    ))}
  </select>
)
export const TA = (p) => <textarea style={{ ...S.inp, minHeight: 88, resize: 'vertical' }} {...p} />

export const PH = ({ title, sub, actions, icon }) => (
  <div
    style={{
      marginBottom: 22,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 14,
      flexWrap: 'wrap',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      {icon ? <IconBadge name={icon} tone="brand" size={18} style={{ borderRadius: 14 }} /> : null}
      <div>
        <h1 style={S.title}>{title}</h1>
        {sub ? <p style={S.subtitle}>{sub}</p> : null}
      </div>
    </div>
    {actions ? <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>{actions}</div> : null}
  </div>
)

export const CH = ({ title, right, icon, subtitle }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      {icon ? <Icon name={icon} size={16} color={C.kS} /> : null}
      <div style={S.cardTitle}>{title}</div>
    </div>
    {right && <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>{right}</div>}
  </div>
)

export const PBar = ({ pct, color = C.t, light = C.tL }) => (
  <div style={{ height: 6, background: C.bd, borderRadius: 999, overflow: 'hidden', marginTop: 6 }}>
    <div
      style={{
        height: '100%',
        borderRadius: 999,
        width: `${Math.min(pct, 100)}%`,
        background: `linear-gradient(90deg,${light},${color})`,
        transition: 'width .6s',
      }}
    />
  </div>
)

export const SC = ({ icon, num, label, ac, trend, up }) => {
  const A = { m: C.m, t: C.t, s: C.s, g: C.g, ok: C.ok, p: C.p, wn: C.wn }
  const tone = ac === 'wn' ? 'warn' : ac === 'ok' ? 'ok' : ac === 't' ? 'teal' : 'brand'
  return (
    <div style={{ ...S.card({ position: 'relative', overflow: 'hidden', padding: 18 }) }}>
      <div style={{ position: 'absolute', inset: '0 auto auto 0', width: '100%', height: 3, background: A[ac] || C.m }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
        <IconBadge name={icon} tone={tone} size={16} />
        {trend ? <span style={{ fontSize: 11, fontWeight: 700, color: up ? C.ok : C.er }}>{trend}</span> : null}
      </div>
      <div style={S.kpiNumber}>{num}</div>
      <div style={{ ...S.meta, marginTop: 6 }}>{label}</div>
    </div>
  )
}

export const TL = ({ items }) => (
  <div>
    {items.map((it, i) => (
      <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 15, position: 'relative' }}>
        {i < items.length - 1 && <div style={{ position: 'absolute', left: 13, top: 28, width: 2, bottom: 4, background: C.bd }} />}
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: it.color || C.m,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
            zIndex: 1,
            boxShadow: '0 6px 14px rgba(26,24,40,.12)',
          }}
        >
          <Icon name={it.icon || 'history'} size={13} color="#fff" />
        </div>
        <div style={{ flex: 1, paddingTop: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.k }}>{it.title}</div>
          <div style={{ ...S.meta, marginTop: 3 }}>{it.sub}</div>
        </div>
      </div>
    ))}
  </div>
)

export const Bars = ({ data, ac = C.m }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 72, marginTop: 10 }}>
    {data.map((b, i) => (
      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{ width: '100%', borderRadius: '6px 6px 2px 2px', height: b.h, background: i === data.length - 1 ? ac : C.mL }} />
        <div style={{ fontSize: 10, color: C.kS }}>{b.l}</div>
      </div>
    ))}
  </div>
)
