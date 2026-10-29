import { useState } from 'react'
import type { Project } from '../lib/types'
import type { EstoriaProject } from '../lib/estoria'
import { fromDayKey } from '../lib/dates'
import { formatAmount, formatDate } from '../lib/format'

interface Props {
  project: Project
  estoria: EstoriaProject[]
  onLink: (entry: EstoriaProject) => void
  onUnlink: () => void
}

export function EstoriaPanel({ project, estoria, onLink, onUnlink }: Props) {
  const link = project.estoria
  const [choice, setChoice] = useState('')
  const linkedEntry = link && estoria.find((e) => e.id === link.projectId)
  const picked = estoria.find((e) => e.id === (choice || estoria[0]?.id))

  return (
    <section className="panel">
      <span className="eyebrow">Estoria</span>
      <h2>Fill the log from your writing</h2>

      {link ? (
        <>
          <p className="panel-desc">
            Linked to <b>{linkedEntry?.name ?? link.name}</b>. From {formatDate(fromDayKey(link.since))}{' '}
            on, each day is the net words you typed in Estoria that day, and your progress is its
            total
            {linkedEntry ? <> ({formatAmount(linkedEntry.total)} words)</> : null}. Days before that
            keep what you logged by hand.
          </p>
          {!linkedEntry && (
            <p className="data-status is-bad" role="status">
              This browser has no Estoria log for that project, so nothing new will arrive here.
              Write in Estoria in this same browser.
            </p>
          )}
          <div className="btn-row">
            <button type="button" className="ghost-btn" onClick={onUnlink}>
              Unlink
            </button>
          </div>
        </>
      ) : estoria.length === 0 ? (
        <p className="panel-desc">
          No Estoria projects in this browser yet. Type in a chapter in Estoria, in this same
          browser, and the project will appear here to link.
        </p>
      ) : (
        <>
          <p className="panel-desc">
            Estoria records the words you type each day. Link a project and this log fills itself:
            no more copying the number across. Words typed on the Android app are not included yet.
          </p>
          <div className="field">
            <label htmlFor="estoria-project">Estoria project</label>
            <select
              id="estoria-project"
              value={picked?.id ?? ''}
              onChange={(e) => setChoice(e.target.value)}
            >
              {estoria.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({formatAmount(e.total)} words)
                </option>
              ))}
            </select>
          </div>
          <div className="btn-row">
            <button type="button" className="ghost-btn" disabled={!picked} onClick={() => picked && onLink(picked)}>
              Link
            </button>
          </div>
        </>
      )}
    </section>
  )
}
