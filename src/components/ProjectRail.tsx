import type { Project } from '../lib/types'
import { outlook } from '../lib/pace'

interface Props {
  projects: Project[]
  activeId: string | null
  now: Date
  onSelect: (id: string) => void
  onAdd: () => void
  onRemove: (id: string) => void
}

export function ProjectRail({ projects, activeId, now, onSelect, onAdd, onRemove }: Props) {
  return (
    <section className="panel">
      <span className="eyebrow">Saved</span>
      <h2 style={{ marginBottom: 11 }}>Projects</h2>
      <div className="proj-list">
        {projects.map((p) => {
          const view = outlook(p, now)
          const pct = view.target > 0 ? Math.round((view.done / view.target) * 100) : 0
          const isActive = p.id === activeId
          return (
            <div key={p.id} className={`proj-row${isActive ? ' is-active' : ''}`}>
              <button
                type="button"
                className="proj-pick"
                aria-current={isActive || undefined}
                onClick={() => onSelect(p.id)}
              >
                <span className="proj-name">{p.name || 'Untitled'}</span>
                <span className="proj-meta">{pct}%</span>
              </button>
              <button
                type="button"
                className="proj-del"
                title={`Delete ${p.name}`}
                aria-label={`Delete ${p.name}`}
                onClick={() => {
                  if (confirm(`Delete "${p.name}" and its log? This cannot be undone.`)) {
                    onRemove(p.id)
                  }
                }}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
      <button type="button" className="ghost-btn rail-btn" onClick={onAdd}>
        New project
      </button>
    </section>
  )
}
