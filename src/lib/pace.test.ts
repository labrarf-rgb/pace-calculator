import { describe, expect, it } from 'vitest'
import { cumulativeSeries, daysToFinish, habitGrid, habitStats, ledger, observe, outlook, resolveTarget } from './pace'
import { toDayKey } from './dates'
import type { Project, Session } from './types'

const NOW = new Date(2026, 7, 20) // 20 Aug 2026, local

/** The novel from the concept mockup: 15 chapters of 5,000, logged since 1 Jun. */
function novel(overrides: Partial<Project> = {}): Project {
  const offsets: Array<[number, number]> = [
    [1, 1200], [3, 900], [4, 1100], [8, 800], [10, 1300], [11, 950], [15, 1000],
    [18, 700], [22, 1150], [25, 800], [31, 600], [38, 1050], [45, 700],
    [59, 900], [66, 650], [73, 1000], [77, 800],
  ]
  const start = new Date(2026, 5, 1)
  const sessions: Session[] = offsets.map(([off, amount]) => ({
    date: toDayKey(new Date(2026, 5, 1 + off)),
    amount,
  }))
  return {
    id: 'p1',
    name: 'Untitled Novel',
    unitLabel: 'words',
    sessionLabel: 'sitting',
    segmentLabel: 'chapter',
    segments: { count: 15, per: 5000 },
    target: 75000,
    startingAmount: 0,
    startDate: toDayKey(start),
    goal: { sessionsPerWeek: 5, perSession: 1000 },
    sessions,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('resolveTarget', () => {
  it('derives the target from segments when present', () => {
    expect(resolveTarget({ target: 1, segments: { count: 15, per: 5000 } })).toBe(75000)
  })
  it('falls back to the flat target', () => {
    expect(resolveTarget({ target: 42195 })).toBe(42195)
  })
  it('ignores degenerate segments', () => {
    expect(resolveTarget({ target: 900, segments: { count: 0, per: 5000 } })).toBe(900)
  })
})

describe('daysToFinish', () => {
  it('returns zero when there is nothing left', () => {
    expect(daysToFinish(0, 3, 500)).toBe(0)
    expect(daysToFinish(-100, 3, 500)).toBe(0)
  })
  it('returns Infinity when the pace never arrives', () => {
    expect(daysToFinish(1000, 0, 500)).toBe(Infinity)
    expect(daysToFinish(1000, 3, 0)).toBe(Infinity)
  })
  it('halving the rate doubles the time', () => {
    expect(daysToFinish(1000, 2, 100)).toBeCloseTo(daysToFinish(1000, 1, 100) / 2)
  })
})

describe('observe', () => {
  it('counts the zero days against the pace', () => {
    const o = observe(novel(), NOW)
    expect(o.sessionCount).toBe(17)
    expect(o.elapsedDays).toBe(81) // 1 Jun through 20 Aug, inclusive
    expect(o.done).toBe(15600)
    expect(o.perSession).toBeCloseTo(917.6, 1)
    // 17 sessions across ~11.6 weeks, nowhere near the stated 5 a week
    expect(o.sessionsPerWeek).toBeCloseTo(1.47, 2)
    expect(o.measured).toBe(true)
    expect(o.provisional).toBe(false)
  })

  it('falls back to the stated goal when nothing is logged', () => {
    const o = observe(novel({ sessions: [] }), NOW)
    expect(o.measured).toBe(false)
    expect(o.provisional).toBe(true)
    expect(o.sessionsPerWeek).toBe(5)
    expect(o.perSession).toBe(1000)
    expect(o.done).toBe(0)
  })

  it('flags a thin sample as provisional', () => {
    const p = novel({
      startDate: toDayKey(new Date(2026, 7, 18)),
      sessions: [{ date: toDayKey(new Date(2026, 7, 19)), amount: 500 }],
    })
    expect(observe(p, NOW).provisional).toBe(true)
  })

  it('ignores zero-amount entries', () => {
    const p = novel({ sessions: [{ date: toDayKey(new Date(2026, 6, 1)), amount: 0 }] })
    expect(observe(p, NOW).sessionCount).toBe(0)
    expect(observe(p, NOW).measured).toBe(false)
  })
})

describe('outlook', () => {
  it('puts the honest date far behind the stated one', () => {
    const view = outlook(novel(), NOW)
    expect(view.target).toBe(75000)
    expect(view.remaining).toBe(59400)
    expect(Math.round(view.goal.days)).toBe(83)    // ~10 Nov 2026
    expect(Math.round(view.actual.days)).toBe(308) // ~24 Jun 2027
    expect(Math.round(view.gapDays)).toBe(225)
    expect(view.complete).toBe(false)
  })

  it('reports completion once the target is met', () => {
    const p = novel({ segments: { count: 1, per: 1000 }, target: 1000 })
    const view = outlook(p, NOW)
    expect(view.complete).toBe(true)
    expect(view.remaining).toBe(0)
    expect(view.actual.days).toBe(0)
  })

  it('measures the deadline miss in days', () => {
    const view = outlook(novel({ deadline: '2027-01-31' }), NOW)
    expect(view.deadlineGapDays).toBeGreaterThan(100)
  })

  it('leaves the deadline gap null when no deadline is set', () => {
    expect(outlook(novel(), NOW).deadlineGapDays).toBeNull()
  })
})

describe('ledger', () => {
  const rows = ledger(novel(), NOW)
  const byId = (id: string) => rows.find((r) => r.id === id)!

  it('anchors on the unchanged pace', () => {
    const base = byId('baseline')
    expect(base.isBaseline).toBe(true)
    expect(base.delta).toBe(0)
  })

  it('prices a skipped week at exactly seven days', () => {
    expect(byId('skip-week').delta).toBeCloseTo(7)
  })

  it('shows frequency beating volume', () => {
    // Half the output every day beats the current burst pattern by months.
    expect(byId('daily-half').delta).toBeLessThan(-150)
  })

  it('makes one extra session a week worth months', () => {
    expect(byId('plus-one').delta).toBeLessThan(-100)
    expect(byId('plus-two').delta).toBeLessThan(byId('plus-one').delta)
  })

  it('offers trimming the target only when segments exist', () => {
    expect(byId('trim-target').delta).toBeLessThan(0)
    expect(ledger(novel({ segments: undefined }), NOW).find((r) => r.id === 'trim-target')).toBeUndefined()
  })
})

describe('habitGrid', () => {
  it('covers the whole project, not a fixed window', () => {
    const grid = habitGrid(novel(), NOW)
    const inRange = grid.weeks.flat().filter((c) => c.inRange)
    // 1 Jun through 20 Aug inclusive
    expect(inRange).toHaveLength(81)
    expect(inRange[0].key).toBe('2026-06-01')
    expect(inRange.at(-1)!.key).toBe('2026-08-20')
  })

  it('lines every column up on weekdays', () => {
    const grid = habitGrid(novel(), NOW)
    for (const week of grid.weeks) {
      expect(week).toHaveLength(7)
      expect(week[0].date.getDay()).toBe(0)
      expect(week[6].date.getDay()).toBe(6)
    }
  })

  it('marks padding outside the project as out of range', () => {
    const grid = habitGrid(novel(), NOW)
    const padding = grid.weeks[0].filter((c) => !c.inRange)
    expect(padding.length).toBeGreaterThan(0)
    expect(padding.every((c) => c.amount === 0)).toBe(true)
  })

  it('carries every logged amount through', () => {
    const grid = habitGrid(novel(), NOW)
    const total = grid.weeks.flat().reduce((sum, c) => sum + c.amount, 0)
    expect(total).toBe(15600)
  })

  it('labels each month once, in order', () => {
    const labels = habitGrid(novel(), NOW).months
    expect(labels.map((m) => m.label)).toEqual(['Jun', 'Jul', 'Aug'])
    expect(labels[0].index).toBeLessThan(labels[1].index)
  })

  it('handles a project that started today', () => {
    const grid = habitGrid(novel({ startDate: toDayKey(NOW), sessions: [] }), NOW)
    expect(grid.weeks.length).toBeGreaterThanOrEqual(1)
    expect(grid.weeks.flat().filter((c) => c.inRange)).toHaveLength(1)
  })
})

describe('habitStats', () => {
  it('reports the show-up rate that the projection rests on', () => {
    const stats = habitStats(novel(), NOW)
    expect(stats.totalDays).toBe(81)
    expect(stats.daysWorked).toBe(17)
    expect(stats.showUpRate).toBeCloseTo(0.21, 2)
  })

  it('finds the longest streak and the longest gap', () => {
    const stats = habitStats(novel(), NOW)
    expect(stats.longestStreak).toBe(2) // days 3 and 4, and days 10 and 11
    expect(stats.longestGap).toBe(13)   // between day 45 and day 59
  })

  it('counts days since the last session', () => {
    // last seeded session is day 77, which is 17 Aug
    expect(habitStats(novel(), NOW).daysSinceLast).toBe(3)
  })

  it('keeps a streak alive on a blank today', () => {
    const yesterday = toDayKey(new Date(2026, 7, 19))
    const p = novel({ sessions: [{ date: yesterday, amount: 500 }] })
    expect(habitStats(p, NOW).currentStreak).toBe(1)
  })

  it('breaks a streak once a full day is missed', () => {
    const p = novel({ sessions: [{ date: toDayKey(new Date(2026, 7, 17)), amount: 500 }] })
    expect(habitStats(p, NOW).currentStreak).toBe(0)
  })

  it('reports nothing logged without dividing by zero', () => {
    const stats = habitStats(novel({ sessions: [] }), NOW)
    expect(stats.daysWorked).toBe(0)
    expect(stats.showUpRate).toBe(0)
    expect(stats.daysSinceLast).toBeNull()
    expect(stats.currentStreak).toBe(0)
  })
})

describe('a head start, for work done before tracking began', () => {
  /** The realistic case: 40,000 words already written, tracking starts today. */
  function midProject(overrides: Partial<Project> = {}): Project {
    return novel({
      startingAmount: 40000,
      startDate: toDayKey(NOW),
      sessions: [],
      ...overrides,
    })
  }

  it('counts toward the target', () => {
    const view = outlook(midProject(), NOW)
    expect(view.done).toBe(40000)
    expect(view.remaining).toBe(35000)
  })

  it('never counts toward the measured pace', () => {
    // One 800-word day logged. The average session must be 800, not 40,800.
    const p = midProject({ sessions: [{ date: toDayKey(NOW), amount: 800 }] })
    const o = observe(p, NOW)
    expect(o.perSession).toBe(800)
    expect(o.logged).toBe(800)
    expect(o.startingAmount).toBe(40000)
    expect(o.done).toBe(40800)
  })

  it('is the difference between a sane projection and a fantasy one', () => {
    // Logging the back catalogue as a session is the trap this feature exists to avoid.
    const honest = midProject({ sessions: [{ date: toDayKey(NOW), amount: 800 }] })
    const faked = novel({
      startingAmount: 0,
      startDate: toDayKey(NOW),
      sessions: [{ date: toDayKey(NOW), amount: 40800 }],
    })
    expect(outlook(honest, NOW).done).toBe(outlook(faked, NOW).done)
    // Same progress, wildly different pace, so wildly different dates.
    expect(outlook(faked, NOW).actual.days).toBeLessThan(outlook(honest, NOW).actual.days / 10)
  })

  it('measures elapsed days from the tracking start, not the work start', () => {
    expect(observe(midProject(), NOW).elapsedDays).toBe(1)
  })

  it('is useful on day one, before anything is logged', () => {
    const view = outlook(midProject(), NOW)
    expect(view.observation.measured).toBe(false)
    // 35,000 left at the stated 5 x 1,000 a week is seven weeks, projected from
    // where the writer actually is rather than from zero.
    expect(Math.round(view.goal.days)).toBe(49)
  })

  it('can already be complete', () => {
    const view = outlook(midProject({ startingAmount: 80000 }), NOW)
    expect(view.complete).toBe(true)
    expect(view.remaining).toBe(0)
  })

  it('treats a missing or negative value as zero', () => {
    expect(observe(novel({ startingAmount: undefined as unknown as number }), NOW).startingAmount).toBe(0)
    expect(observe(novel({ startingAmount: -500 }), NOW).startingAmount).toBe(0)
  })

  it('starts the burn-up curve at the head start', () => {
    const points = cumulativeSeries(midProject({ sessions: [{ date: toDayKey(NOW), amount: 800 }] }))
    expect(points[0]).toEqual({ day: 0, total: 40000 })
    expect(points.at(-1)!.total).toBe(40800)
  })

  it('leaves the habit history measuring tracked days only', () => {
    const stats = habitStats(midProject(), NOW)
    expect(stats.totalDays).toBe(1)
    expect(stats.daysWorked).toBe(0)
  })
})
