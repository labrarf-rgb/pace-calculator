# Pace

Work out the finish date your log actually implies, then see what every choice
costs you in days.

Most pace calculators let you enter your *good day* number and hand back a
fantasy date. Pace measures the real rate from a log that counts the days you
did nothing, shows that date beside the one you were aiming at, and prices each
change you could make to close the gap.

## What it does

**Two dates, not one.** The date your stated goal implies, and the date your log
implies, side by side. The distance between them is the largest number on the
page.

**Measures the variable you cannot self-report.** Nobody knows how often they
actually sit down. Days worked per week is derived from the log and divided by
*elapsed* weeks, so the zero days are in the denominator where they belong. It
never divides by less than one whole week, because a weekly rate you have not
observed for a week is a guess, and it caps at seven, because that is how many
days a week has.

**Works when you are already halfway.** Most people find a tool like this partway
through the work. A project carries a head start: the amount finished before
tracking began. It counts toward the target and is deliberately excluded from
every pace figure, because logging a back catalogue as one giant session would
turn the projection into fiction. Progress and pace are measured separately.

**Prices decisions in days.** The cost ledger runs the same projection with one
input changed at a time, so every row is directly comparable. Skipping a week,
working one more day, halving your daily output but showing up every day.

**A continuous history, not a rolling window.** Every day from the project start
to today, as a calendar. The blank squares are the argument.

**A what-if lever that respects your settings.** It spans a week, marks both
your measured pace and the goal you set, and remembers where you parked it per
project, so a scenario survives a reload and does not follow you into a
different project.

**A readable log.** Every recorded day with its amount and the running total as
it stood that day, plus the totals for the head start, everything logged since,
and what is left. Logging more than once in a day adds to that day rather than
replacing it, and any day's amount can be corrected in place or zeroed to remove
it.

**Backup to file.** Save every project and its log to a dated JSON file, and load
one back. Loading appends rather than replaces, so an import can never lose work.

**Fills itself from Estoria.** Link a project to an Estoria project (Settings,
Estoria) and each day from the link on is the net words you typed in Estoria
that day, with progress following Estoria's total of written chapters (planned
counts for chapters with no prose yet are left out). Estoria records the words as
you type, under `estoria.wordLog.v1` in localStorage, and Pace reads that key
because both apps are served from the same origin. Pace does not diff Estoria's
total, which would land several days' writing on whichever day Pace was opened
and count version switches and restores as writing. Linked days are set rather
than added, so reading the log twice changes nothing; days before the link keep
what was logged by hand, and unlinking keeps everything. A revision day can be
negative: it counts as a day you showed up and pulls the average down. Words
typed in the Estoria Android app are not in the log yet.

**Unit agnostic.** Nothing below the label fields knows whether it is counting
words, miles, pages or dollars. Writers are the wedge, not the ceiling.

## Running it

```bash
npm install
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 5173 |
| `npm run build` | Type check, then production build to `dist/` |
| `npm test` | Vitest run over the projection math |
| `npm run lint` | oxlint |
| `npm run deploy` | Build, sync into the portfolio repo, push, and verify prod serves this commit |

## How it is put together

Vite, React and TypeScript, with plain CSS custom properties for theming. The
design tokens are carried over from the DRIFTS Calculator so the two read as
siblings.

```
src/lib/pace.ts     projection maths, pure and framework free
src/lib/dates.ts    local calendar day helpers
src/lib/storage.ts  localStorage persistence, versioned and forgiving
src/lib/estoria.ts  reads Estoria's daily word log and folds it into a linked project
src/hooks/          app state
src/components/     the UI
```

`src/lib/pace.ts` is the product. It has no React in it and it is covered by
`src/lib/pace.test.ts`, because a projection that is subtly wrong is worse than
no projection at all.

## Progress and pace are not the same number

This is the one idea the code is built around, so it is worth stating plainly.

- **Progress** is `startingAmount + everything logged`. It answers "how far in am I".
- **Pace** is measured only from logged days across the tracked window. It
  answers "how fast do I actually move".

The atomic unit is the **day**, not the sitting. Logging twice on a Tuesday
raises Tuesday's output, it does not make Tuesday count as two days of showing
up. That is why every frequency in the app is days a week and tops out at seven.

Keeping them apart is what lets someone start using Pace on day 40,000 of a
novel and still get an honest date. `startDate` means *tracking since*, not
*work began*, because it is the denominator for the pace measurement.

## Deploying

`npm run deploy` refuses a dirty tree, builds with the commit SHA stamped into
`dist/version.json`, rsyncs `dist/` into the portfolio repo under
`pace-calculator/`, commits and pushes it, then polls
`https://www.labrarf.com/pace-calculator/version.json` until production reports
that SHA.

Pace is served **same-origin** from the portfolio rather than through the
site's usual cross-origin iframe wrapper. Browsers treat storage in a
third-party frame as separate: Chrome partitions it per top-level site and
Safari blocks it. Since everything Pace knows lives in `localStorage`, a wrapper
would have split one person's log across two origins.

The repo name, the folder it is served from, and the Vite `base` are all
`pace-calculator`, so a single build works at both
`www.labrarf.com/pace-calculator/` and `labrarf-rgb.github.io/pace-calculator/`.

## Storage

Everything lives in `localStorage` under `pace.v1`. Nothing is uploaded. The one
other key Pace touches is Estoria's `estoria.wordLog.v1`, which it only reads,
and only for a project you have linked. A
corrupt or partial save falls back to a fresh state rather than crashing, and
stored projects are revived against current defaults so older saves keep
working.

## Not built yet

- Recency weighting, so a strong recent month outweighs a weak first one
- A confidence range on the date rather than a single day
