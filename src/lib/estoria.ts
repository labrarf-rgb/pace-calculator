import type { Project, Session } from './types'
import { addDays, fromDayKey, toDayKey } from './dates'
import { totalLogged } from './pace'

/**
 * The link to Estoria, the story-mapping app served from the same origin
 * (www.labrarf.com/estoria). Estoria records the net words typed per project
 * per day under this localStorage key, and a linked Pace project takes its log
 * from there instead of from the number box.
 *
 * Estoria measures it as you type rather than Pace diffing the book's total,
 * because a total diffed whenever Pace happens to be opened lands several days
 * of writing on one day and counts version switches and restores as writing.
 * The shape is defined in Estoria's `src/lib/wordLog.ts`; this side only reads.
 */
export const ESTORIA_LOG_KEY = 'estoria.wordLog.v1'

export interface EstoriaProject {
  id: string
  name: string
  /** Words in the whole project now, as Estoria's board counts them. */
  total: number
  updatedAt: string
  /** Net words typed per local day. A revision day can be negative. */
  days: Record<string, number>
}

/** Every Estoria project in this browser's log, most recently written first. */
export function parseEstoriaLog(raw: string | null): EstoriaProject[] {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  const log = parsed as { version?: unknown; projects?: unknown }
  if (log?.version !== 1 || !log.projects || typeof log.projects !== 'object') return []

  const out: EstoriaProject[] = []
  for (const [id, value] of Object.entries(log.projects as Record<string, unknown>)) {
    const p = value as Partial<EstoriaProject> | null
    if (!p || typeof p !== 'object') continue
    const days: Record<string, number> = {}
    for (const [day, n] of Object.entries(p.days ?? {})) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(n) && n !== 0) days[day] = Number(n)
    }
    out.push({
      id,
      name: typeof p.name === 'string' && p.name.trim() ? p.name : 'Untitled',
      total: Number.isFinite(p.total) ? Number(p.total) : 0,
      updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : '',
      days,
    })
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function readEstoriaLog(): EstoriaProject[] {
  if (typeof localStorage === 'undefined') return []
  try {
    return parseEstoriaLog(localStorage.getItem(ESTORIA_LOG_KEY))
  } catch {
    return []
  }
}

/**
 * The first day a new link takes over. Anything Estoria already recorded counts,
 * back to the project's own start, but never earlier: days before `startDate`
 * are outside the window the pace is measured over. With nothing recorded yet,
 * the link starts today, and the days before it keep what was logged by hand.
 *
 * **It never takes over a day already in the log.** Linking on a day you have
 * logged by hand would otherwise replace that entry with whatever Estoria has,
 * which on the first day is nothing: words typed before Estoria started
 * recording can never arrive. So the link starts the day after the last logged
 * day, and re-linking after an unlink keeps any correction made in between.
 */
export function linkStart(project: Project, entry: EstoriaProject, now: Date = new Date()): string {
  const today = toDayKey(now)
  const earliest = Object.keys(entry.days).sort()[0]
  let from = earliest && earliest < today ? earliest : today
  if (from < project.startDate) from = project.startDate
  const lastLogged = project.sessions.map((s) => s.date).sort().at(-1)
  if (lastLogged && lastLogged >= from) from = toDayKey(addDays(fromDayKey(lastLogged), 1))
  return from
}

/**
 * The project as the link says it should be: days before the link keep their
 * hand-logged amounts, days from it on are Estoria's, **set rather than added**
 * so reading the log twice changes nothing. The head start becomes whatever
 * makes progress equal Estoria's total, so the bar matches the book.
 *
 * Returns null when nothing would change, so callers can skip the write.
 */
export function applyEstoria(project: Project, entry: EstoriaProject): Pick<Project, 'sessions' | 'startingAmount'> | null {
  const link = project.estoria
  if (!link) return null
  const kept = project.sessions.filter((s) => s.date < link.since)
  const linked: Session[] = Object.entries(entry.days)
    .filter(([day]) => day >= link.since)
    .map(([date, amount]) => ({ date, amount }))
  const sessions = [...kept, ...linked].sort((a, b) => a.date.localeCompare(b.date))
  const startingAmount = Math.max(entry.total - totalLogged(sessions), 0)

  const before = [...project.sessions].sort((a, b) => a.date.localeCompare(b.date))
  const same =
    startingAmount === project.startingAmount &&
    sessions.length === before.length &&
    sessions.every((s, i) => before[i].date === s.date && before[i].amount === s.amount)
  return same ? null : { sessions, startingAmount }
}
