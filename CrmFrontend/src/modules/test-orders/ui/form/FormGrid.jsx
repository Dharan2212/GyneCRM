export default function FormGrid({ columns = 2, gap = 10, children }) {
  const template = typeof columns === 'number' ? `repeat(${columns}, minmax(0, 1fr))` : columns

  return <div style={{ display: 'grid', gridTemplateColumns: template, gap }}>{children}</div>
}
