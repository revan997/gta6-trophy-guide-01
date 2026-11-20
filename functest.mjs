// Functional tests for the Leonida Ledger — 21 checks, run in a real
// headless Chromium against the app served by serve.ts.
//   node functest.mjs
// Exits 0 only when all 21 pass.

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/.neon-test/node_modules/playwright-core');

const here = dirname(fileURLToPath(import.meta.url));
const PORT = 8901;
const BASE = `http://127.0.0.1:${PORT}`;
const SHELL = `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell`;

// The official 55 names, as PlayStation publishes them (from the kit's
// starter list, cross-checked on Exophase).
const OFFICIAL_NAMES = [
  'Vice Got a Price!', 'Just Like Paradise', 'Paradise Lost', 'T**s Ass Drug Money',
  'Vice City, Baby!', 'Top Of The World, Ma', 'You Gotta Know When to Get Off', 'Trust',
  'Break the Bank', 'Family Matters', 'DWNFALL', 'Hi-Jacked', 'Snow Storm', 'A Long Road',
  'Cunning Stunts', 'Master of None', 'The Shootist', 'Top Fun', 'Earn Cash, Not Kudos',
  'Baited My Tackle', 'Stick Fiddler', 'Road to Rehabilitation', 'This Was No Boat Accident',
  'The Lone Rider', 'Strangers & Freaks', 'Supply & Demand', 'Spin On This!',
  'Positive Mental Attitude', 'Fair Game', 'Don’t Touch My Deck', 'You WAiNKer!',
  'One Last Thing', 'Hot Together', 'Retail Therapy', 'Whip It Good', 'Gunslinger',
  'Catch Me If You Can', 'Challenging Tank', 'Sneakthief', 'Maximum Withdrawal',
  'A Classic Blitz Play', 'The Goodtime State', 'Pest Control', 'In The Beginning…',
  'Capital Offense', 'Let’s Go Bowling', 'Personal Best', 'Actions Speak Louder',
  'Bad Luck, I Guess', 'The Truth Is Out There', 'Ten Pin', 'Dime on the Dollar',
  'Treat Yo Self', 'Little Boxes', 'On the Spot',
];

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

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

