import { useRef, useState } from 'react'
import type { Project } from '../lib/types'
import { backupFilename, parseBackup, toBackup } from '../lib/storage'

interface Props {
  projects: Project[]
  onImport: (projects: Project[]) => void
}

export function DataPanel({ projects, onImport }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<{ tone: 'ok' | 'bad'; message: string } | null>(null)

  function backUp() {
    const blob = new Blob([toBackup(projects)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = backupFilename()
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setStatus({
      tone: 'ok',
      message: `Saved ${projects.length} project${projects.length === 1 ? '' : 's'} to your downloads.`,
    })
  }

  async function loadFile(file: File) {
    try {
      const imported = parseBackup(await file.text())
      onImport(imported)
      setStatus({
        tone: 'ok',
        message: `Loaded ${imported.length} project${imported.length === 1 ? '' : 's'}. Nothing already here was replaced.`,
      })
    } catch (error) {
      setStatus({ tone: 'bad', message: error instanceof Error ? error.message : 'Could not read that file.' })
    }
  }

  return (
    <section className="panel">
      <span className="eyebrow">Your data</span>
      <h2>Back up</h2>
      <p className="panel-desc">
        Everything lives in this browser. A backup file is the only copy that survives clearing site
        data.
      </p>

      <div className="btn-row">
        <button type="button" className="ghost-btn" onClick={backUp}>
          Save to file
        </button>
        <button type="button" className="ghost-btn" onClick={() => fileInput.current?.click()}>
          Load a file
        </button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void loadFile(file)
          e.target.value = ''
        }}
      />

      {status && (
        <p className={`data-status${status.tone === 'bad' ? ' is-bad' : ''}`} role="status">
          {status.message}
        </p>
      )}
    </section>
  )
}
