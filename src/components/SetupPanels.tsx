import type { Project } from '../lib/types'
import type { Outlook } from '../lib/pace'
import { MAX_DAYS_PER_WEEK, clampDaysPerWeek, resolveTarget } from '../lib/pace'
import { formatAmount } from '../lib/format'
import { NumberField } from './NumberField'
import { TextField } from './TextField'

interface Props {
  project: Project
  view: Outlook
  onPatch: (patch: Partial<Project>) => void
}

export function TargetPanel({ project, view, onPatch }: Props) {
  const { startingAmount, logged } = view.observation
  const segments = project.segments
  const target = resolveTarget(project)
  const segLabel = project.segmentLabel || 'chapter'

  return (
    <section className="panel">
      <span className="eyebrow">The target</span>
      <h2 className="visually-hidden">Project setup</h2>
      <TextField
        id="project-name"
        label="Project name"
        value={project.name}
        onChange={(name) => onPatch({ name })}
      />

      <div className="field-pair">
        <TextField
          id="unit-label"
          label="Counting"
          value={project.unitLabel}
          placeholder="words"
          onChange={(unitLabel) => onPatch({ unitLabel })}
        />
        <div />
      </div>

      {segments ? (
        <>
          <div className="field-pair">
            <NumberField
              id="seg-count"
              label={`${segLabel}s`}
              value={segments.count}
              min={1}
              onChange={(count) =>
                onPatch({ segments: { ...segments, count }, target: count * segments.per })
              }
            />
            <NumberField
              id="seg-per"
              label={`${project.unitLabel} each`}
              value={segments.per}
              min={1}
              step={100}
              onChange={(per) =>
                onPatch({ segments: { ...segments, per }, target: segments.count * per })
              }
            />
          </div>
          <button
            type="button"
            className="ghost-btn"
            style={{ marginBottom: 12 }}
            onClick={() => onPatch({ segments: undefined, target })}
          >
            Use a flat total
          </button>
        </>
      ) : (
        <>
          <NumberField
            id="flat-target"
            label={`Total ${project.unitLabel}`}
            value={project.target}
            min={1}
            step={100}
            onChange={(t) => onPatch({ target: t })}
          />
          <button
            type="button"
            className="ghost-btn"
            style={{ marginBottom: 12 }}
            onClick={() =>
              onPatch({ segments: { count: 15, per: Math.max(Math.round(target / 15), 1) } })
            }
          >
            Split into {segLabel}s
          </button>
        </>
      )}

      <NumberField
        id="starting-amount"
        label={`Already done before tracking`}
        value={project.startingAmount}
        min={0}
        step={100}
        hint={`Work you finished before you started using Pace. It counts toward the target and is left out of your pace, so it cannot distort the projection.`}
        onChange={(startingAmount) => onPatch({ startingAmount })}
      />

      <div className="derived">
        Target: <b>{formatAmount(target)}</b> {project.unitLabel}.{' '}
        {startingAmount > 0 ? (
          <>
            You arrived with <b>{formatAmount(startingAmount)}</b> and have logged{' '}
            <b>{formatAmount(logged)}</b> since.{' '}
          </>
        ) : (
          <>
            Recorded so far: <b>{formatAmount(logged)}</b>.{' '}
          </>
        )}
        <b>{formatAmount(view.remaining)}</b> to go.
      </div>
    </section>
  )
}

export function IntentPanel({ project, onPatch }: Omit<Props, 'view'>) {
  return (
    <section className="panel">
      <span className="eyebrow">The intent</span>
      <h2>What I mean to do</h2>
      <p className="panel-desc">The pace you would tell someone about.</p>

      <div className="field-pair">
        <NumberField
          id="goal-spw"
          label="Days a week"
          value={clampDaysPerWeek(project.goal.sessionsPerWeek)}
          min={1}
          max={MAX_DAYS_PER_WEEK}
          onChange={(sessionsPerWeek) =>
            onPatch({
              goal: { ...project.goal, sessionsPerWeek: clampDaysPerWeek(sessionsPerWeek) },
            })
          }
        />
        <NumberField
          id="goal-per"
          label={`${project.unitLabel} a day`}
          value={project.goal.perSession}
          min={1}
          step={50}
          onChange={(perSession) => onPatch({ goal: { ...project.goal, perSession } })}
        />
      </div>

      <div className="field-stack">
        <TextField
          id="start-date"
          label="Tracking since"
          type="date"
          value={project.startDate}
          hint="The day your log begins. Your pace is measured from here, so set it to when you started logging, not when you started the work."
          onChange={(startDate) => onPatch({ startDate })}
        />
        <TextField
          id="deadline"
          label="Deadline"
          type="date"
          value={project.deadline ?? ''}
          onChange={(deadline) => onPatch({ deadline: deadline || undefined })}
        />
      </div>
    </section>
  )
}
