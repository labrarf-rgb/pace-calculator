import type { Outlook } from '../lib/pace'
import { clampDaysPerWeek } from '../lib/pace'
import type { Project } from '../lib/types'
import { formatAmount, formatDate, formatDays, formatSpan } from '../lib/format'

interface Props {
  project: Project
  view: Outlook
}

export function HeroDates({ project, view }: Props) {
  const { observation, goal, actual, gapDays, complete } = view
  const ahead = gapDays < 0

  if (complete) {
    return (
      <div className="hero">
        <div className="date-cell">
          <span className="eyebrow eyebrow-mute">Finished</span>
          <div className="date-big">{formatAmount(view.done)} {project.unitLabel}</div>
          <div className="date-cap">You hit the target. Nothing left to project.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="hero">
      <div className="hero-dates">
        <div className="date-cell is-goal">
          <span className="eyebrow eyebrow-mute">The date you are aiming at</span>
          <div className="date-big">{formatDate(goal.date)}</div>
          <div className="date-cap">
            {formatDays(clampDaysPerWeek(project.goal.sessionsPerWeek))} a week at{' '}
            {formatAmount(project.goal.perSession)} {project.unitLabel}
          </div>
        </div>
        <div className="date-cell">
          <span className="eyebrow eyebrow-mute">The date you are actually on</span>
          <div className="date-big">{formatDate(actual.date)}</div>
          <div className="date-cap">
            {observation.measured
              ? `Your last ${observation.elapsedDays} tracked ${observation.elapsedDays === 1 ? 'day' : 'days'}, zeros included`
              : 'Nothing tracked yet, so this mirrors your stated pace'}
          </div>
        </div>
      </div>
      <div className="hero-gap">
        <span className={`gap-figure${ahead || !observation.measured ? ' is-ahead' : ''}`}>
          {!observation.measured
            ? 'Not yet known'
            : Number.isFinite(gapDays)
              ? formatSpan(gapDays)
              : 'never'}
        </span>
        <span className="gap-say">
          {!observation.measured
            ? 'The two dates match because both are guesses. The gap only becomes real once you log a few days.'
            : !Number.isFinite(gapDays)
              ? 'At this pace the target never arrives. Change something below.'
              : ahead
                ? 'ahead of your own goal. Rare, and worth noticing.'
                : Math.round(gapDays) === 0
                  ? 'between the two. You are keeping the pace you claim.'
                  : 'is the distance between the two. That is what the missed days are costing you.'}
        </span>
      </div>
    </div>
  )
}
