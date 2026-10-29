import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight', () => {
  const night = readNight('runs', '2026-10-28')!;
  const row = (job: string) => night.rows.find((r) => r.job === job)!;

  it('reads 2026-10-28: 5 jobs sorted, 1 bad line', () => {
    expect(night.badLines).toBe(1);
    expect(night.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('counts runs and retries, keeps the log offset', () => {
    expect(row('fixtures/refresh')).toMatchObject({
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
  });

  it('keeps fail and its error', () => {
    expect(row('notes/backup')).toMatchObject({ lastStatus: 'fail', lastError: 'quota exceeded' });
  });

  it('keeps a row with a null owner', () => {
    expect(row('digest/render')).toMatchObject({ owner: null, lastError: null });
  });

  it('missing night is null', () => {
    expect(readNight('runs', '1999-01-01')).toBeNull();
  });

  it('empty file and wrong-shaped lines', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    writeFileSync(join(dir, 'empty.jsonl'), '');
    expect(readNight(dir, 'empty')).toEqual({ night: 'empty', rows: [], badLines: 0 });
    writeFileSync(
      join(dir, 'odd.jsonl'),
      ['42', 'null', '{"at":"x","job":"a","status":"ok","owner":null}', '{"at":"2026-10-28T23:00:00+01:00","job":"a","status":"meh","owner":null}'].join('\n'),
    );
    expect(readNight(dir, 'odd')).toEqual({ night: 'odd', rows: [], badLines: 4 });
  });
});
