import { C } from '../data.js'
import { S } from '../styles.js'
import { Icon, IconBadge } from '../../modules/shared/ui/icons.jsx'
import {
  getResolvedRole,
  getUserDisplayName,
  getUserInitials,
  getUserRoleLabel,
} from '../../modules/rbac/roleIdentity.js'

export default function Topbar({ role, user, onLogout, onChangePassword }) {
  const resolvedRole = getResolvedRole(user?.role, role)
  const isDoctor = resolvedRole === 'doctor'
  const displayName = getUserDisplayName(user, role)
  const displayRole = getUserRoleLabel(user, role)

  return (
    <div
      style={{
        height: 64,
        background: C.w,
        borderBottom: `1px solid ${C.bd}`,
        display: 'flex',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 400,
        boxShadow: '0 10px 22px rgba(26,24,40,.04)',
      }}
    >
      <div
        style={{
          width: 244,
          minWidth: 244,
          height: '100%',
          padding: '0 18px',
          borderRight: `1px solid ${C.bd}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: `linear-gradient(135deg,${C.m},${C.mB})`,
        }}
      >
        <span
          style={{
            width: 36,
            height: 36,
            background: 'rgba(255,255,255,.18)',
            borderRadius: 12,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}
        >
          <Icon name="hospital" size={18} color="#fff" />
        </span>
        <div>
          <div style={{ fontFamily: 'Georgia,serif', fontSize: 14, fontWeight: 700, color: '#fff' }}>Jijau Hospital</div>
          <div style={{ fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,.72)' }}>Gynecology and Maternity</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12 }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 340 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.kS }}>
            <Icon name="search" size={15} color={C.kS} />
          </span>
          <input placeholder="Search patients..." style={{ ...S.inp, maxWidth: 340, paddingLeft: 38 }} />
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {onChangePassword ? (
            <button type="button" onClick={onChangePassword} style={{ ...S.btn('ghost', true), height: 36 }}>
              <Icon name="password" size={15} />
              <span>Change Password</span>
            </button>
          ) : null}

          {onLogout ? (
            <button type="button" onClick={onLogout} style={{ ...S.btn('primary', true), height: 36 }}>
              <Icon name="logout" size={15} color="#fff" />
              <span>Logout</span>
            </button>
          ) : null}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '5px 12px 5px 5px',
              border: `1px solid ${C.bd}`,
              borderRadius: 999,
              background: C.w,
              boxShadow: '0 4px 12px rgba(26,24,40,.04)',
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: isDoctor ? `linear-gradient(135deg,${C.m},${C.mB})` : `linear-gradient(135deg,${C.t},#145858)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: '#fff',
                boxShadow: '0 8px 18px rgba(26,24,40,.12)',
              }}
            >
              {getUserInitials(user, role)}
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.k }}>{displayName}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 10, color: C.kS }}>{displayRole}</span>
                <IconBadge name={isDoctor ? 'doctor' : resolvedRole === 'admin' ? 'admin' : 'reception'} tone={isDoctor ? 'brand' : resolvedRole === 'admin' ? 'warn' : 'teal'} size={12} style={{ width: 24, height: 24, borderRadius: 999 }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
