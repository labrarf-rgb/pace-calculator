import type { AppState, Project } from './types'
import { toDayKey } from './dates'

const KEY = 'pace.v1'

export function newId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function blankProject(name = 'Untitled project'): Project {
  const now = new Date()
  const stamp = now.toISOString()
  return {
    id: newId(),
    name,
    unitLabel: 'words',
    sessionLabel: 'sitting',
    segmentLabel: 'chapter',
    segments: { count: 15, per: 5000 },
    target: 75000,
    startingAmount: 0,
    startDate: toDayKey(now),
    goal: { sessionsPerWeek: 5, perSession: 1000 },
    sessions: [],
    createdAt: stamp,
    updatedAt: stamp,
  }
}

function firstRun(): AppState {
  const project = blankProject('Untitled Novel')
  return { version: 1, projects: [project], activeId: project.id, theme: 'light' }
}

function reviveLink(raw: unknown): Project['estoria'] {
  const l = raw as Partial<NonNullable<Project['estoria']>> | null | undefined
  if (!l || typeof l.projectId !== 'string' || typeof l.since !== 'string') return undefined
  return { projectId: l.projectId, name: typeof l.name === 'string' ? l.name : '', since: l.since }
}

/** Fill in anything a stored project is missing, so old saves keep working. */
function reviveProject(raw: unknown): Project | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Partial<Project>
  if (typeof p.id !== 'string' || typeof p.name !== 'string') return null
  const base = blankProject(p.name)
  return {
    ...base,
    ...p,
    id: p.id,
    // Older saves predate the head start, so treat a missing value as zero.
    startingAmount: Number.isFinite(p.startingAmount) ? Number(p.startingAmount) : 0,
    goal: { ...base.goal, ...(p.goal ?? {}) },
    whatIfSessionsPerWeek: Number.isFinite(p.whatIfSessionsPerWeek)
      ? Number(p.whatIfSessionsPerWeek)
      : undefined,
    estoria: reviveLink(p.estoria),
    sessions: Array.isArray(p.sessions)
      ? p.sessions.filter(
          (s): s is Project['sessions'][number] =>
            !!s && typeof s.date === 'string' && Number.isFinite(s.amount),
        )
      : [],
  }
}

export function load(): AppState {
  if (typeof localStorage === 'undefined') return firstRun()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return firstRun()
    const parsed = JSON.parse(raw) as Partial<AppState>
    const projects = (parsed.projects ?? []).map(reviveProject).filter((p): p is Project => !!p)
    if (projects.length === 0) return firstRun()
    const activeId = projects.some((p) => p.id === parsed.activeId)
      ? (parsed.activeId as string)
      : projects[0].id
    return {
      version: 1,
      projects,
      activeId,
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
    }
  } catch {
    // A corrupt save should not brick the app. Start clean rather than crash.
    return firstRun()
  }
}

export function save(state: AppState): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Storage full or blocked. The session still works, it just will not persist.
  }
}

export interface Backup {
  kind: 'pace-backup'
  version: 1
  exportedAt: string
  projects: Project[]
}

export function toBackup(projects: Project[]): string {
  const backup: Backup = {
    kind: 'pace-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    projects,
  }
  return JSON.stringify(backup, null, 2)
}

/** Suggested filename for a backup, e.g. `pace-backup-2026-08-20.json`. */
export function backupFilename(now = new Date()): string {
  return `pace-backup-${toDayKey(now)}.json`
}

/**
 * Read projects out of a backup file. Accepts a full backup, a bare app state,
 * or a raw array of projects, so a hand-edited or older file still loads.
 * Every project gets a fresh id, which keeps an import from colliding with
 * whatever is already saved.
 */
export function parseBackup(text: string): Project[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }

  const raw = Array.isArray(parsed)
    ? parsed
    : ((parsed as { projects?: unknown })?.projects ?? null)

  if (!Array.isArray(raw)) {
    throw new Error('No projects found in that file.')
  }

  const projects = raw.map(reviveProject).filter((p): p is Project => !!p)
  if (projects.length === 0) {
    throw new Error('No readable projects found in that file.')
  }

  return projects.map((p) => ({ ...p, id: newId() }))
}
