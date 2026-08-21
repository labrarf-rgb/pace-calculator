import { useMemo } from 'react'
import type { Outlook } from '../lib/pace'
import { cumulativeSeries } from '../lib/pace'
import type { Project } from '../lib/types'
import { daysBetween, fromDayKey, startOfDay } from '../lib/dates'
import { formatCompact, formatDate } from '../lib/format'

interface Props {
  project: Project
  view: Outlook
  now: Date
  /** Days to finish under the what-if slider, drawn as a third ray. */
  whatIfDays: number
}

const W = 760
const H = 300
/* Top and bottom bands are reserved for labels so nothing is drawn over the plot
   or clipped by the viewBox. Two label rows fit in each band. */
const PAD = { left: 52, right: 18, top: 46, bottom: 40 }
const LABEL_SIZE = 10
const MARKER_SIZE = 9
/* Row gaps clear the full glyph box, not just the font size, so stacked labels
   never graze each other. */
const ROW_GAP = 17
const MARKER_ROW_GAP = 15

/** Rough advance width. Good enough to keep text inside the box and off its neighbours. */
function textWidth(text: string, fontSize: number, letterSpacing = 0): number {
  return text.length * (fontSize * 0.55 + letterSpacing) + 4
}

interface Placed {
  x: number
  text: string
  color: string
  row: number
  width: number
}

/**
 * Centre each label on its mark, pull it inside the drawing area so it cannot be
 * truncated, then push any that still overlap onto a second row.
 */
function placeLabels(
  items: Array<{ x: number | null; text: string; color: string }>,
  fontSize: number,
  letterSpacing = 0,
): Placed[] {
  const placed: Placed[] = []
  const candidates = items
    .filter((i): i is { x: number; text: string; color: string } => i.x !== null)
    .sort((a, b) => a.x - b.x)

  for (const item of candidates) {
    const width = textWidth(item.text, fontSize, letterSpacing)
    const half = width / 2
    const x = Math.min(Math.max(item.x, PAD.left + half), W - PAD.right - half)

    // Take the lowest row where this label clears everything already on it.
    let row = 0
    while (
      placed.some(
        (p) => p.row === row && Math.abs(p.x - x) < (p.width + width) / 2 + 6,
      )
    ) {
      row++
    }
    placed.push({ x, text: item.text, color: item.color, row, width })
  }
  return placed
}

