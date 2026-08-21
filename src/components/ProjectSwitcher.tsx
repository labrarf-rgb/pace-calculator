import type { Project } from '../lib/types'

interface Props {
  projects: Project[]
  activeId: string | null
  onSelect: (id: string) => void
}

export function ProjectSwitcher({ projects, activeId, onSelect }: Props) {
  return (
    <div className="switcher">
      <label className="visually-hidden" htmlFor="project-switcher">
        Active project
      </label>
      <select
        id="project-switcher"
        value={activeId ?? ''}
        onChange={(e) => onSelect(e.target.value)}
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name || 'Untitled'}
          </option>
        ))}
      </select>
      {/* Our own chevron, so the text has guaranteed room and follows the theme. */}
      <svg
        className="switcher-chevron"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  )
}
