import useReducedMotion from './useReducedMotion.js'

export default function MotionSurface({
  children,
  as: Component = 'div',
  delay = 0,
  style = {},
  hoverLift = false,
  interactive = false,
}) {
  const reducedMotion = useReducedMotion()

  const motionStyle = reducedMotion
    ? {}
    : {
        animation: `uiFadeRise 220ms cubic-bezier(.2,.8,.2,1) both`,
        animationDelay: `${delay}ms`,
        transition: hoverLift || interactive ? 'transform 140ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease' : undefined,
      }

  const interactiveStyle = reducedMotion || (!hoverLift && !interactive)
    ? {}
    : {
        willChange: 'transform',
      }

  return (
    <Component style={{ ...motionStyle, ...interactiveStyle, ...style }}>
      {children}
      {!reducedMotion ? (
        <style>{`
          @keyframes uiFadeRise {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      ) : null}
    </Component>
  )
}
