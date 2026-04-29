import { SectionCard } from './ui/layout/index.js'
import { EmptyState } from './ui/state/index.js'

export default function DeferredPage({ title, subtitle }) {
  return (
    <SectionCard>
      <EmptyState title={title} message={subtitle} />
    </SectionCard>
  )
}
