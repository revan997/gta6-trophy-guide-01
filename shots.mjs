// Leonida Ledger — screenshot runner (Node 22+, no dependencies).
//
// Reads shots.json (one entry per screenshot: output file, app path, the
// trophy whose detail to open, the earned set to seed, the viewport), drives
// the Playwright-cached headless shell over one CDP WebSocket, seeds
// localStorage with the earned trophies, and writes JPEGs to screenshots/.
// Any console error, page exception, failed request or HTTP >= 400 fails the
// run, so the screenshots are proof the guide renders cleanly.
//
// Usage: node shots.mjs [shots.json]   (the app must be served on :8080)
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { execFile } from 'node:child_process';

const SHELL = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell';
const DEBUG_PORT = 9224;
const BASE = 'http://localhost:8080';
const LEDGER = 'leonida-ledger-v1';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Shell {
  constructor() { this.nextId = 0; this.waiting = new Map(); this.problems = []; }
  async start() {
    this.proc = execFile(SHELL, [
      '--headless=new',
      `--remote-debugging-port=${DEBUG_PORT}`,
      '--no-sandbox',
      '--window-size=1280,800',
      '--hide-scrollbars',
      'about:blank',
    ], () => {});
    for (let i = 0; i < 40; i++) {
      try { await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`); break; }
      catch { await wait(300); }
    }
    const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
    const page = targets.find((t) => t.type === 'page');
    this.socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { this.socket.onopen = resolve; this.socket.onerror = reject; });
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && this.waiting.has(data.id)) { this.waiting.get(data.id)(data); this.waiting.delete(data.id); return; }
      if (data.method === 'Runtime.exceptionThrown') this.problems.push('EXCEPTION: ' + JSON.stringify(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text));
      if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') this.problems.push('CONSOLE ERROR: ' + data.params.args.map((a) => a.value || a.description || '').join(' '));
      if (data.method === 'Network.loadingFailed') this.problems.push('NETWORK FAILED: ' + data.params.errorText);
      if (data.method === 'Network.responseReceived' && data.params.response.status >= 400) this.problems.push('HTTP ' + data.params.response.status + ': ' + data.params.response.url);
    };
  }
  call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      this.waiting.set(id, (data) => (data.error ? reject(new Error(data.error.message)) : resolve(data.result)));
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async probe(expression) {
    const out = await this.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (out.exceptionDetails) throw new Error('page JS error: ' + (out.exceptionDetails.exception?.description || out.exceptionDetails.text));
    return out.result?.value;
  }
  async go(url) { await this.call('Page.navigate', { url }); }
  stop() { try { this.socket.close(); } catch {} this.proc.kill(); }
}

async function takeShot(shell, shot) {
  const viewport = shot.viewport || { width: 1280, height: 800 };
  await shell.call('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: false });
  await shell.go(BASE + '/');
  await wait(1000);
  await shell.probe(`localStorage.setItem('${LEDGER}', JSON.stringify({earned: ${JSON.stringify(shot.seed || [])}, notes: {}, spoilers: true, hideEarned: false}))`);
  await shell.go(BASE + shot.path);
  await wait(900);
  if (shot.detail) {
    const opened = await shell.probe(`(() => { const rows=[...document.querySelectorAll('.row')]; const row=rows.find(r=>r.textContent.includes(${JSON.stringify(shot.detail)})); if(!row) return 'NOT FOUND'; row.click(); return 'opened'; })()`);
    if (opened !== 'opened') throw new Error('detail row not found for ' + shot.detail);
    await wait(400);
  }
  const snap = await shell.call('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
  writeFileSync('screenshots/' + shot.file, Buffer.from(snap.data, 'base64'));
  const bytes = statSync('screenshots/' + shot.file).size;
  const state = await shell.probe(`JSON.stringify({rows: document.querySelectorAll('.row').length, detailOpen: !document.getElementById('detail').hidden, progress: document.getElementById('earnedCount').textContent})`);
  console.log(`${shot.file} ${bytes} bytes ${state}`);
  if (bytes > 262144) throw new Error(`${shot.file} is ${bytes} bytes, over the 256 KiB cap`);
}

async function main() {
  const shots = JSON.parse(readFileSync(process.argv[2] || 'shots.json', 'utf8'));
  mkdirSync('screenshots', { recursive: true });
  const shell = new Shell();
  await shell.start();
  try {
    await shell.call('Page.enable');
    await shell.call('Runtime.enable');
    await shell.call('Network.enable');
    for (const shot of shots) await takeShot(shell, shot);
  } finally {
    shell.stop();
  }
  if (shell.problems.length) {
    console.log('PROBLEMS:');
    for (const problem of shell.problems) console.log(' ', problem);
    process.exitCode = 1;
  } else {
    console.log('shots done, no console/network problems');
  }
}

main().catch((err) => { console.error('SHOT RUN FAILED:', err.message); process.exit(1); });
