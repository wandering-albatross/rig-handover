import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import { readNight } from './digest/read.js';
import { lastBeat, type Beat } from './heartbeat.js';

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: string[];
  // null = the night could not be read (rendered as '—')
  counts: Record<string, { ok: number; retry: number; fail: number } | null>;
};

// Counts are over rows (one per job): jobs whose lastStatus is ok / retry / fail, not run lines.
function nightCounts(runsDir: string, night: string) {
  try {
    const n = readNight(runsDir, night);
    if (!n) return null;
    const c = { ok: 0, retry: 0, fail: 0 };
    for (const r of n.rows) c[r.lastStatus]++;
    return c;
  } catch {
    return null;
  }
}

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export function readStatus(config: RigConfig): Status {
  const nights = nightsOnDisk(config.runsDir);
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights,
    counts: Object.fromEntries(nights.map((n) => [n, nightCounts(config.runsDir, n)])),
  };
}
