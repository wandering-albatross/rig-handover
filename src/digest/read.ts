import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, ReadNight, RunLine } from './types.js';

const STATUSES = ['ok', 'retry', 'fail'];

// Parse one log line at the edge; null when it isn't JSON or isn't a RunLine.
function parseLine(text: string): RunLine | null {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.at !== 'string' || Number.isNaN(Date.parse(o.at))) return null;
  if (typeof o.job !== 'string' || o.job === '') return null;
  if (typeof o.status !== 'string' || !STATUSES.includes(o.status)) return null;
  if (o.owner !== null && typeof o.owner !== 'string') return null;
  if (o.error !== undefined && typeof o.error !== 'string') return null;
  return {
    at: o.at,
    job: o.job,
    status: o.status as RunLine['status'],
    owner: o.owner,
    ...(o.error !== undefined && { error: o.error }),
  };
}

export const readNight: ReadNight = (runsDir, night) => {
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }

  let badLines = 0;
  const byJob = new Map<string, RunLine[]>();
  for (const raw of text.split('\n')) {
    if (raw.trim() === '') continue;
    const line = parseLine(raw);
    if (!line) {
      badLines++;
      continue;
    }
    byJob.set(line.job, [...(byJob.get(line.job) ?? []), line]);
  }

  const rows: DigestRow[] = [...byJob].map(([job, lines]) => {
    // Order by instant (offsets may differ); stable sort keeps file order on ties.
    const sorted = [...lines].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    return {
      job,
      owner: [...sorted].reverse().find((l) => l.owner !== null)?.owner ?? null,
      runs: sorted.length,
      retries: sorted.filter((l) => l.status === 'retry').length,
      lastStatus: last.status,
      lastError: [...sorted].reverse().find((l) => l.error !== undefined)?.error ?? null,
      firstAt: first.at,
      lastAt: last.at,
    };
  });
  rows.sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
  return { night, rows, badLines };
};
