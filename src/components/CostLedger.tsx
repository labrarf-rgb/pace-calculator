import type { LedgerRow } from '../lib/pace'
import { formatDate, formatDelta } from '../lib/format'

export function CostLedger({ rows }: { rows: LedgerRow[] }) {
  return (
    <section className="panel">
      <span className="eyebrow">The cost engine</span>
      <h2>What each choice costs</h2>
      <p className="panel-desc">
        Priced in the only currency that matters here, which is days of your life.
      </p>
      <table className="ledger">
        <thead>
          <tr>
            <th scope="col">Choice</th>
            <th scope="col" className="right">Cost</th>
            <th scope="col" className="right">You finish</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={row.isBaseline ? 'is-baseline' : undefined}>
              <td className="choice">
                {row.label}
                <small>{row.note}</small>
              </td>
              <td
                className={`right delta${row.isBaseline ? '' : row.delta > 0 ? ' is-cost' : ' is-gain'}`}
              >
                {row.isBaseline ? 'baseline' : formatDelta(row.delta)}
              </td>
              <td className="right when">{formatDate(row.date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
