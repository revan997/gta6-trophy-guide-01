// Functional test for the Leonida Ledger (Node 22+, no dependencies).
// Drives the real app in headless Chrome over CDP and asserts: render, tick-to-earn,
// persistence across reload, spoiler hide/reveal, search, notes, export payload and import.
import { execFile } from 'node:child_process';
const CHROME = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT = 9226;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
function check(name, ok, detail = '') {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  if (!ok) failures++;
}

const chrome = execFile(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--no-sandbox', '--disable-gpu', '--user-data-dir=/tmp/chrome-func', '--window-size=1280,800', 'about:blank'], () => {});
try {
  for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${PORT}/json/version`); break; } catch { await sleep(300); } }
  const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0; const pending = new Map(); const problems = [];
  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.id && pending.has(data.id)) { pending.get(data.id)(data); pending.delete(data.id); return; }
    if (data.method === 'Runtime.exceptionThrown') problems.push('EXCEPTION: ' + (data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text));
    if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') problems.push('CONSOLE ERROR: ' + data.params.args.map((a) => a.value || a.description || '').join(' '));
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const i = ++id;
    pending.set(i, (data) => (data.error ? reject(new Error(data.error.message)) : resolve(data.result)));
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const evalJs = async (e) => {
    const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('page JS error: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result?.value;
  };
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.alert = () => {}; window.confirm = () => true;' });
  await send('Page.navigate', { url: 'http://localhost:8080/' });
  await sleep(1200);
  await evalJs(`localStorage.clear(); window.alert = () => {};`);
  await send('Page.navigate', { url: 'http://localhost:8080/' });
  await sleep(900);

  check('renders 55 trophy rows', (await evalJs(`document.querySelectorAll('.row').length`)) === 55);
  check('progress starts at 0', (await evalJs(`document.getElementById('earnedCount').textContent`)) === '0');
  check('no external requests', (await evalJs(`performance.getEntriesByType('resource').every(r => r.name.startsWith('http://localhost:8080/'))`)) === true);

  // Tick the platinum, check progress + persistence across reload.
  await evalJs(`document.querySelector('.row input[type=checkbox]').click()`);
  await sleep(200);
  check('ticking earns 1 trophy', (await evalJs(`document.getElementById('earnedCount').textContent`)) === '1');
  check('earned saved to localStorage', (await evalJs(`JSON.parse(localStorage.getItem('leonida-ledger-v1')).earned`)).includes('Vice Got a Price!'));
  await send('Page.navigate', { url: 'http://localhost:8080/' });
  await sleep(900);
  check('progress survives reload', (await evalJs(`document.getElementById('earnedCount').textContent`)) === '1');

  // Spoiler rule: story names hidden while on, revealed while off.
  check('spoiler on hides story names', (await evalJs(`document.body.innerText.includes('Just Like Paradise')`)) === false);
  check('spoiler on shows placeholders', (await evalJs(`document.body.innerText.includes('Hidden story trophy')`)) === true);
  await evalJs(`document.getElementById('spoilerToggle').click()`);
  await sleep(200);
  check('spoiler off reveals story names', (await evalJs(`document.body.innerText.includes('Just Like Paradise')`)) === true);
  await evalJs(`document.getElementById('spoilerToggle').click()`);
  await sleep(200);

  // Search narrows the list.
  await evalJs(`const s=document.getElementById('search'); s.value='meditat'; s.dispatchEvent(new Event('input',{bubbles:true}));`);
  await sleep(200);
  const medRows = await evalJs(`document.querySelectorAll('.row').length`);
  check('search "meditat" narrows rows', medRows >= 1 && medRows < 55, medRows + ' rows');
  await evalJs(`{ const s2=document.getElementById('search'); s2.value=''; s2.dispatchEvent(new Event('input',{bubbles:true})); }`);
  await sleep(200);

  // Detail drawer + note saving.
  await evalJs(`(() => { const rows=[...document.querySelectorAll('.row')]; rows.find(r=>r.textContent.includes('Positive Mental Attitude')).click(); })()`);
  await sleep(300);
  check('detail opens with sources', (await evalJs(`document.querySelectorAll('#detail .src-list a').length`)) >= 2);
  check('detail shows missable warning', (await evalJs(`document.querySelector('#detail .warn') !== null`)) === true);
  await evalJs(`const ta=document.querySelector('#detail textarea'); ta.value='test note 123'; ta.dispatchEvent(new Event('change',{bubbles:true}));`);
  await sleep(200);
  check('note saved to localStorage', (await evalJs(`JSON.parse(localStorage.getItem('leonida-ledger-v1')).notes['Positive Mental Attitude']`)) === 'test note 123');

  // Export: capture the blob the button downloads.
  const exported = await evalJs(`(async () => {
    let captured = null;
    const orig = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (b) => { captured = b; return orig(b); };
    document.getElementById('exportBtn').click();
    await new Promise(r => setTimeout(r, 300));
    URL.createObjectURL = orig;
    return captured ? await captured.text() : null;
  })()`);
  const payload = JSON.parse(exported);
  check('export payload lists the earned trophy', payload.earned.includes('Vice Got a Price!'));
  check('export payload carries the note', payload.notes['Positive Mental Attitude'] === 'test note 123');

  // Import: feed a file into the import input and check the state changes.
  await evalJs(`(async () => {
    const file = new File([JSON.stringify({app:'leonida-ledger', earned:['Cunning Stunts','The Shootist'], notes:{}})], 'progress.json', {type:'application/json'});
    const dt = new DataTransfer(); dt.items.add(file);
    const input = document.getElementById('importFile');
    input.files = dt.files;
    input.dispatchEvent(new Event('change', {bubbles:true}));
  })()`);
  await sleep(600);
  check('import replaces earned set', (await evalJs(`document.getElementById('earnedCount').textContent`)) === '2');
  check('imported names are the file ones', (await evalJs(`JSON.parse(localStorage.getItem('leonida-ledger-v1')).earned.join(',')`)) === 'Cunning Stunts,The Shootist');

  // Roadmap + Next up render.
  await send('Page.navigate', { url: 'http://localhost:8080/#roadmap' });
  await sleep(900);
  check('roadmap shows 3 stages', (await evalJs(`document.body.innerText.includes('Stage 3')`)) === true);
  check('roadmap shows Next up', (await evalJs(`document.body.innerText.includes('Next up')`)) === true);
  await send('Page.navigate', { url: 'http://localhost:8080/#missables' });
  await sleep(600);
  check('missables view renders', (await evalJs(`document.body.innerText.includes('Missable trophies: 1 to watch')`)) === true);

  check('no page exceptions or console errors', problems.length === 0, problems.join(' | '));
  ws.close();
} finally { chrome.kill(); }
console.log(failures === 0 ? 'ALL FUNCTIONAL TESTS PASSED' : failures + ' FAILURES');
process.exit(failures === 0 ? 0 : 1);
