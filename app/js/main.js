// Leonida Ledger — boot and wiring. Loads the trophy data, owns the small UI
// state (view, filters, selected trophy), and delegates every event. The
// data file is the only thing fetched at run time, from this same server.
import { loadLedger, saveLedger, isEarned, setEarned, setNote, buildExport, parseImport } from './state.js';
import { renderChecklist, renderDetail, renderRoadmap, renderMissables, renderSources, updateProgress } from './render.js';

const viewEl = document.getElementById('view');
const detailEl = document.getElementById('detail');
const toolbarEl = document.getElementById('toolbar');
const searchEl = document.getElementById('search');
const kindEl = document.getElementById('kindFilter');
const gradeEl = document.getElementById('gradeFilter');
const hideEarnedEl = document.getElementById('hideEarned');
const spoilerEl = document.getElementById('spoilerToggle');
const exportEl = document.getElementById('exportBtn');
const importEl = document.getElementById('importFile');
const resetEl = document.getElementById('resetBtn');

const ledger = loadLedger();
const ui = { view: 'checklist', query: '', kind: 'all', grade: 'all' };
let trophies = [];
let selected = null;

function byName(name) {
  return trophies.find((t) => t.name === name) || null;
}

function routeFromHash() {
  const hash = location.hash.replace(/^#\/?/, '');
  if (hash === 'roadmap' || hash === 'missables' || hash === 'sources') return hash;
  return 'checklist';
}

function paintChrome() {
  for (const link of document.querySelectorAll('.tabs a')) {
    link.classList.toggle('active', link.dataset.view === ui.view);
  }
  toolbarEl.style.display = ui.view === 'checklist' ? '' : 'none';
  spoilerEl.setAttribute('aria-pressed', String(ledger.spoilers));
  spoilerEl.textContent = ledger.spoilers ? 'Spoilers: hidden' : 'Spoilers: shown';
  hideEarnedEl.checked = ledger.hideEarned;
}

function render() {
  paintChrome();
  updateProgress(trophies, ledger);
  if (ui.view === 'roadmap') renderRoadmap(viewEl, trophies, ledger);
  else if (ui.view === 'missables') renderMissables(viewEl, trophies, ledger);
  else if (ui.view === 'sources') renderSources(viewEl);
  else renderChecklist(viewEl, trophies, ledger, { ...ui, hideEarned: ledger.hideEarned });
  renderDetail(detailEl, selected ? byName(selected) : null, ledger);
}

function openDetail(name) {
  selected = name;
  renderDetail(detailEl, byName(name), ledger);
}

function closeDetail() {
  selected = null;
  renderDetail(detailEl, null, ledger);
}

function reroute() {
  ui.view = routeFromHash();
  closeDetail();
  render();
}

// Checklist clicks: a row opens its detail; a mini-row on the roadmap does
// the same. The checkbox inside a row is handled by the change listener.
viewEl.addEventListener('click', (event) => {
  const row = event.target.closest('.row, .mini-row');
  if (row && row.dataset.name) openDetail(row.dataset.name);
});
viewEl.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const row = event.target.closest('.row, .mini-row');
  if (row && row.dataset.name) { event.preventDefault(); openDetail(row.dataset.name); }
});
viewEl.addEventListener('change', (event) => {
  const box = event.target.closest('input[type="checkbox"][data-name]');
  if (!box) return;
  setEarned(ledger, box.dataset.name, box.checked);
  render();
});

detailEl.addEventListener('click', (event) => {
  if (event.target.closest('[data-close-detail]')) { closeDetail(); return; }
  const earn = event.target.closest('.detail-earn');
  if (earn && earn.dataset.name) {
    setEarned(ledger, earn.dataset.name, !isEarned(ledger, earn.dataset.name));
    render();
  }
});
detailEl.addEventListener('change', (event) => {
  const area = event.target.closest('textarea[data-name]');
  if (area) setNote(ledger, area.dataset.name, area.value.trim());
});

searchEl.addEventListener('input', () => { ui.query = searchEl.value; if (ui.view === 'checklist') render(); });
kindEl.addEventListener('change', () => { ui.kind = kindEl.value; if (ui.view === 'checklist') render(); });
gradeEl.addEventListener('change', () => { ui.grade = gradeEl.value; if (ui.view === 'checklist') render(); });
hideEarnedEl.addEventListener('change', () => {
  ledger.hideEarned = hideEarnedEl.checked;
  saveLedger(ledger);
  if (ui.view === 'checklist') render();
});
spoilerEl.addEventListener('click', () => {
  ledger.spoilers = !ledger.spoilers;
  saveLedger(ledger);
  render();
});

exportEl.addEventListener('click', () => {
  const blob = new Blob([buildExport(ledger)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'leonida-ledger-progress.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

importEl.addEventListener('change', async () => {
  const file = importEl.files && importEl.files[0];
  importEl.value = '';
  if (!file) return;
  const parsed = parseImport(await file.text());
  if (!parsed) return;
  const known = new Set(trophies.map((t) => t.name));
  ledger.earned = parsed.earned.filter((name) => known.has(name));
  ledger.notes = {};
  for (const [name, text] of Object.entries(parsed.notes)) {
    if (known.has(name)) ledger.notes[name] = text;
  }
  saveLedger(ledger);
  closeDetail();
  render();
});

resetEl.addEventListener('click', () => {
  if (!window.confirm('Reset all earned trophies and notes? Your settings stay as they are.')) return;
  ledger.earned = [];
  ledger.notes = {};
  saveLedger(ledger);
  closeDetail();
  render();
});

window.addEventListener('hashchange', reroute);

async function boot() {
  const response = await fetch('data/trophies.json');
  const data = await response.json();
  trophies = data.trophies;
  ui.view = routeFromHash();
  render();
}

boot();