const data = JSON.parse(readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf8'));
const trophies = data.trophies;

// ---- Data checks (7) ----
check('data: 55 trophies', trophies.length === 55, `${trophies.length} found`);
const grades = trophies.reduce((acc, t) => { acc[t.grade] = (acc[t.grade] || 0) + 1; return acc; }, {});
check(
  'data: grade split is 1 platinum, 2 gold, 6 silver, 46 bronze',
  grades.platinum === 1 && grades.gold === 2 && grades.silver === 6 && grades.bronze === 46,
  JSON.stringify(grades),
);
check(
  'data: every trophy has a non-blank guide',
  trophies.every((t) => typeof t.guide === 'string' && t.guide.trim().length > 20),
);
check(
  'data: every trophy cites at least 2 sources with http(s) links',
  trophies.every((t) => Array.isArray(t.sources) && t.sources.length >= 2
    && t.sources.every((s) => typeof s.url === 'string' && /^https?:\/\//.test(s.url))),
);
const nameKey = (name) => name
  .replace(/[‘’‚‛]/g, "'")
  .replace(/[–—―]/g, '-')
  .replace(/…/g, '...')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();
const nameSet = new Set(trophies.map((t) => nameKey(t.name)));
check(
  'data: names match the official 55',
  OFFICIAL_NAMES.every((name) => nameSet.has(nameKey(name))) && nameSet.size === 55,
);
check(
  'data: exactly one missable (Positive Mental Attitude) and 3 unconfirmed',
  trophies.filter((t) => t.missable).map((t) => t.id).join() === '28'
    && trophies.filter((t) => t.unconfirmed).length === 3,
);
const stages = trophies.reduce((acc, t) => { acc[t.stage] = (acc[t.stage] || 0) + 1; return acc; }, {});
check(
  'data: roadmap stages cover all 55 trophies',
  (stages[1] || 0) + (stages[2] || 0) + (stages[3] || 0) === 55 && stages[1] > 0 && stages[2] > 0 && stages[3] > 0,
  JSON.stringify(stages),
);

// ---- Browser checks (14) ----
const server = await startServer();
const browser = await chromium.launch({ executablePath: SHELL });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const consoleErrors = [];
const failedRequests = [];
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(String(error)));
page.on('requestfailed', (request) => failedRequests.push(request.url()));
page.on('response', (response) => { if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`); });

try {
  await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  check(
    'app: loads with the right title and 55 checklist rows',
    (await page.title()).includes('Leonida Ledger') && (await page.locator('#trophy-list .trophy-row').count()) === 55,
    `rows: ${await page.locator('#trophy-list .trophy-row').count()}`,
  );

  await page.locator('#trophy-list .trophy-row').nth(27).locator('.trophy-check').check();
  const progressAfterTick = await page.locator('#progress-count').innerText();
  await page.reload({ waitUntil: 'networkidle' });
  check(
    'app: ticking a trophy moves progress to 1 / 55 and survives a reload',
    progressAfterTick === '1 / 55 earned'
      && (await page.locator('#progress-count').innerText()) === '1 / 55 earned'
      && (await page.evaluate(() => JSON.parse(window.localStorage.getItem('leonida-ledger-v1')).earned['28'] === true)),
  );

  await page.locator('#search-input').fill('meditat');
  check(
    'app: search for "meditat" shows exactly 1 trophy',
    (await page.locator('#trophy-list .trophy-row').count()) === 1,
  );
  await page.locator('#search-input').fill('');

  await page.locator('.chip[data-kind="story"]').click();
  check(
    'app: story kind filter shows 12 trophies',
    (await page.locator('#trophy-list .trophy-row').count()) === 12,
  );
  await page.locator('.chip[data-kind="all"]').click();

  await page.locator('#grade-select').selectOption('silver');
  check(
    'app: silver grade filter shows 6 trophies',
    (await page.locator('#trophy-list .trophy-row').count()) === 6,
  );
  await page.locator('#grade-select').selectOption('all');

  await page.locator('#hide-earned').check();
  check(
    'app: hide-earned removes the 1 earned trophy (54 rows left)',
    (await page.locator('#trophy-list .trophy-row').count()) === 54,
  );
  await page.locator('#hide-earned').uncheck();

  await page.locator('#spoiler-toggle').check();
  const firstStoryName = await page.locator('#trophy-list .trophy-row').nth(1).locator('.trophy-name').innerText();
  check(
    'app: spoiler-safe mode hides story trophy names',
    firstStoryName === 'Hidden story trophy',
    `saw: ${firstStoryName}`,
  );
  await page.locator('#spoiler-toggle').uncheck();

  await page.locator('#trophy-list .trophy-row').nth(27).locator('.trophy-name').click();
  const detailText = await page.locator('#detail-pane').innerText();
  check(
    'app: detail pane shows the guide and its sources for Positive Mental Attitude',
    detailText.includes('Positive Mental Attitude')
      && detailText.includes('HOW TO EARN IT')
      && detailText.includes('SOURCES')
      && detailText.includes('PowerPyx'),
    detailText.slice(0, 120).replace(/\n/g, ' | '),
  );

  await page.locator('.tab[data-view="roadmap"]').click();
  check(
    'app: roadmap view shows 3 stages with progress',
    (await page.locator('.stage-card').count()) === 3
      && (await page.locator('.stage-progress').first().innerText()).includes('earned in this stage'),
  );

  await page.locator('.tab[data-view="missables"]').click();
  const missableText = await page.locator('#view-missables').innerText();
  check(
    'app: missables view names Positive Mental Attitude and the warnings box',
    missableText.includes('Positive Mental Attitude') && missableText.includes('Watch out while you play'),
  );

  // Un-earn the missable trophy so the planner's first pick is it again.
  await page.locator('.tab[data-view="checklist"]').click();
  await page.locator('#trophy-list .trophy-row').nth(27).locator('.trophy-check').uncheck();
  await page.locator('.tab[data-view="planner"]').click();
  const plannerItems = await page.locator('.planner-list li').count();
  const firstPlanner = await page.locator('.planner-list h3').first().innerText();
  check(
    'app: planner lists 5 next trophies, missable first',
    plannerItems === 5 && firstPlanner === 'Positive Mental Attitude',
    `first: ${firstPlanner}`,
  );

  const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
  await page.locator('.tab[data-view="checklist"]').click();
  await page.locator('#trophy-list .trophy-row').nth(27).locator('.trophy-check').check();
  await page.locator('#export-button').click();
  const download = await downloadPromise;
  const exportPath = `/tmp/leonida-export-${Date.now()}.json`;
  await download.saveAs(exportPath);
  const exported = JSON.parse(readFileSync(exportPath, 'utf8'));
  check(
    'app: export downloads a JSON file listing the earned trophy',
    exported.app === 'leonida-ledger' && Array.isArray(exported.earned) && exported.earned.includes(28),
  );

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#reset-button').click();
  await page.waitForTimeout(200);
  const afterReset = await page.locator('#progress-count').innerText();
  await page.locator('#import-input').setInputFiles(exportPath);
  await page.waitForTimeout(300);
  check(
    'app: import restores the exported progress (1 / 55 again)',
    afterReset === '0 / 55 earned'
      && (await page.locator('#progress-count').innerText()) === '1 / 55 earned',
  );

  check(
    'app: zero console errors and zero failed requests',
    consoleErrors.length === 0 && failedRequests.length === 0,
    [...consoleErrors, ...failedRequests].join(' | '),
  );
} finally {
  await browser.close();
  server.kill();
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} functional tests passed`);
process.exit(passed === results.length ? 0 : 1);
