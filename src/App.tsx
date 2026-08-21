import { useMemo, useState } from 'react'
import { useAppState } from './hooks/useAppState'
import { daysToFinish, ledger, outlook, projectAt } from './lib/pace'
import { startOfDay } from './lib/dates'
import { ProjectRail } from './components/ProjectRail'
import { IntentPanel, TargetPanel } from './components/SetupPanels'
import { HeroDates } from './components/HeroDates'
import { RevisionNote } from './components/RevisionNote'
import { BurnUpChart } from './components/BurnUpChart'
import { HabitHistory } from './components/HabitHistory'
import { WhatIfSlider } from './components/WhatIfSlider'
import { CostLedger } from './components/CostLedger'
import { DataPanel } from './components/DataPanel'
import { ThemeToggle } from './components/ThemeToggle'
import { SettingsButton } from './components/SettingsButton'
import { ProjectSwitcher } from './components/ProjectSwitcher'
import { Modal } from './components/Modal'

export default function App() {
  const {
    state,
    active,
    patchProject,
    addProject,
    removeProject,
    importProjects,
    setActive,
    toggleTheme,
    logToday,
    clearDay,
  } = useAppState()

  const now = useMemo(() => startOfDay(new Date()), [])
  const view = useMemo(() => (active ? outlook(active, now) : null), [active, now])
  const rows = useMemo(() => (active ? ledger(active, now) : []), [active, now])

  const [settingsOpen, setSettingsOpen] = useState(false)

  // The what-if slider is scoped to a project, so switching projects drops back to
  // that project's measured pace rather than carrying the last one over.
  const [whatIf, setWhatIf] = useState<{ projectId: string; value: number } | null>(null)
  const observedSpw = view?.observation.sessionsPerWeek ?? 1

  // Open exactly on the measured pace so the slider reads "your current pace",
  // then snap to half-session steps once the user takes hold of it.
  const spw =
    whatIf && whatIf.projectId === active?.id
      ? whatIf.value
      : Math.min(Math.max(observedSpw, 0.5), 7)

  if (!active || !view) return null

  const whatIfProjection = projectAt(view.remaining, spw, view.observation.perSession, now)
  const baselineDays = daysToFinish(
    view.remaining,
    view.observation.sessionsPerWeek,
    view.observation.perSession,
  )
  const patch = (p: Parameters<typeof patchProject>[1]) => patchProject(active.id, p)

  return (
    <>
      <header className="site-header">
        <div className="nav">
          <div className="brand">
            <span className="brand-name">PACE</span>
            <span className="brand-sub">Honest finish dates</span>
          </div>
          <div className="nav-actions">
            <ProjectSwitcher
              projects={state.projects}
              activeId={state.activeId}
              onSelect={setActive}
            />
            <SettingsButton onClick={() => setSettingsOpen(true)} />
            <ThemeToggle theme={state.theme} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      <main className="wrap">
        <h1 className="visually-hidden">Pace</h1>
        <div className="stage">
          <HeroDates project={active} view={view} />
          <RevisionNote project={active} view={view} />
          <BurnUpChart project={active} view={view} now={now} whatIfDays={whatIfProjection.days} />
          <HabitHistory
            project={active}
            now={now}
            onLog={(amount) => logToday(active.id, amount)}
            onClearDay={(key) => clearDay(active.id, key)}
          />
          <WhatIfSlider
            project={active}
            value={spw}
            baselineDays={baselineDays}
            days={whatIfProjection.days}
            date={whatIfProjection.date}
            onChange={(value) => setWhatIf({ projectId: active.id, value })}
          />
          <CostLedger rows={rows} />
        </div>
      </main>

      <Modal open={settingsOpen} title="Settings" onClose={() => setSettingsOpen(false)}>
        <div className="settings-grid">
          <TargetPanel project={active} view={view} onPatch={patch} />
          <IntentPanel project={active} onPatch={patch} />
          <ProjectRail
            projects={state.projects}
            activeId={state.activeId}
            now={now}
            onSelect={setActive}
            onAdd={addProject}
            onRemove={removeProject}
          />
          <DataPanel projects={state.projects} onImport={importProjects} />
        </div>
      </Modal>

      <footer className="site-footer">
        <p>
          Everything is stored in this browser only. Nothing is uploaded, and clearing site data
          clears your log. Take a backup from settings if you want a copy that survives that.
        </p>
      </footer>
    </>
  )
}
