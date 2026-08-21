import type { Project } from '../lib/types'
import { formatDate, formatDelta, formatRate } from '../lib/format'

interface Props {
  project: Project
  value: number
  baselineDays: number
  days: number
  date: Date | null
  onChange: (value: number) => void
}

export function WhatIfSlider({ project, value, baselineDays, days, date, onChange }: Props) {
  const delta = days - baselineDays
  return (
    <section className="panel">
      <span className="eyebrow">The lever</span>
      <h2>What if I showed up more often</h2>
      <p className="panel-desc">
        Frequency moves the date harder than output per session does. Drag it and watch.
      </p>
      <div className="slider-row">
        <input
          type="range"
          min={0.5}
          max={7}
          step={0.5}
          value={value}
          aria-label={`${project.sessionLabel}s per week`}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <div className="slider-out">
          {formatRate(value)} <small>{project.sessionLabel}s / wk</small>
        </div>
        <div className="slider-out slider-date">
          {formatDate(date)}
          <br />
          <small>{Math.round(delta) === 0 ? 'your current pace' : formatDelta(delta)}</small>
        </div>
      </div>
    </section>
  )
}
