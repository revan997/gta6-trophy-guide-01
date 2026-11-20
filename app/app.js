// Leonida Ledger — boot and wiring. Loads the trophy list, restores saved progress,
// and keeps the header, the filters and the current view in sync.
import { loadStore, saveStore, toggleEarned, setNote, exportProgress, importProgress } from './store.js';
import { KIND_LABELS, renderChecklist, renderDetail, renderRoadmap, renderMissables, renderSources } from './views.js';

const store = loadStore();
const data = await (await fetch('data/trophies.json')).json();
const validNames = data.trophies.map((t) => t.name);

const viewEl = document.getElementById('view');
const detailEl = document.getElementById('detail');
const controlsEl = document.getElementById('controls');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('gradeFilter');
const hideEarnedEl = document.getElementById('hideEarned');
const spoilerEl = document.getElementById('spoilerToggle');

let currentView = 'checklist';
let selectedName = null;
let kindFilter = 'all';

// Kind filter chips, in the order the guide teaches the game.
const kinds = ['all', 'story', 'side', 'collectibles', 'activities', 'robbery', 'exploration', 'combat', 'secrets', 'misc', 'completion', 'platinum'];
const chipsEl = document.getElementById('kindChips');
for (const kind of kinds) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'chip' + (kind === 'all' ? ' active' : '');
  chip.textContent = kind === 'all' ? 'All kinds' : KIND_LABELS[kind];
  chip.addEventListener('click', () => {
    kindFilter = kind;
    for (const c of chipsEl.children) c.classList.toggle('active', c === chip);
    render();
  });
  chipsEl.append(chip);
}

function filters() {
  return { query: searchEl.value, kind: kindFilter, grade: gradeEl.value, hideEarned: hideEarnedEl.checked };
}

function renderHeader() {
  const earned = store.earned.length;
  document.getElementById('earnedCount').textContent = earned;
  document.getElementById('progressFill').style.width = (earned / data.trophies.length * 100).toFixed(1) + '%';
  const counts = {};
  for (const t of data.trophies) counts[t.grade] = (counts[t.grade] || 0) + (store.earned.includes(t.name) ? 1 : 0);
  const totals = {};
  for (const t of data.trophies) totals[t.grade] = (totals[t.grade] || 0) + 1;
  const wrap = document.getElementById('gradeCounts');
  wrap.replaceChildren();
  for (const grade of ['platinum', 'gold', 'silver', 'bronze']) {
    const span = document.createElement('span');
    const dot = document.createElement('span');
    dot.className = 'dot ' + grade;
    span.append(dot, document.createTextNode(grade + ' '), document.createElement('b'));
    span.lastChild.textContent = (counts[grade] || 0) + '/' + totals[grade];
    wrap.append(span);
  }
}

function selectedTrophy() {
  return data.trophies.find((t) => t.name === selectedName) || null;
}

function renderDetailPane() {
  const trophy = selectedTrophy();
  if (!trophy || currentView !== 'checklist') {
    detailEl.hidden = true;
    detailEl.replaceChildren();
    return;
  }
  renderDetailInto(trophy);
}

function renderDetailInto(trophy) {
  renderDetail(detailEl, trophy, data, store, {
    closeDetail: () => { selectedName = null; render(); },
    toggle: (t) => { toggleEarned(store, t.name); render(); },
    setNote: (t, text) => setNote(store, t.name, text),
  });
}

function render() {
  renderHeader();
  controlsEl.style.display = currentView === 'checklist' ? '' : 'none';
  if (currentView === 'checklist') {
    renderChecklist(viewEl, data, store, filters(), {
      selected: selectedName,
      openDetail: (t) => { selectedName = t.name; render(); },
      toggle: (t) => { toggleEarned(store, t.name); render(); },
    });
    renderDetailPane();
  } else if (currentView === 'roadmap') {
    detailEl.hidden = true;
    renderRoadmap(viewEl, data, store, {
      toggle: (t) => { toggleEarned(store, t.name); render(); },
      openDetail: (t) => { selectedName = t.name; currentView = 'checklist'; syncTabs(); render(); },
    });
  } else if (currentView === 'missables') {
    detailEl.hidden = true;
    renderMissables(viewEl, data, store);
  } else {
    detailEl.hidden = true;
    renderSources(viewEl, data);
  }
}

function syncTabs() {
  for (const tab of document.querySelectorAll('.tab')) {
    tab.classList.toggle('active', tab.dataset.view === currentView);
  }
}

function viewFromHash() {
  const hash = location.hash.replace(/^#/, '');
  return ['checklist', 'roadmap', 'missables', 'sources'].includes(hash) ? hash : 'checklist';
}

for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => {
    currentView = tab.dataset.view;
    history.replaceState(null, '', currentView === 'checklist' ? location.pathname : '#' + currentView);
    syncTabs();
    render();
  });
}
window.addEventListener('hashchange', () => {
  currentView = viewFromHash();
  syncTabs();
  render();
});
currentView = viewFromHash();

searchEl.addEventListener('input', () => {
  if (currentView === 'checklist') renderChecklist(viewEl, data, store, filters(), {
    selected: selectedName,
    openDetail: (t) => { selectedName = t.name; render(); },
    toggle: (t) => { toggleEarned(store, t.name); render(); },
  });
});
gradeEl.addEventListener('change', render);
hideEarnedEl.addEventListener('change', () => { store.hideEarned = hideEarnedEl.checked; saveStore(store); render(); });
spoilerEl.addEventListener('change', () => { store.spoilers = spoilerEl.checked; saveStore(store); render(); });
hideEarnedEl.checked = store.hideEarned;
spoilerEl.checked = store.spoilers;

document.getElementById('exportBtn').addEventListener('click', () => {
  const n = exportProgress(store);
  document.getElementById('exportBtn').textContent = n ? 'Exported ' + n + ' earned' : 'Nothing to export yet';
  setTimeout(() => { document.getElementById('exportBtn').textContent = 'Export progress'; }, 2500);
});
document.getElementById('importFile').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const n = await importProgress(store, file, validNames);
    alert('Imported ' + n + ' earned trophies.');
    render();
  } catch (err) {
    alert('Could not import that file: ' + err.message);
  }
  event.target.value = '';
});
document.getElementById('resetBtn').addEventListener('click', () => {
  if (!store.earned.length && !Object.keys(store.notes).length) return;
  if (!confirm('Clear all earned trophies and notes in this browser?')) return;
  store.earned = [];
  store.notes = {};
  saveStore(store);
  selectedName = null;
  render();
});

render();
