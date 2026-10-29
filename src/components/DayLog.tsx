import { useState } from 'react'
import type { Project } from '../lib/types'
import type { Outlook } from '../lib/pace'
import { dayLog } from '../lib/pace'
import { toDayKey } from '../lib/dates'
import { formatAmount, formatDate } from '../lib/format'

interface Props {
  project: Project
  view: Outlook
  now: Date
  onSetDay: (dayKey: string, amount: number) => void
}

export function DayLog({ project, view, now, onSetDay }: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const rows = dayLog(project)
  const { startingAmount, logged } = view.observation
  const todayKey = toDayKey(now)

  function beginEdit(key: string, amount: number) {
    setEditing(key)
    setDraft(String(Math.round(amount)))
  }

  function commit(key: string) {
    const amount = Number(draft)
    if (Number.isFinite(amount) && amount >= 0) onSetDay(key, amount)
    setEditing(null)
  }

  return (
    <section className="panel">
      <span className="eyebrow">The log</span>
      <h2>Every day you recorded</h2>
      <p className="panel-desc">
        Logging more than once in a day adds to that day. Click any amount to correct it, or set it
        to zero to remove the day.
      </p>

      <dl className="totals">
        {startingAmount > 0 && (
          <div>
            <dt>Before tracking</dt>
            <dd>{formatAmount(startingAmount)}</dd>
          </div>
        )}
        <div>
          <dt>Logged since</dt>
          <dd>{formatAmount(logged)}</dd>
        </div>
        <div className="totals-strong">
          <dt>Total</dt>
          <dd>
            {formatAmount(view.done)}
            <small>
              of {formatAmount(view.target)} {project.unitLabel}
            </small>
          </dd>
        </div>
        <div>
          <dt>Left to go</dt>
          <dd>{formatAmount(view.remaining)}</dd>
        </div>
      </dl>

      {rows.length === 0 ? (
        <p className="log-empty">
          Nothing logged yet. The first number you record shows up here.
        </p>
      ) : (
        <div className="log-scroll">
          <table className="ledger day-log">
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col" className="right">{project.unitLabel}</th>
                <th scope="col" className="right">Total by then</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className={row.key === todayKey ? 'is-today-row' : undefined}>
                  <td>
                    {formatDate(row.date)}
                    {row.key === todayKey && <small>today</small>}
                  </td>
                  <td className="right delta">
                    {project.estoria && row.key >= project.estoria.since ? (
                      <span className="day-amount" title="From Estoria">
                        {formatAmount(row.amount)}
                      </span>
                    ) : editing === row.key ? (
                      <input
                        className="day-edit"
                        type="number"
                        min={0}
                        step={10}
                        autoFocus
                        value={draft}
                        aria-label={`Amount for ${formatDate(row.date)}`}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => commit(row.key)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commit(row.key)
                          if (e.key === 'Escape') setEditing(null)
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="day-amount"
                        onClick={() => beginEdit(row.key, row.amount)}
                        title={`Edit ${formatDate(row.date)}`}
                      >
                        {formatAmount(row.amount)}
                      </button>
                    )}
                  </td>
                  <td className="right when">{formatAmount(row.runningTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
