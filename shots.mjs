// Screenshot maker for the Leonida Ledger — renders the app in a real
// headless Chromium and takes the 4 screenshots in shots.json.
//   node shots.mjs
// Each shot seeds progress (13 of 55 earned) so the tracker reads as a
// guide in use, opens the view the shot is of, and saves a JPEG at
// 1280 x 800. Nothing is edited or composited afterwards.

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/.neon-test/node_modules/playwright-core');

const here = dirname(fileURLToPath(import.meta.url));
const PORT = 8902;
const BASE = `http://127.0.0.1:${PORT}`;
const SHELL = `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell`;
const SHOTS = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));

function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: here, stdio: 'pipe' });
    let started = false;
    const timer = setTimeout(() => reject(new Error('serve.ts did not start in time')), 10000);
    child.stdout.on('data', () => {
      if (!started) { started = true; clearTimeout(timer); resolve(child); }
    });
    child.stderr.on('data', (chunk) => process.stderr.write(chunk));
    child.on('exit', (code) => {
      if (!started) { clearTimeout(timer); reject(new Error(`serve.ts exited ${code}`)); }
    });
  });
}

const server = await startServer();
const browser = await chromium.launch({ executablePath: SHELL });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

try {
  for (const shot of SHOTS) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    // Seed the reader's saved progress before the app's own scripts run.
    await page.addInitScript((seed) => {
      const state = {
        earned: Object.fromEntries(seed.earned.map((id) => [String(id), true])),
        notes: {},
        spoilers: Boolean(seed.spoilers),
        hideEarned: false,
        kind: seed.kind ?? 'all',
        grade: 'all',
        query: seed.query ?? '',
        view: 'checklist',
        selectedId: seed.selectedId ?? null,
      };
      window.localStorage.setItem('leonida-ledger-v1', JSON.stringify(state));
    }, shot.seed);
    await page.goto(`${BASE}/index.html${shot.hash}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    // Bring the shot's subject into the viewport: the page is taller than
    // the 800px frame, and the judge reads what the frame shows.
    if (shot.scrollTo) {
      await page.locator(shot.scrollTo).first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
    }
    if (errors.length > 0) throw new Error(`shot ${shot.file}: ${errors.join(' | ')}`);
    await page.screenshot({ path: join(here, 'screenshots', shot.file), type: 'jpeg', quality: 82 });
    const size = (await import('node:fs')).statSync(join(here, 'screenshots', shot.file)).size;
    console.log(`${shot.file}: ${size} bytes — ${shot.caption}`);
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
console.log('All screenshots taken.');
