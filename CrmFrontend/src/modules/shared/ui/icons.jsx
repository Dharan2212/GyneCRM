import React from 'react'
import { C } from '../../../crm/data.js'

const iconPaths = {
  dashboard: ['M3 13.5h8V3H3v10.5Zm10 7.5h8V11h-8v10Zm0-18v6h8V3h-8Zm-10 18h8v-5.5H3V21Z'],
  patients: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  consultation: ['M9 11h6', 'M9 15h6', 'M9 7h3', 'M5 3h10l4 4v14H5V3Z'],
  firstConsult: ['M12 5v14', 'M5 12h14'],
  followUp: ['M21 12a9 9 0 1 1-2.64-6.36', 'M21 3v6h-6'],
  test: ['M9 3h6', 'M10 9 5.5 16.5A4 4 0 0 0 9 20h6a4 4 0 0 0 3.5-3.5L14 9', 'M10 9h4', 'M9 3h6'],
  prescription: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  category: ['M4 7h16', 'M4 12h10', 'M4 17h7'],
  pregnancy: ['M12 21c4.97 0 9-4.03 9-9S16.97 3 12 3 3 7.03 3 12s4.03 9 9 9Z', 'M12 8v4l2.5 2.5'],
  reception: ['M4 6h16v12H4z', 'M8 3v6', 'M16 3v6'],
  register: ['M12 5v14', 'M5 12h14', 'M19 5v14', 'M5 5h14'],
  appointments: ['M8 2v4', 'M16 2v4', 'M3 10h18', 'M5 6h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z'],
  upload: ['M12 16V6', 'M8 10l4-4 4 4', 'M20 16.5A3.5 3.5 0 0 0 17 11h-1a5 5 0 1 0-8 4H7'],
  billing: ['M12 1v22', 'M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6'],
  search: ['m21 21-4.35-4.35', 'M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z'],
  logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  password: ['M16 11V7a4 4 0 1 0-8 0v4', 'M5 11h14v10H5z', 'M12 15v2'],
  hospital: ['M3 21h18', 'M5 21V7l7-4 7 4v14', 'M9 10h.01', 'M15 10h.01', 'M9 14h.01', 'M15 14h.01'],
  alert: ['M12 9v4', 'M12 17h.01', 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.36a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z'],
  history: ['M3 3v5h5', 'M3.05 13A9 9 0 1 0 6 6.3L3 8', 'M12 7v5l3 3'],
  phone: ['M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.09 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.63 2.62a2 2 0 0 1-.45 2.11L8 9.91a16 16 0 0 0 6 6l1.46-1.27a2 2 0 0 1 2.11-.45c.84.3 1.72.51 2.62.63A2 2 0 0 1 22 16.92Z'],
  file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6'],
  send: ['M22 2 11 13', 'M22 2 15 22 11 13 2 9 22 2Z'],
  pdf: ['M7 2h7l5 5v15H7z', 'M14 2v5h5', 'M9 14h1a1.5 1.5 0 0 1 0 3H9v-3Zm4 0v3', 'M13 14h2', 'M18 17h-2v-3h2'],
  review: ['M9 12l2 2 4-4', 'M21 12a9 9 0 1 1-3-6.7'],
  check: ['M20 6 9 17l-5-5'],
  refresh: ['M21 2v6h-6', 'M3 12a9 9 0 0 1 15.55-6.36L21 8', 'M3 22v-6h6', 'M21 12a9 9 0 0 1-15.55 6.36L3 16'],
  doctor: ['M12 3v18', 'M3 12h18'],
  admin: ['M12 2 4 6v6c0 5.25 3.43 10.12 8 11.75 4.57-1.63 8-6.5 8-11.75V6l-8-4Z'],
  notes: ['M4 5h16', 'M4 12h16', 'M4 19h10'],
  lab: ['M8 3h8', 'M10 3v5l-4 7.5A3.5 3.5 0 0 0 9.1 21h5.8a3.5 3.5 0 0 0 3.1-5.5L14 8V3'],
  users: ['M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M20 8v6', 'M23 11h-6'],
  spark: ['M12 2 14.8 9.2 22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8L12 2Z'],
  queue: ['M5 7h14', 'M5 12h10', 'M5 17h8'],
}

const aliasMap = {
  '>': 'dashboard',
  '#': 'patients',
  N: 'firstConsult',
  '~': 'followUp',
  T: 'test',
  R: 'prescription',
  C: 'category',
  '+': 'register',
  '@': 'appointments',
  '^': 'upload',
  '$': 'billing',
  All: 'dashboard',
  Wait: 'queue',
  Cons: 'consultation',
  Fup: 'followUp',
  Risk: 'alert',
  New: 'register',
  Ret: 'followUp',
  In: 'check',
  WL: 'queue',
  Preg: 'pregnancy',
  IVF: 'spark',
  Gyn: 'notes',
}

export function resolveIconName(name) {
  return aliasMap[name] || name || 'notes'
}

export function Icon({ name, size = 18, stroke = 2, color = 'currentColor', style, ...props }) {
  const resolved = resolveIconName(name)
  const paths = iconPaths[resolved] || iconPaths.notes
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0, ...style }}
      {...props}
    >
      {paths.map((path, index) => <path key={index} d={path} />)}
    </svg>
  )
}

export function IconBadge({ name, tone = 'muted', size = 18, style = {} }) {
  const tones = {
    muted: { bg: '#F4F7FB', fg: C.kB },
    brand: { bg: C.mP, fg: C.m },
    teal: { bg: C.tP, fg: C.t },
    ok: { bg: C.okL, fg: C.ok },
    warn: { bg: C.wnL, fg: C.wn },
    danger: { bg: C.erL, fg: C.er },
  }
  const palette = tones[tone] || tones.muted
  return (
    <span
      style={{
        width: size + 16,
        height: size + 16,
        borderRadius: 12,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: palette.bg,
        color: palette.fg,
        ...style,
      }}
    >
      <Icon name={name} size={size} color={palette.fg} />
    </span>
  )
}

export default Icon
