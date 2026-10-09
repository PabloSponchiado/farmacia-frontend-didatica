import { Icon } from './Icon'

export function LoadingState() {
  return <div className="state-card"><span className="spinner" />Carregando informações...</div>
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><span className="empty-icon"><Icon name="search" /></span><strong>{title}</strong><p>{description}</p></div>
}
