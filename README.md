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
actually sit down. Sessions per week is derived from the log and divided by
*elapsed* weeks, so the zero days are in the denominator where they belong.

**Works when you are already halfway.** Most people find a tool like this partway
through the work. A project carries a head start: the amount finished before
tracking began. It counts toward the target and is deliberately excluded from
every pace figure, because logging a back catalogue as one giant session would
turn the projection into fiction. Progress and pace are measured separately.

**Prices decisions in days.** The cost ledger runs the same projection with one
input changed at a time, so every row is directly comparable. Skipping a week,
adding a session, halving each session but showing up daily.

**A continuous history, not a rolling window.** Every day from the project start
to today, as a calendar. The blank squares are the argument.

**Backup to file.** Save every project and its log to a dated JSON file, and load
one back. Loading appends rather than replaces, so an import can never lose work.

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

## How it is put together

Vite, React and TypeScript, with plain CSS custom properties for theming. The
design tokens are carried over from the DRIFTS Calculator so the two read as
siblings.

```
src/lib/pace.ts     projection maths, pure and framework free
src/lib/dates.ts    local calendar day helpers
src/lib/storage.ts  localStorage persistence, versioned and forgiving
src/hooks/          app state
src/components/     the UI
```

`src/lib/pace.ts` is the product. It has no React in it and it is covered by
`src/lib/pace.test.ts`, because a projection that is subtly wrong is worse than
no projection at all.

## Progress and pace are not the same number

This is the one idea the code is built around, so it is worth stating plainly.

- **Progress** is `startingAmount + everything logged`. It answers "how far in am I".
- **Pace** is measured only from logged sessions across the tracked window. It
  answers "how fast do I actually move".

Keeping them apart is what lets someone start using Pace on day 40,000 of a
novel and still get an honest date. `startDate` means *tracking since*, not
*work began*, because it is the denominator for the pace measurement.

## Storage

Everything lives in `localStorage` under `pace.v1`. Nothing is uploaded. A
corrupt or partial save falls back to a fresh state rather than crashing, and
stored projects are revived against current defaults so older saves keep
working.

## Not built yet

- Recency weighting, so a strong recent month outweighs a weak first one
- A confidence range on the date rather than a single day
- Editing a past day's amount, rather than only clearing it
