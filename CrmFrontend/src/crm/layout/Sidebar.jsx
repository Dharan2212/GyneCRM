import { C } from '../data.js'
import { Icon } from '../../modules/shared/ui/icons.jsx'

export default function Sidebar({ nav, active, onNav }) {
  return (
    <div
      style={{
        width: 244,
        minWidth: 244,
        background: C.w,
        borderRight: `1px solid ${C.bd}`,
        padding: '14px 0 72px',
        overflowY: 'auto',
        height: 'calc(100vh - 58px)',
        position: 'sticky',
        top: 58,
      }}
    >
      {nav.map((g, gi) => (
        <div key={gi} style={{ marginBottom: 10 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '.12em',
              textTransform: 'uppercase',
              color: C.kS,
              padding: '10px 18px 8px',
              display: 'block',
            }}
          >
            {g.label}
          </span>
          <div style={{ display: 'grid', gap: 4, padding: '0 10px' }}>
            {g.items.map((item, ii) => {
              const isActive = active === item.id
              return (
                <button
                  key={ii}
                  type="button"
                  onClick={() => onNav(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    border: `1px solid ${isActive ? `${C.m}30` : 'transparent'}`,
                    borderRadius: 12,
                    background: isActive ? C.mP : 'transparent',
                    color: isActive ? C.m : C.kB,
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 13,
                    textAlign: 'left',
                    transition: 'all .15s ease',
                  }}
                >
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 10,
                      background: isActive ? 'rgba(123,31,58,.12)' : '#F4F7FB',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isActive ? C.m : C.kS,
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={item.icon} size={16} color={isActive ? C.m : C.kS} />
                  </span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge != null && item.badge !== 0 ? (
                    <span
                      style={{
                        background: item.bw ? C.wn : C.m,
                        color: '#fff',
                        fontSize: 10,
                        minWidth: 22,
                        height: 22,
                        padding: '0 7px',
                        borderRadius: 999,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                      }}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
