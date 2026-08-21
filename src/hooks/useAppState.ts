import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppState, Project } from '../lib/types'
import { blankProject, load, save } from '../lib/storage'
import { toDayKey } from '../lib/dates'
import { addToDay, setDayAmount } from '../lib/pace'

export function useAppState() {
  const [state, setState] = useState<AppState>(() => load())

  useEffect(() => {
    save(state)
  }, [state])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme)
  }, [state.theme])

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

  return {
    state,
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
