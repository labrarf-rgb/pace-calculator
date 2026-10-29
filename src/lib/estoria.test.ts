import { describe, expect, it } from 'vitest'
import { applyEstoria, linkStart, parseEstoriaLog, type EstoriaProject } from './estoria'
import { habitStats, observe, outlook } from './pace'
import { blankProject } from './storage'
import type { Project } from './types'

const NOW = new Date(2026, 9, 29) // 29 Oct 2026, local

function project(overrides: Partial<Project> = {}): Project {
  return {
    ...blankProject('Novel'),
    startDate: '2026-10-01',
    startingAmount: 20000,
    sessions: [
      { date: '2026-10-05', amount: 800 },
      { date: '2026-10-20', amount: 1200 },
    ],
    ...overrides,
  }
}

function entry(days: Record<string, number>, total = 30000): EstoriaProject {
  return { id: 'story_1', name: 'The Drowned City', total, updatedAt: '2026-10-29T10:00:00Z', days }
}

describe('parseEstoriaLog', () => {
  it('reads projects newest first and drops junk days', () => {
    const raw = JSON.stringify({
      version: 1,
      projects: {
        a: { name: 'Old', total: 10, updatedAt: '2026-01-01T00:00:00Z', days: { '2026-01-01': 10 } },
        b: {
          name: 'New',
          total: 99,
          updatedAt: '2026-10-29T00:00:00Z',
          days: { '2026-10-29': -40, 'not-a-day': 5, '2026-10-28': 0, '2026-10-27': 'x' },
        },
      },
    })
    const log = parseEstoriaLog(raw)
    expect(log.map((p) => p.id)).toEqual(['b', 'a'])
    expect(log[0].days).toEqual({ '2026-10-29': -40 })
  })

  it('returns nothing for a missing, broken or unknown-version log', () => {
    expect(parseEstoriaLog(null)).toEqual([])
    expect(parseEstoriaLog('{')).toEqual([])
    expect(parseEstoriaLog(JSON.stringify({ version: 2, projects: {} }))).toEqual([])
  })
})

describe('linkStart', () => {
  it('starts today when Estoria has recorded nothing yet', () => {
    expect(linkStart(project(), entry({}), NOW)).toBe('2026-10-29')
  })
  it('takes in what Estoria already recorded', () => {
    expect(linkStart(project(), entry({ '2026-10-25': 300 }), NOW)).toBe('2026-10-25')
  })
  it('never reaches back before the project began', () => {
    expect(linkStart(project({ sessions: [] }), entry({ '2026-09-01': 300 }), NOW)).toBe('2026-10-01')
  })
  it('never takes over a day already logged by hand', () => {
    expect(linkStart(project(), entry({ '2026-10-10': 300 }), NOW)).toBe('2026-10-21')
  })
  it('keeps today’s hand-logged entry when linking on the same day', () => {
    const p = project({ sessions: [{ date: '2026-10-29', amount: 900 }] })
    const since = linkStart(p, entry({}), NOW)
    expect(since).toBe('2026-10-30')
    const linked = { ...p, estoria: { projectId: 'story_1', name: 'x', since } }
    const patch = applyEstoria(linked, entry({}, 50000))
    expect((patch?.sessions ?? linked.sessions)).toEqual([{ date: '2026-10-29', amount: 900 }])
  })
})

describe('applyEstoria', () => {
  const linked = (since: string) => project({ estoria: { projectId: 'story_1', name: 'x', since } })

  it('keeps hand-logged days before the link and takes Estoria from it on', () => {
    const patch = applyEstoria(linked('2026-10-20'), entry({ '2026-10-20': 500, '2026-10-28': 700 }))!
    expect(patch.sessions).toEqual([
      { date: '2026-10-05', amount: 800 },
      { date: '2026-10-20', amount: 500 },
      { date: '2026-10-28', amount: 700 },
    ])
  })

  it('makes progress equal the Estoria total', () => {
    const p = linked('2026-10-20')
    const patch = applyEstoria(p, entry({ '2026-10-28': 700 }, 30000))!
    const view = outlook({ ...p, ...patch }, NOW)
    expect(view.done).toBe(30000)
  })

  it('is idempotent: applying the same log twice changes nothing', () => {
    const p = linked('2026-10-20')
    const e = entry({ '2026-10-28': 700 })
    const once = { ...p, ...applyEstoria(p, e)! }
    expect(applyEstoria(once, e)).toBeNull()
  })

  it('does nothing for an unlinked project', () => {
    expect(applyEstoria(project(), entry({ '2026-10-28': 700 }))).toBeNull()
  })
})

describe('net days from Estoria', () => {
  const p = project({
    startingAmount: 0,
    sessions: [
      { date: '2026-10-26', amount: 1000 },
      { date: '2026-10-27', amount: -400 },
    ],
  })

  it('counts a negative day as a day worked, and it drags the average', () => {
    const o = observe(p, NOW)
    expect(o.sessionCount).toBe(2)
    expect(o.logged).toBe(600)
    expect(o.perSession).toBe(300)
  })

  it('keeps a revision day in the streak', () => {
    expect(habitStats(p, new Date(2026, 9, 27)).currentStreak).toBe(2)
  })

  it('reports never when the net pace is backwards', () => {
    const backwards = project({ sessions: [{ date: '2026-10-27', amount: -400 }] })
    expect(outlook(backwards, NOW).actual.days).toBe(Infinity)
  })
})
