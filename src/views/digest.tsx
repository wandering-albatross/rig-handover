import type { Night } from '../digest/types.js';

const dash = (v: string | number | null | undefined) => (v === null || v === undefined || v === '' ? '—' : String(v));

export function DigestPage({ night }: { night: Night }) {
  const rows = [...night.rows].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
  return (
    <>
      <h1>digest {night.night}</h1>
      {night.badLines > 0 && <p class="warn">{night.badLines} bad line(s) skipped</p>}
      {rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th><th>owner</th><th>runs</th><th>retries</th><th>last status</th><th>last error</th><th>first</th><th>last</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr class={r.retries >= 3 || r.lastStatus === 'fail' ? 'warn' : undefined}>
                <td>{dash(r.job)}</td><td>{dash(r.owner)}</td><td>{dash(r.runs)}</td><td>{dash(r.retries)}</td>
                <td>{dash(r.lastStatus)}</td><td>{dash(r.lastError)}</td><td>{dash(r.firstAt)}</td><td>{dash(r.lastAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
