// Screenshot runner for the Leonida Ledger (Node 22+, no dependencies).
// Drives headless Chrome over one CDP WebSocket, collects console errors and failed
// requests, seeds localStorage with 13 earned trophies, opens each view from shots.json
// and writes JPEGs to screenshots/. Usage: node shots.mjs [shots.json]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFile } from 'node:child_process';

const CHROME = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT = 9224;
const BASE = 'http://localhost:8080';
const SEED = ['Just Like Paradise', 'Paradise Lost', 'T**s Ass Drug Money', 'Vice City, Baby!', 'Trust', 'Baited My Tackle', 'Stick Fiddler', 'Whip It Good', 'The Goodtime State', 'In The Beginning…', 'Treat Yo Self', 'Master of None', 'Little Boxes'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const shots = JSON.parse(readFileSync(process.argv[2] || 'shots.json', 'utf8'));
  mkdirSync('screenshots', { recursive: true });
  const chrome = execFile(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--no-sandbox', '--window-size=1280,800', '--hide-scrollbars', 'about:blank'], () => {});
  const problems = [];
  try {
    for (let i = 0; i < 40; i++) {
      try { await fetch(`http://127.0.0.1:${PORT}/json/version`); break; } catch { await sleep(300); }
    }
    const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const page = targets.find((t) => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let id = 0;
    const pending = new Map();
    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id && pending.has(data.id)) { pending.get(data.id)(data); pending.delete(data.id); return; }
      if (data.method === 'Runtime.exceptionThrown') problems.push('EXCEPTION: ' + JSON.stringify(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text));
      if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') problems.push('CONSOLE ERROR: ' + data.params.args.map((a) => a.value || a.description || '').join(' '));
      if (data.method === 'Network.loadingFailed') problems.push('NETWORK FAILED: ' + data.params.errorText);
      if (data.method === 'Network.responseReceived' && data.params.response.status >= 400) problems.push('HTTP ' + data.params.response.status + ': ' + data.params.response.url);
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const i = ++id;
      pending.set(i, (data) => (data.error ? reject(new Error(data.error.message)) : resolve(data.result)));
      ws.send(JSON.stringify({ id: i, method, params }));
    });
    const evalJs = async (expression) => {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error('page JS error: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
      return r.result?.value;
    };
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Network.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: BASE + '/' });
    await sleep(1200);
    await evalJs(`localStorage.setItem('leonida-ledger-v1', JSON.stringify({earned: ${JSON.stringify(SEED)}, notes: {}, spoilers: true, hideEarned: false}))`);
    for (const shot of shots) {
      await send('Page.navigate', { url: BASE + shot.path });
      await sleep(900);
      if (shot.detail) {
        const found = await evalJs(`(() => { const rows=[...document.querySelectorAll('.row')]; const row=rows.find(r=>r.textContent.includes(${JSON.stringify(shot.detail)})); if(!row) return 'NOT FOUND'; row.click(); return 'opened'; })()`);
        if (found !== 'opened') throw new Error('detail row not found for ' + shot.detail);
        await sleep(400);
      }
      const shotResult = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
      writeFileSync('screenshots/' + shot.file, Buffer.from(shotResult.data, 'base64'));
      const state = await evalJs(`JSON.stringify({rows: document.querySelectorAll('.row').length, detailOpen: !document.getElementById('detail').hidden, progress: document.getElementById('earnedCount').textContent})`);
      console.log(shot.file, state);
    }
    ws.close();
  } finally {
    chrome.kill();
  }
  if (problems.length) { console.log('PROBLEMS:'); for (const p of problems) console.log(' ', p); process.exitCode = 1; }
  else console.log('shots done, no console/network problems');
}

main().catch((err) => { console.error('SHOT RUN FAILED:', err.message); process.exit(1); });
