import { describe, expect, it } from 'vitest'
import { backupFilename, blankProject, parseBackup, toBackup } from './storage'

describe('backup round trip', () => {
  it('survives export and import', () => {
    const a = blankProject('Novel')
    a.sessions = [{ date: '2026-08-01', amount: 900 }]
    const restored = parseBackup(toBackup([a]))
    expect(restored).toHaveLength(1)
    expect(restored[0].name).toBe('Novel')
    expect(restored[0].sessions).toEqual(a.sessions)
  })

  it('gives imported projects fresh ids so they cannot collide', () => {
    const a = blankProject('Novel')
    expect(parseBackup(toBackup([a]))[0].id).not.toBe(a.id)
  })

  it('accepts a bare array of projects', () => {
    const a = blankProject('Novel')
    expect(parseBackup(JSON.stringify([a]))[0].name).toBe('Novel')
  })

  it('accepts an app state dump', () => {
    const a = blankProject('Novel')
    expect(parseBackup(JSON.stringify({ version: 1, projects: [a] }))[0].name).toBe('Novel')
  })

  it('fills in fields an older file is missing', () => {
    const restored = parseBackup(JSON.stringify([{ id: 'x', name: 'Sparse' }]))
    expect(restored[0].goal.sessionsPerWeek).toBeGreaterThan(0)
    expect(restored[0].sessions).toEqual([])
    expect(restored[0].unitLabel).toBeTruthy()
  })

  it('drops malformed sessions rather than importing NaN', () => {
    const restored = parseBackup(
      JSON.stringify([{ id: 'x', name: 'Messy', sessions: [{ date: '2026-08-01', amount: 'lots' }, { date: '2026-08-02', amount: 500 }] }]),
    )
    expect(restored[0].sessions).toEqual([{ date: '2026-08-02', amount: 500 }])
  })

  it('refuses junk with a message worth showing the user', () => {
    expect(() => parseBackup('not json')).toThrow(/valid JSON/)
    expect(() => parseBackup('{"nope":1}')).toThrow(/No projects/)
    expect(() => parseBackup('[]')).toThrow(/No readable projects/)
    expect(() => parseBackup('[{"missing":"id"}]')).toThrow(/No readable projects/)
  })
})

describe('backupFilename', () => {
  it('is dated and json', () => {
    expect(backupFilename(new Date(2026, 7, 20))).toBe('pace-backup-2026-08-20.json')
  })
})

describe('head start survives a backup', () => {
  it('round trips', () => {
    const a = blankProject('Half finished')
    a.startingAmount = 40000
    expect(parseBackup(toBackup([a]))[0].startingAmount).toBe(40000)
  })

  it('defaults to zero for files written before the field existed', () => {
    const restored = parseBackup(JSON.stringify([{ id: 'x', name: 'Old save' }]))
    expect(restored[0].startingAmount).toBe(0)
  })
})
