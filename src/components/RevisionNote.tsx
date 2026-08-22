import type { Outlook } from '../lib/pace'
import { clampDaysPerWeek } from '../lib/pace'
import type { Project } from '../lib/types'
import { formatAmount, formatDate, formatDays, formatSpan } from '../lib/format'

interface Props {
  project: Project
  view: Outlook
}

export function RevisionNote({ project, view }: Props) {
  const { observation, deadlineGapDays } = view
  // Nothing tracked means the date comes from intent, not measurement. Say so.
  const paceName = observation.measured ? 'the measured pace' : 'your stated pace'

  return (
    <>
      {observation.measured ? (
        <div className="notice">
          <RefreshIcon />
          <div>
            Adjusted from your log. On the days you worked you averaged{' '}
            <b>{formatAmount(observation.perSession)}</b> {project.unitLabel}, against the{' '}
            {formatAmount(project.goal.perSession)} you set, and you worked{' '}
            <b>{formatDays(observation.sessionsPerWeek)}</b> a week against a goal of{' '}
            {formatDays(clampDaysPerWeek(project.goal.sessionsPerWeek))}. The projection uses the
            measured numbers.
            {observation.startingAmount > 0 && (
              <>
                {' '}
                Your head start of <b>{formatAmount(observation.startingAmount)}</b> counts toward
                the target but is left out of the pace, measured over{' '}
                <b>{observation.elapsedDays}</b> tracked{' '}
                {observation.elapsedDays === 1 ? 'day' : 'days'}.
              </>
            )}
            {observation.provisional &&
              ' The tracked sample is still thin, so treat the date as provisional.'}
          </div>
        </div>
      ) : observation.startingAmount > 0 ? (
        <div className="notice">
          <SeedIcon />
          <div>
            Starting from <b>{formatAmount(observation.startingAmount)}</b> {project.unitLabel}{' '}
            already done, with <b>{formatAmount(view.remaining)}</b> to go. Both dates come from the
            pace you stated, because there is nothing tracked yet. Log a few days and the second one
            starts telling you the truth instead.
          </div>
        </div>
      ) : (
        <div className="notice is-warn">
          <SeedIcon />
          <div>
            Nothing logged yet, so both dates come from the pace you stated. Log a day or two and
            this page starts telling you the truth instead.
          </div>
        </div>
      )}

      {deadlineGapDays !== null && project.deadline && (
        <div className={deadlineGapDays > 0 ? 'notice is-warn' : 'notice'}>
          {deadlineGapDays > 0 ? <AlertIcon /> : <CheckIcon />}
          <div>
            {deadlineGapDays > 0 ? (
              <>
                Your deadline is {formatDate(new Date(project.deadline + 'T00:00:00'))} and{' '}
                {paceName} lands <b>{formatSpan(deadlineGapDays)}</b> past it.
              </>
            ) : (
              <>
                {paceName === 'your stated pace' ? 'Your stated pace' : 'The measured pace'} clears
                your deadline with <b>{formatSpan(deadlineGapDays)}</b> to spare.
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/* Single-weight line icons, matched to the theme toggle. */
function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <svg
      className="notice-mark"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function RefreshIcon() {
  return <Glyph><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></Glyph>
}

function SeedIcon() {
  return <Glyph><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></Glyph>
}

function AlertIcon() {
  return <Glyph><path d="M12 3 2 20h20L12 3z" /><path d="M12 10v4M12 17h.01" /></Glyph>
}

function CheckIcon() {
  return <Glyph><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></Glyph>
}
