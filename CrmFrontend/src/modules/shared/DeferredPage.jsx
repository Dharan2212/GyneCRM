import { EmptyState } from './ui/state/index.js'

export default function DeferredPage({ title, subtitle }) {
  return <EmptyState title={title} message={subtitle} compact={false} />
}
