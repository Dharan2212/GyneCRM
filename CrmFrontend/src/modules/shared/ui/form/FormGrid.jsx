export default function FormGrid({ columns = 2, gap = 12, children, style = {} }) {
  const template = typeof columns === 'number' ? `repeat(${columns}, minmax(0, 1fr))` : columns
  return <div style={{ display: 'grid', gridTemplateColumns: template, gap, alignItems: 'start', ...style }}>{children}</div>
}
