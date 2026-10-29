import { useEffect, useRef, useState } from 'react'
import type { Project } from '../lib/types'
import { amountsByDay, habitGrid, habitStats } from '../lib/pace'
import { toDayKey } from '../lib/dates'
import { formatAmount, formatDate } from '../lib/format'

interface Props {
  project: Project
  now: Date
  onLog: (amount: number) => void
  onClearDay: (dayKey: string) => void
}

const WEEKDAYS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

/** Shade a day against the goal for one session, so colour means intent, not rank. */
function level(amount: number, goalPerSession: number): 0 | 1 | 2 | 3 | 4 {
  if (amount <= 0) return 0
  const ratio = amount / Math.max(goalPerSession, 1)
  if (ratio < 0.5) return 1
  if (ratio < 1) return 2
  if (ratio < 1.5) return 3
  return 4
}

export function HabitHistory({ project, now, onLog, onClearDay }: Props) {
  const [draft, setDraft] = useState('')
  const [hint, setHint] = useState('One number a day. That is the whole ritual.')
  const scroller = useRef<HTMLDivElement>(null)

  const grid = habitGrid(project, now)
  const stats = habitStats(project, now)
  const todayKey = toDayKey(now)
  const loggedToday = amountsByDay(project).get(todayKey) ?? 0

  // The newest weeks are the interesting ones, so open scrolled to the right.
  useEffect(() => {
    const node = scroller.current
    if (node) node.scrollLeft = node.scrollWidth
  }, [grid.weeks.length, project.id])

  function submit() {
    const amount = Number(draft)
    if (!Number.isFinite(amount) || amount <= 0) {
      setHint('Zero is a real answer, and it counts against the pace.')
      setDraft('')
      return
    }
    onLog(amount)
    // The running total is shown right beside this, so do not repeat it here.
    setHint(
      loggedToday > 0
        ? `Added ${formatAmount(amount)}.`
        : `Logged ${formatAmount(amount)} ${project.unitLabel}. Every date above just moved.`,
    )
    setDraft('')
  }

  return (
    <section className="panel">
      <span className="eyebrow">The habit</span>
      <h2>Every day since you started</h2>
      <p className="panel-desc">
        This is the number nobody can estimate about themselves: how often you actually show up. The
        blank squares are what pushes the date out.
      </p>

      <div className="habit-scroll" ref={scroller}>
        <div className="habit-grid">
          <div className="habit-weekdays" aria-hidden="true">
            {WEEKDAYS.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="habit-body">
            <div className="habit-months" aria-hidden="true">
              {grid.months.map((m) => (
                <span key={`${m.label}-${m.index}`} style={{ gridColumn: m.index + 1 }}>
                  {m.label}
                </span>
              ))}
            </div>
            <div className="habit-weeks">
              {grid.weeks.map((week, wi) => (
                <div className="habit-week" key={wi}>
                  {week.map((cell) => {
                    if (!cell.inRange) {
                      return <span className="habit-cell is-out" key={cell.key} />
                    }
                    const lv = level(cell.amount, project.goal.perSession)
                    return (
                      <button
                        type="button"
                        key={cell.key}
                        className={`habit-cell lv-${lv}${cell.key === todayKey ? ' is-today' : ''}`}
                        title={`${formatDate(cell.date)}: ${
                          cell.amount ? `${formatAmount(cell.amount)} ${project.unitLabel}` : 'nothing'
                        }${cell.amount ? '. Click to clear.' : ''}`}
                        aria-label={`${formatDate(cell.date)}, ${
                          cell.amount ? `${formatAmount(cell.amount)} ${project.unitLabel}` : 'nothing recorded'
                        }`}
                        onClick={() => {
                          if (cell.amount > 0 && confirm(`Clear ${formatDate(cell.date)}?`)) {
                            onClearDay(cell.key)
                          }
                        }}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="habit-legend">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((lv) => (
          <i key={lv} className={`habit-cell lv-${lv}`} />
        ))}
        <span>More</span>
      </div>

      <dl className="habit-stats">
        <div>
          <dt>Showed up</dt>
          <dd>
            {stats.daysWorked} of {stats.totalDays} days
            <small>{Math.round(stats.showUpRate * 100)}% of the run</small>
          </dd>
        </div>
        <div>
          <dt>Current streak</dt>
          <dd>
            {stats.currentStreak} {stats.currentStreak === 1 ? 'day' : 'days'}
            <small>
              {stats.daysSinceLast === null
                ? 'nothing logged yet'
                : stats.daysSinceLast === 0
                  ? 'including today'
                  : `last session ${stats.daysSinceLast} ${stats.daysSinceLast === 1 ? 'day' : 'days'} ago`}
            </small>
          </dd>
        </div>
        <div>
          <dt>Best streak</dt>
          <dd>
            {stats.longestStreak} {stats.longestStreak === 1 ? 'day' : 'days'}
            <small>longest gap was {stats.longestGap}</small>
          </dd>
        </div>
      </dl>

      <div className="log-row">
        <div className="field">
          <label htmlFor="log-today">Today&apos;s {project.unitLabel}</label>
          <input
            id="log-today"
            type="number"
            min={0}
            step={10}
            value={draft}
            placeholder="0"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
          />
        </div>
        <button type="button" className="solid-btn" onClick={submit}>
          {loggedToday > 0 ? 'Add to today' : 'Log it'}
        </button>
        <span className="log-hint">
          {loggedToday > 0 && (
            <b className="today-total">
              Today so far: {formatAmount(loggedToday)} {project.unitLabel}.{' '}
            </b>
          )}
          {hint}
        </span>
      </div>
    </section>
  )
}