export function BurnUpChart({ project, view, now, whatIfDays }: Props) {
  const geom = useMemo(() => {
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom
    const start = startOfDay(fromDayKey(project.startDate))
    const elapsed = Math.max(daysBetween(start, now), 0)
    const target = Math.max(view.target, 1)

    const finite = [view.goal.days, view.actual.days, whatIfDays].filter(Number.isFinite)
    const horizon = finite.length ? Math.min(Math.max(...finite) * 1.08, 3650) : 90
    const maxDay = Math.max(elapsed + horizon, elapsed + 14, 14)

    const x = (day: number) => PAD.left + (day / maxDay) * innerW
    const y = (value: number) => PAD.top + (1 - value / target) * innerH

    return { x, y, elapsed, maxDay, target, innerH }
  }, [project.startDate, now, view.target, view.goal.days, view.actual.days, whatIfDays])

  const { x, y, elapsed } = geom
  const points = cumulativeSeries(project)
  const done = points.at(-1)?.total ?? 0
  const path = [...points, { day: elapsed, total: done }]
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.day).toFixed(1)} ${y(p.total).toFixed(1)}`)
    .join(' ')

  const nowX = x(elapsed)
  const nowY = y(done)
  const topY = y(geom.target)
  const baseY = y(0)
  const startingAmount = Math.max(project.startingAmount ?? 0, 0)
  const floorY = y(Math.min(startingAmount, geom.target))

  const rayX = (days: number) => (Number.isFinite(days) ? x(elapsed + days) : null)
  const goalX = rayX(view.goal.days)
  const actualX = rayX(view.actual.days)
  const whatIfX = rayX(whatIfDays)

  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((f) => geom.target * f)

  const deadlineX = (() => {
    if (!project.deadline) return null
    const day = daysBetween(startOfDay(fromDayKey(project.startDate)), fromDayKey(project.deadline))
    return day > 0 && day < geom.maxDay ? x(day) : null
  })()

  const finishLabels = placeLabels(
    [
      { x: goalX, text: formatDate(view.goal.date), color: 'var(--gold)' },
      { x: actualX, text: formatDate(view.actual.date), color: 'var(--danger)' },
    ],
    LABEL_SIZE,
  )

  const markerLabels = placeLabels(
    [
      { x: nowX, text: 'TODAY', color: 'var(--text-muted)' },
      ...(deadlineX !== null
        ? [{ x: deadlineX, text: 'DEADLINE', color: 'var(--text-muted)' }]
        : []),
    ],
    MARKER_SIZE,
    1,
  )

  return (
    <section className="panel">
      <span className="eyebrow">Where you are</span>
      <h2>Burn up</h2>
      <p className="panel-desc">
        Solid is what you actually recorded. Everything right of today is projection.
      </p>

      <div className="chart-scroll">
        <svg
          className="chart"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Cumulative ${project.unitLabel} over time. Measured pace finishes ${formatDate(view.actual.date)}, goal pace finishes ${formatDate(view.goal.date)}.`}
        >
          {gridValues.map((value) => (
            <g key={value}>
              <line
                x1={PAD.left}
                y1={y(value)}
                x2={W - PAD.right}
                y2={y(value)}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={y(value) + 3.5}
                textAnchor="end"
                fontSize={9.5}
                fill="var(--text-muted)"
                fontFamily="var(--font-body)"
              >
                {formatCompact(value)}
              </text>
            </g>
          ))}

          {/* the spread between goal and measured, as ground the projection sits on */}
          {goalX !== null && actualX !== null && (
            <path
              d={`M${nowX} ${nowY} L${goalX} ${topY} L${actualX} ${topY} Z`}
              fill="var(--danger-soft)"
            />
          )}

          {/* the head start, so it reads as ground you arrived on rather than progress made here */}
          {startingAmount > 0 && (
            <rect
              x={x(0)}
              y={floorY}
              width={Math.max(nowX - x(0), 0)}
              height={Math.max(baseY - floorY, 0)}
              fill="var(--surface-2)"
              stroke="var(--border)"
              strokeWidth={1}
            />
          )}

          <path d={`${path} L${nowX} ${floorY} L${x(0)} ${floorY} Z`} fill="var(--accent-warm-soft)" />

          <line
            x1={PAD.left}
            y1={topY}
            x2={W - PAD.right}
            y2={topY}
            stroke="var(--text-muted)"
            strokeWidth={1}
            strokeDasharray="2 4"
          />

          <Ray from={[nowX, nowY]} to={goalX} topY={topY} color="var(--gold)" dashed />
          <Ray from={[nowX, nowY]} to={whatIfX} topY={topY} color="var(--accent-warm)" dashed />
          <Ray from={[nowX, nowY]} to={actualX} topY={topY} color="var(--danger)" width={2} />

          <path d={path} fill="none" stroke="var(--text)" strokeWidth={2} strokeLinejoin="round" />
          <circle cx={nowX} cy={nowY} r={3.6} fill="var(--text)" />

          {deadlineX !== null && (
            <line
              x1={deadlineX}
              y1={PAD.top}
              x2={deadlineX}
              y2={H - PAD.bottom}
              stroke="var(--text-muted)"
              strokeWidth={1}
              strokeDasharray="1 5"
            />
          )}

          <line
            x1={nowX}
            y1={PAD.top}
            x2={nowX}
            y2={H - PAD.bottom}
            stroke="var(--text-muted)"
            strokeWidth={1}
          />

          {/* finish dates, in the reserved band above the target line */}
          {finishLabels.map((l) => (
            <text
              key={l.text + l.row}
              x={l.x}
              y={PAD.top - 12 - l.row * ROW_GAP}
              textAnchor="middle"
              fontSize={LABEL_SIZE}
              fontWeight={600}
              fill={l.color}
              fontFamily="var(--font-body)"
            >
              {l.text}
            </text>
          ))}

          {/* axis markers, in the reserved band below the plot */}
          {markerLabels.map((l) => (
            <text
              key={l.text + l.row}
              x={l.x}
              y={H - PAD.bottom + 16 + l.row * MARKER_ROW_GAP}
              textAnchor="middle"
              fontSize={MARKER_SIZE}
              letterSpacing={1}
              fill="var(--text-muted)"
              fontFamily="var(--font-body)"
            >
              {l.text}
            </text>
          ))}
        </svg>
      </div>

      <div className="legend">
        <span><i style={{ borderColor: 'var(--text)' }} /> Recorded</span>
        <span><i style={{ borderColor: 'var(--danger)' }} /> Measured pace</span>
        <span><i style={{ borderColor: 'var(--gold)', borderTopStyle: 'dashed' }} /> Goal pace</span>
        <span><i style={{ borderColor: 'var(--accent-warm)', borderTopStyle: 'dashed' }} /> What if</span>
        {startingAmount > 0 && (
          <span>
            <i className="legend-block" /> Already done before tracking
          </span>
        )}
      </div>
    </section>
  )
}

function Ray({
  from,
  to,
  topY,
  color,
  dashed = false,
  width = 1.6,
}: {
  from: [number, number]
  to: number | null
  topY: number
  color: string
  dashed?: boolean
  width?: number
}) {
  if (to === null) return null
  return (
    <g>
      <line
        x1={from[0]}
        y1={from[1]}
        x2={to}
        y2={topY}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dashed ? '5 4' : undefined}
      />
      <circle cx={to} cy={topY} r={3.4} fill={color} />
    </g>
  )
}

