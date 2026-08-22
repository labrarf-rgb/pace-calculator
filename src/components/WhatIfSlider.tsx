import type { Project } from '../lib/types'
import type { LeverRange } from '../lib/pace'
import { clampDaysPerWeek } from '../lib/pace'
import { formatAmount, formatDate, formatDays, formatDelta, formatRate } from '../lib/format'

interface Props {
  project: Project
  value: number
  range: LeverRange
  /** Sessions per week the log actually shows. */
  observedSpw: number
  /** Amount per session the what-if holds constant. */
  perSession: number
  baselineDays: number
  days: number
  date: Date | null
  /** Goal frequency held at your measured output. */
  goalFrequencyDate: Date | null
  /** Goal frequency at the goal's own output, which is the hero's gold date. */
  goalDate: Date | null
  onChange: (value: number) => void
  onReset: () => void
}

export function WhatIfSlider({
  project,
  value,
  range,
  observedSpw,
  perSession,
  baselineDays,
  days,
  date,
  goalFrequencyDate,
  goalDate,
  onChange,
  onReset,
}: Props) {
  const delta = days - baselineDays
  const goalSpw = clampDaysPerWeek(project.goal.sessionsPerWeek)
  const atBaseline = Math.abs(value - observedSpw) < 0.01
  const moved = project.whatIfSessionsPerWeek !== undefined

  const marks = [
    { id: 'pace', label: 'Your pace', at: observedSpw },
    { id: 'goal', label: 'Your goal', at: goalSpw },
  ].filter((m) => m.at >= range.min && m.at <= range.max)

  return (
    <section className="panel">
      <span className="eyebrow">The lever</span>
      <h2>What if I showed up more often</h2>
      <p className="panel-desc">
        How often you show up moves the date harder than how much you produce. This changes only
        the number of days a week you work, holding each of those days at the{' '}
        <strong>{formatAmount(perSession)} {project.unitLabel}</strong> your log actually averages.
      </p>

      <div className="slider-row">
        <input
          type="range"
          min={range.min}
          max={range.max}
          step={range.step}
          value={value}
          aria-label="Days a week"
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <div className="slider-out">
          {formatRate(value)} <small>{value === 1 ? 'day' : 'days'} a week</small>
        </div>
        <div className="slider-out slider-date">
          {formatDate(date)}
          <br />
          <small>{atBaseline ? 'your current pace' : formatDelta(delta)}</small>
        </div>
      </div>

      <div className="slider-marks">
        {marks.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`slider-mark${Math.abs(value - m.at) < 0.01 ? ' is-on' : ''}`}
            onClick={() => onChange(m.at)}
          >
            {m.label} <span className="num">{formatRate(m.at)}</span>
          </button>
        ))}
        {moved && (
          <button type="button" className="slider-mark is-reset" onClick={onReset}>
            Reset
          </button>
        )}
      </div>

      {goalFrequencyDate && goalDate && (
        <p className="slider-note">
          At the {formatDays(goalSpw)} a week you set, keeping your real{' '}
          {formatAmount(perSession)}, you finish <strong>{formatDate(goalFrequencyDate)}</strong>.
          Hitting the full {formatAmount(project.goal.perSession)} you aim for as well makes it{' '}
          <strong>{formatDate(goalDate)}</strong>.
        </p>
      )}
    </section>
  )
}
