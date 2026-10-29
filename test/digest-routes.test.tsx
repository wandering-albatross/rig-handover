import { copyFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

// Temp runs dir: runs/ is read-only. 2026-10-28 is the real night (1 bad line), 2026-01-01 is empty.
const runsDir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
copyFileSync('runs/2026-10-28.jsonl', join(runsDir, '2026-10-28.jsonl'));
writeFileSync(join(runsDir, '2026-01-01.jsonl'), '');

const app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir });

describe('digest routes', () => {
  it('page: 200 for a night on disk, bad line counted', async () => {
    const res = await app.request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('1 bad line');
    expect(html).toContain('notes/backup');
  });

  it('json: 200 with rows and badLines', async () => {
    const res = await app.request('/api/digest/2026-10-28');
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.rows).toHaveLength(5);
    expect(body.badLines).toBe(1);
  });

  it('404 for a night with no file, on both routes', async () => {
    expect((await app.request('/digest/2026-10-30')).status).toBe(404);
    expect((await app.request('/api/digest/2026-10-30')).status).toBe(404);
  });

  it('empty night: page says nothing ran, json has no rows', async () => {
    const page = await app.request('/digest/2026-01-01');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');
    const json = await (await app.request('/api/digest/2026-01-01')).json();
    expect(json.rows).toEqual([]);
  });

  it('page and json list the same jobs in the same order', async () => {
    const html = await (await app.request('/digest/2026-10-28')).text();
    const json = await (await app.request('/api/digest/2026-10-28')).json();
    const jobs: string[] = json.rows.map((r: { job: string }) => r.job);
    const positions = jobs.map((j) => html.indexOf(`<td>${j}</td>`));
    expect(positions.every((p) => p > 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
});
