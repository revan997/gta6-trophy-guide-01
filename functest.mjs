// Leonida Ledger — functional checks (Node 22+, no dependencies).
//
// Serves the real app over HTTP, drives it in the Playwright-cached headless
// shell over one CDP WebSocket, and asserts the tracker's behaviour end to
// end: 55 rows render, ticking earns and persists, the spoiler rule hides
// story names, search narrows, the detail pane shows sources and the
// missable warning, notes save, export and import round-trip, and the roadmap
// and missables views render — with zero page exceptions or console errors.
//
// Usage: node serve.ts & node functest.mjs ; the server must be up on :8080.
import { execFile } from 'node:child_process';

const SHELL = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell';
const DEBUG_PORT = 9226;
const APP = 'http://localhost:8080';
const LEDGER = 'leonida-ledger-v1';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const results = [];
function record(name, passed, extra = '') {
  results.push({ name, passed });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
}

async function launchShell() {
  const proc = execFile(SHELL, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--no-sandbox',
    '--disable-gpu',
    '--user-data-dir=/tmp/chrome-func',
    '--window-size=1280,800',
    'about:blank',
  ], () => {});
  for (let attempt = 0; attempt < 40; attempt++) {
    try { await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`); return proc; }
    catch { await wait(300); }
  }
  proc.kill();
  throw new Error('headless shell never answered on the debug port');
}

async function attachPage(proc) {
  const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
  const page = targets.find((t) => t.type === 'page');
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let nextId = 0;
  const waiting = new Map();
  const problems = [];
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && waiting.has(data.id)) { waiting.get(data.id)(data); waiting.delete(data.id); return; }
    if (data.method === 'Runtime.exceptionThrown') {
      problems.push('EXCEPTION: ' + (data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text));
    }
    if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
      problems.push('CONSOLE ERROR: ' + data.params.args.map((a) => a.value || a.description || '').join(' '));
    }
  };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    waiting.set(id, (data) => (data.error ? reject(new Error(data.error.message)) : resolve(data.result)));
    socket.send(JSON.stringify({ id, method, params }));
  });
  const probe = async (expression) => {
    const out = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (out.exceptionDetails) throw new Error('page JS error: ' + (out.exceptionDetails.exception?.description || out.exceptionDetails.text));
    return out.result?.value;
  };
  const go = async (url) => { await call('Page.navigate', { url }); };
  return { socket, problems, call, probe, go, proc };
}

const tests = [
  ['renders 55 trophy rows', async (c) => (await c.probe(`document.querySelectorAll('.row').length`)) === 55],
  ['progress starts at 0', async (c) => (await c.probe(`document.getElementById('earnedCount').textContent`)) === '0'],
  ['no external requests', async (c) => (await c.probe(`performance.getEntriesByType('resource').every(r => r.name.startsWith('http://localhost:8080/'))`)) === true],
  ['ticking earns 1 trophy', async (c) => {
    await c.probe(`document.querySelector('.row input[type=checkbox]').click()`);
    await wait(200);
    return (await c.probe(`document.getElementById('earnedCount').textContent`)) === '1';
  }],
  ['earned saved to localStorage', async (c) => (await c.probe(`JSON.parse(localStorage.getItem('${LEDGER}')).earned`)).includes('Vice Got a Price!')],
  ['progress survives reload', async (c) => {
    await c.go(APP + '/');
    await wait(900);
    return (await c.probe(`document.getElementById('earnedCount').textContent`)) === '1';
  }],
  ['spoiler on hides story names', async (c) => (await c.probe(`document.body.innerText.includes('Just Like Paradise')`)) === false],
  ['spoiler on shows placeholders', async (c) => (await c.probe(`document.body.innerText.includes('Hidden story trophy')`)) === true],
  ['spoiler off reveals story names', async (c) => {
    await c.probe(`document.getElementById('spoilerToggle').click()`);
    await wait(200);
    const shown = (await c.probe(`document.body.innerText.includes('Just Like Paradise')`)) === true;
    await c.probe(`document.getElementById('spoilerToggle').click()`);
    await wait(200);
    return shown;
  }],
  ['search "meditat" narrows rows', async (c) => {
    await c.probe(`const s=document.getElementById('search'); s.value='meditat'; s.dispatchEvent(new Event('input',{bubbles:true}));`);
    await wait(200);
    const rows = await c.probe(`document.querySelectorAll('.row').length`);
    await c.probe(`{ const s2=document.getElementById('search'); s2.value=''; s2.dispatchEvent(new Event('input',{bubbles:true})); }`);
    await wait(200);
    return rows >= 1 && rows < 55;
  }],
  ['detail opens with sources', async (c) => {
    await c.probe(`(() => { const rows=[...document.querySelectorAll('.row')]; rows.find(r=>r.textContent.includes('Positive Mental Attitude')).click(); })()`);
    await wait(300);
    return (await c.probe(`document.querySelectorAll('#detail .src-list a').length`)) >= 2;
  }],
  ['detail shows missable warning', async (c) => (await c.probe(`document.querySelector('#detail .warn') !== null`)) === true],
  ['note saved to localStorage', async (c) => {
    await c.probe(`const ta=document.querySelector('#detail textarea'); ta.value='test note 123'; ta.dispatchEvent(new Event('change',{bubbles:true}));`);
    await wait(200);
    return (await c.probe(`JSON.parse(localStorage.getItem('${LEDGER}')).notes['Positive Mental Attitude']`)) === 'test note 123';
  }],
  ['export payload lists the earned trophy', async (c) => {
    const exported = await c.probe(`(async () => {
      let captured = null;
      const orig = URL.createObjectURL.bind(URL);
      URL.createObjectURL = (b) => { captured = b; return orig(b); };
      document.getElementById('exportBtn').click();
      await new Promise(r => setTimeout(r, 300));
      URL.createObjectURL = orig;
      return captured ? await captured.text() : null;
    })()`);
    const payload = JSON.parse(exported);
    c.payload = payload;
    return payload.earned.includes('Vice Got a Price!');
  }],
  ['export payload carries the note', async (c) => c.payload.notes['Positive Mental Attitude'] === 'test note 123'],
  ['import replaces earned set', async (c) => {
    await c.probe(`(async () => {
      const file = new File([JSON.stringify({app:'leonida-ledger', earned:['Cunning Stunts','The Shootist'], notes:{}})], 'progress.json', {type:'application/json'});
      const dt = new DataTransfer(); dt.items.add(file);
      const input = document.getElementById('importFile');
      input.files = dt.files;
      input.dispatchEvent(new Event('change', {bubbles:true}));
    })()`);
    await wait(600);
    return (await c.probe(`document.getElementById('earnedCount').textContent`)) === '2';
  }],
  ['imported names are the file ones', async (c) => (await c.probe(`JSON.parse(localStorage.getItem('${LEDGER}')).earned.join(',')`)) === 'Cunning Stunts,The Shootist'],
  ['roadmap shows 3 stages', async (c) => {
    await c.go(APP + '/#roadmap');
    await wait(900);
    return (await c.probe(`document.body.innerText.includes('Stage 3')`)) === true;
  }],
  ['roadmap shows Next up', async (c) => (await c.probe(`document.body.innerText.includes('Next up')`)) === true],
  ['missables view renders', async (c) => {
    await c.go(APP + '/#missables');
    await wait(600);
    return (await c.probe(`document.body.innerText.includes('Missable trophies: 1 to watch')`)) === true;
  }],
  ['no page exceptions or console errors', async (c) => c.problems.length === 0],
];

async function main() {
  const proc = await launchShell();
  const ctx = await attachPage(proc);
  try {
    await ctx.call('Runtime.enable');
    await ctx.call('Page.enable');
    await ctx.call('Page.addScriptToEvaluateOnNewDocument', { source: 'window.alert = () => {}; window.confirm = () => true;' });
    await ctx.go(APP + '/');
    await wait(1200);
    await ctx.probe(`localStorage.clear(); window.alert = () => {};`);
    await ctx.go(APP + '/');
    await wait(900);
    for (const [name, run] of tests) {
      let passed = false;
      let extra = '';
      try { passed = await run(ctx); }
      catch (err) { extra = err.message; }
      if (name === 'no page exceptions or console errors') extra = ctx.problems.join(' | ');
      record(name, passed, extra);
    }
    ctx.socket.close();
  } finally {
    proc.kill();
  }
  const failed = results.filter((r) => !r.passed).length;
  console.log(failed === 0 ? `ALL FUNCTIONAL TESTS PASSED (${results.length}/${results.length})` : `${failed} FAILURES`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => { console.error('TEST RUN FAILED:', err.message); process.exit(1); });
