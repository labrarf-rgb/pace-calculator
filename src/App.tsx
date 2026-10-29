import { useMemo, useState } from 'react'
import { useAppState } from './hooks/useAppState'
import { clampDaysPerWeek, daysToFinish, ledger, leverRange, leverValue, outlook, projectAt } from './lib/pace'
import { startOfDay } from './lib/dates'
import { ProjectRail } from './components/ProjectRail'
import { IntentPanel, TargetPanel } from './components/SetupPanels'
import { HeroDates } from './components/HeroDates'
import { RevisionNote } from './components/RevisionNote'
import { BurnUpChart } from './components/BurnUpChart'
import { HabitHistory } from './components/HabitHistory'
import { WhatIfSlider } from './components/WhatIfSlider'
import { CostLedger } from './components/CostLedger'
import { DayLog } from './components/DayLog'
import { DataPanel } from './components/DataPanel'
import { EstoriaPanel } from './components/EstoriaPanel'
import { ThemeToggle } from './components/ThemeToggle'
import { SettingsButton } from './components/SettingsButton'
import { ProjectSwitcher } from './components/ProjectSwitcher'
import { Modal } from './components/Modal'

export default function App() {
  const {
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
  } = useAppState()

  const now = useMemo(() => startOfDay(new Date()), [])
  const view = useMemo(() => (active ? outlook(active, now) : null), [active, now])
  const rows = useMemo(() => (active ? ledger(active, now) : []), [active, now])

  const [settingsOpen, setSettingsOpen] = useState(false)

  if (!active || !view) return null

  // The lever lives on the project, so a scenario survives a reload and does not
  // follow you into a different project. Its range stretches to cover the goal.
  const range = leverRange()
  const spw = leverValue(active, view.observation)
  const observedSpw = view.observation.sessionsPerWeek

  const whatIfProjection = projectAt(view.remaining, spw, view.observation.perSession, now)
  // The goal frequency at your real output, next to the goal's own output, so the
  // lever and the gold date in the hero are visibly two different questions.
  const goalFrequencyProjection = projectAt(
    view.remaining,
    clampDaysPerWeek(active.goal.sessionsPerWeek),
    view.observation.perSession,
    now,
  )
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
          <DayLog
            project={active}
            view={view}
            now={now}
            onSetDay={(key, amount) => setDay(active.id, key, amount)}
          />
          <WhatIfSlider
            project={active}
            value={spw}
            range={range}
            observedSpw={observedSpw}
            perSession={view.observation.perSession}
            baselineDays={baselineDays}
            days={whatIfProjection.days}
            date={whatIfProjection.date}
            goalFrequencyDate={goalFrequencyProjection.date}
            goalDate={view.goal.date}
            onChange={(value) => patch({ whatIfSessionsPerWeek: value })}
            onReset={() => patch({ whatIfSessionsPerWeek: undefined })}
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
          <EstoriaPanel
            project={active}
            estoria={estoria}
            onLink={(entry) => linkEstoria(active.id, entry)}
            onUnlink={() => unlinkEstoria(active.id)}
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
