import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppState, Project } from '../lib/types'
import { blankProject, load, save } from '../lib/storage'
import { toDayKey } from '../lib/dates'
import { addToDay, setDayAmount } from '../lib/pace'
import { applyEstoria, ESTORIA_LOG_KEY, linkStart, readEstoriaLog, type EstoriaProject } from '../lib/estoria'

/**
 * Fold Estoria's days into every linked project. `applyEstoria` returns null
 * when nothing moved, so an unchanged log hands back the same state and costs
 * no render or save.
 */
function foldEstoria(state: AppState, log: EstoriaProject[]): AppState {
  let changed = false
  const projects = state.projects.map((p) => {
    const entry = p.estoria && log.find((e) => e.id === p.estoria!.projectId)
    const patch = entry ? applyEstoria(p, entry) : null
    if (!patch) return p
    changed = true
    return { ...p, ...patch, updatedAt: new Date().toISOString() }
  })
  return changed ? { ...state, projects } : state
}

export function useAppState() {
  const [state, setState] = useState<AppState>(() => foldEstoria(load(), readEstoriaLog()))

  useEffect(() => {
    save(state)
  }, [state])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme)
  }, [state.theme])

  // Estoria's projects in this browser, re-read whenever Pace comes back into
  // view and whenever an Estoria tab writes the log, so a linked project follows
  // the writing live.
  const [estoria, setEstoria] = useState<EstoriaProject[]>(() => readEstoriaLog())
  useEffect(() => {
    const refresh = () => {
      const log = readEstoriaLog()
      setEstoria(log)
      setState((prev) => foldEstoria(prev, log))
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === ESTORIA_LOG_KEY || e.key === null) refresh()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const active = useMemo(
    () => state.projects.find((p) => p.id === state.activeId) ?? state.projects[0] ?? null,
    [state.projects, state.activeId],
  )

  const patchProject = useCallback((id: string, patch: Partial<Project>) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p,
      ),
    }))
  }, [])

  const addProject = useCallback(() => {
    const project = blankProject('New project')
    setState((prev) => ({
      ...prev,
      projects: [...prev.projects, project],
      activeId: project.id,
    }))
  }, [])

  const removeProject = useCallback((id: string) => {
    setState((prev) => {
      const projects = prev.projects.filter((p) => p.id !== id)
      if (projects.length === 0) {
        const fresh = blankProject('Untitled project')
        return { ...prev, projects: [fresh], activeId: fresh.id }
      }
      return {
        ...prev,
        projects,
        activeId: prev.activeId === id ? projects[0].id : prev.activeId,
      }
    })
  }, [])

  /** Append imported projects rather than replacing, so a load can never lose work. */
  const importProjects = useCallback((incoming: Project[]) => {
    if (incoming.length === 0) return
    setState((prev) => ({
      ...prev,
      projects: [...prev.projects, ...incoming],
      activeId: incoming[0].id,
    }))
  }, [])

  const setActive = useCallback((id: string) => {
    setState((prev) => ({ ...prev, activeId: id }))
  }, [])

  const toggleTheme = useCallback(() => {
    setState((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }))
  }, [])

  const withSessions = (id: string, next: (sessions: Project['sessions']) => Project['sessions']) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === id ? { ...p, sessions: next(p.sessions), updatedAt: new Date().toISOString() } : p,
      ),
    }))
  }

  /** Add to today's total rather than replacing it, so two sittings both count. */
  const logToday = useCallback((id: string, amount: number, now = new Date()) => {
    const key = toDayKey(now)
    withSessions(id, (sessions) => addToDay(sessions, key, amount))
  }, [])

  /** Correct a day outright. Zero removes it. */
  const setDay = useCallback((id: string, dayKey: string, amount: number) => {
    withSessions(id, (sessions) => setDayAmount(sessions, dayKey, amount))
  }, [])

  const clearDay = useCallback((id: string, dayKey: string) => {
    withSessions(id, (sessions) => setDayAmount(sessions, dayKey, 0))
  }, [])

  /** Take this project's log from an Estoria project from now on. */
  const linkEstoria = useCallback((id: string, entry: EstoriaProject) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => {
        if (p.id !== id) return p
        const linked = { ...p, estoria: { projectId: entry.id, name: entry.name, since: linkStart(p, entry) } }
        return { ...linked, ...applyEstoria(linked, entry), updatedAt: new Date().toISOString() }
      }),
    }))
  }, [])

  /** Stop following Estoria. Everything it filled in stays in the log. */
  const unlinkEstoria = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === id ? { ...p, estoria: undefined, updatedAt: new Date().toISOString() } : p,
      ),
    }))
  }, [])

  return {
    state,
    estoria,
    linkEstoria,
    unlinkEstoria,
    active,
    patchProject,
    addProject,
    removeProject,
    importProjects,
    setActive,
    toggleTheme,
    logToday,
    setDay,
    clearDay,
  }
}
