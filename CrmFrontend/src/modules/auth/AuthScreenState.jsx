import { C } from '../../crm/data.js'

export default function AuthScreenState({ title, subtitle }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#f6f8fc',
        fontFamily: "'Segoe UI',system-ui,sans-serif",
        color: '#123',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          padding: 24,
          borderRadius: 22,
          border: `1.5px solid ${C.bd}`,
          background: '#fff',
          boxShadow: '0 18px 48px rgba(22, 44, 86, 0.08)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            margin: '0 auto 14px',
            border: `3px solid ${C.m}`,
            borderTopColor: 'rgba(37,99,235,0.15)',
            animation: 'authSpin .9s linear infinite',
          }}
        />
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{title}</div>
        {subtitle ? <div style={{ fontSize: 13, color: '#5b6b7f', lineHeight: 1.65 }}>{subtitle}</div> : null}
      </div>

      <style>{`@keyframes authSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
