/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],

  theme: {
    extend: {
      // ─── Brand Colors ────────────────────────────────────────────────
      colors: {
        // Primary: GyneCRM Teal — buttons, active states, sidebar accent
        primary: {
          50:  '#f0fdfc',
          100: '#ccfbf5',
          200: '#99f5eb',
          300: '#5de8d9',
          400: '#2dd2c5',
          500: '#0D7E8A', // ← core brand color
          600: '#0a6b76',
          700: '#0a5460',
          800: '#0c4450',
          900: '#0e3843',
          950: '#042029',
        },

        // Status Colors — must match backend enum values exactly
        status: {
          // appointment_status_enum
          scheduled:    { bg: '#dbeafe', text: '#1d4ed8', ring: '#93c5fd' },  // blue
          confirmed:    { bg: '#dbeafe', text: '#1d4ed8', ring: '#93c5fd' },  // blue
          arrived:      { bg: '#d1fae5', text: '#065f46', ring: '#6ee7b7' },  // green-light
          checked_in:   { bg: '#d1fae5', text: '#065f46', ring: '#6ee7b7' },  // green
          waiting:      { bg: '#fef3c7', text: '#b45309', ring: '#fcd34d' },  // yellow
          with_doctor:  { bg: '#ede9fe', text: '#6d28d9', ring: '#c4b5fd' },  // purple
          completed:    { bg: '#d1fae5', text: '#065f46', ring: '#6ee7b7' },  // green
          cancelled:    { bg: '#fee2e2', text: '#991b1b', ring: '#fca5a5' },  // red
          rescheduled:  { bg: '#fef3c7', text: '#b45309', ring: '#fcd34d' },  // amber
          no_show:      { bg: '#ffedd5', text: '#c2410c', ring: '#fdba74' },  // orange
          emergency:    { bg: '#fee2e2', text: '#991b1b', ring: '#fca5a5' },  // red-bold
          blocked:      { bg: '#f3f4f6', text: '#6b7280', ring: '#d1d5db' },  // gray
          draft:        { bg: '#f3f4f6', text: '#6b7280', ring: '#d1d5db' },  // gray
          pending:      { bg: '#fef3c7', text: '#b45309', ring: '#fcd34d' },  // yellow
          paid:         { bg: '#d1fae5', text: '#065f46', ring: '#6ee7b7' },  // green
          partially_paid: { bg: '#dbeafe', text: '#1d4ed8', ring: '#93c5fd' }, // blue
          refunded:     { bg: '#fae8ff', text: '#86198f', ring: '#e879f9' },  // purple
          void:         { bg: '#f3f4f6', text: '#6b7280', ring: '#d1d5db' },  // gray
          active:       { bg: '#d1fae5', text: '#065f46', ring: '#6ee7b7' },  // green
          delivered:    { bg: '#dbeafe', text: '#1d4ed8', ring: '#93c5fd' },  // blue
          high_risk:    { bg: '#fee2e2', text: '#991b1b', ring: '#fca5a5' },  // red
          issued:       { bg: '#d1fae5', text: '#065f46', ring: '#6ee7b7' },  // green
          overdue:      { bg: '#fee2e2', text: '#991b1b', ring: '#fca5a5' },  // red
          missed:       { bg: '#ffedd5', text: '#c2410c', ring: '#fdba74' },  // orange
          in_progress:  { bg: '#ede9fe', text: '#6d28d9', ring: '#c4b5fd' },  // purple
        },

        // Semantic surface colors
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f9fafb',
          subtle: '#f3f4f6',
          border: '#e5e7eb',
          divider: '#f3f4f6',
        },

        // Text hierarchy
        content: {
          primary: '#111827',
          secondary: '#374151',
          tertiary: '#6b7280',
          disabled: '#9ca3af',
          inverse: '#ffffff',
          link: '#0D7E8A',
        },

        // Feedback colors
        success: {
          50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0',
          500: '#22c55e', 600: '#16a34a', 700: '#15803d',
        },
        warning: {
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a',
          500: '#f59e0b', 600: '#d97706', 700: '#b45309',
        },
        danger: {
          50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca',
          500: '#ef4444', 600: '#dc2626', 700: '#b91c1c',
        },
        info: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe',
          500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
        },
      },

      // ─── Typography ───────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        heading: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },

      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        xs:   ['0.75rem',  { lineHeight: '1rem' }],
        sm:   ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem',     { lineHeight: '1.5rem' }],
        lg:   ['1.125rem', { lineHeight: '1.75rem' }],
        xl:   ['1.25rem',  { lineHeight: '1.75rem' }],
        '2xl':['1.5rem',   { lineHeight: '2rem' }],
        '3xl':['1.875rem', { lineHeight: '2.25rem' }],
        '4xl':['2.25rem',  { lineHeight: '2.5rem' }],
      },

      fontWeight: {
        normal:   '400',
        medium:   '500',
        semibold: '600',
        bold:     '700',
        extrabold:'800',
      },

      // ─── Spacing (8px grid) ───────────────────────────────────────────
      // Tailwind default uses 4px. Override key values to hint 8px rhythm.
      spacing: {
        px: '1px',
        0: '0',
        0.5: '2px',
        1: '4px',
        1.5: '6px',
        2: '8px',    // ← 1 unit
        3: '12px',
        4: '16px',   // ← 2 units
        5: '20px',
        6: '24px',   // ← 3 units
        7: '28px',
        8: '32px',   // ← 4 units
        9: '36px',
        10: '40px',  // ← 5 units
        11: '44px',
        12: '48px',  // ← 6 units
        14: '56px',
        16: '64px',  // ← 8 units
        20: '80px',
        24: '96px',
        28: '112px',
        32: '128px',
        36: '144px',
        40: '160px',
        44: '176px',
        48: '192px',
        52: '208px',
        56: '224px',
        60: '240px',
        64: '256px',
        72: '288px',
        80: '320px',
        96: '384px',
      },

      // ─── Border Radius ────────────────────────────────────────────────
      borderRadius: {
        none:  '0',
        sm:    '4px',
        DEFAULT:'6px',
        md:    '8px',
        lg:    '10px',
        xl:    '12px',  // ← card radius per design system
        '2xl': '16px',
        '3xl': '24px',
        full:  '9999px',
      },

      // ─── Box Shadows ──────────────────────────────────────────────────
      boxShadow: {
        none: 'none',
        xs:   '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        sm:   '0 1px 3px 0 rgb(0 0 0 / 0.10), 0 1px 2px -1px rgb(0 0 0 / 0.10)',
        DEFAULT:'0 4px 6px -1px rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.10)',
        md:   '0 4px 6px -1px rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.10)',
        lg:   '0 10px 15px -3px rgb(0 0 0 / 0.10), 0 4px 6px -4px rgb(0 0 0 / 0.10)',
        xl:   '0 20px 25px -5px rgb(0 0 0 / 0.10), 0 8px 10px -6px rgb(0 0 0 / 0.10)',
        card: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.12), 0 2px 4px -1px rgb(0 0 0 / 0.08)',
        modal:'0 25px 50px -12px rgb(0 0 0 / 0.25)',
        dropdown: '0 4px 6px -1px rgb(0 0 0 / 0.12), 0 2px 4px -2px rgb(0 0 0 / 0.08)',
      },

      // ─── Sidebar & Layout Dimensions ─────────────────────────────────
      width: {
        sidebar: '256px',
        'sidebar-collapsed': '64px',
        'topbar': '100%',
      },

      height: {
        topbar: '64px',
      },

      // ─── Z-Index Scale ────────────────────────────────────────────────
      zIndex: {
        base:     '0',
        raised:   '10',
        dropdown: '100',
        sticky:   '200',
        overlay:  '300',
        modal:    '400',
        popover:  '500',
        toast:    '600',
        tooltip:  '700',
      },

      // ─── Transitions ──────────────────────────────────────────────────
      transitionDuration: {
        DEFAULT: '150ms',
        fast:    '100ms',
        normal:  '200ms',
        slow:    '300ms',
      },

      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      // ─── Animation ────────────────────────────────────────────────────
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideInRight: {
          '0%':   { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
        slideOutRight: {
          '0%':   { transform: 'translateX(0)',    opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%':   { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
        spin: {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        shimmer:       'shimmer 2s linear infinite',
        slideInRight:  'slideInRight 0.25s ease-out',
        slideOutRight: 'slideOutRight 0.2s ease-in',
        fadeIn:        'fadeIn 0.2s ease-out',
        scaleIn:       'scaleIn 0.15s ease-out',
        spin:          'spin 0.8s linear infinite',
      },
    },
  },

  plugins: [],
};
