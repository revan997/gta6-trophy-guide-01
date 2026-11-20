// Leonida Ledger boot: load the trophy data, restore the reader's saved
// progress, render every view, and wire the toolbar, tabs and file tools.
// The app fetches one file of its own — data/trophies.json — and nothing else.

import {
  buildExportDocument,
  downloadJson,
  loadSavedState,
  parseImportDocument,
  saveState,
  setEarned,
} from './progress.js';
import {
  renderChecklist,
  renderDetail,
  renderKindChips,
  renderMissables,
  renderPlanner,
  renderProgress,
  renderRoadmap,
} from './views.js';

const VIEW_IDS = ['checklist', 'roadmap', 'missables', 'planner'];

function showView(state, view) {
  state.view = VIEW_IDS.includes(view) ? view : 'checklist';
  for (const id of VIEW_IDS) {
    document.getElementById(`view-${id}`).classList.toggle('is-active', id === state.view);
  }
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.view === state.view);
  });
  window.location.hash = state.view;
}

function renderAll(state, trophies) {
  renderProgress(state, trophies);
  renderKindChips(state, (kind) => {
    state.kind = kind;
    persistAndRender(state, trophies);
  });
  renderChecklist(state, trophies, (id) => selectTrophy(state, trophies, id), (id, earned) => {
    setEarned(state, id, earned);
    persistAndRender(state, trophies);
  });
  renderDetail(state, trophies, (id, text) => {
    if (text.trim()) {
      state.notes[String(id)] = text;
    } else {
      delete state.notes[String(id)];
    }
    saveState(state);
  });
  renderRoadmap(state, trophies, (id) => selectTrophy(state, trophies, id));
  renderMissables(state, trophies, (id) => selectTrophy(state, trophies, id), (id, earned) => {
    setEarned(state, id, earned);
    persistAndRender(state, trophies);
  });
  renderPlanner(state, trophies, (id) => selectTrophy(state, trophies, id));
}

function persistAndRender(state, trophies) {
  saveState(state);
  renderAll(state, trophies);
}

function selectTrophy(state, trophies, id) {
  state.selectedId = id;
  saveState(state);
  showView(state, 'checklist');
  renderAll(state, trophies);
  const pane = document.getElementById('detail-pane');
  if (pane && window.innerWidth < 900) pane.scrollIntoView({ block: 'nearest' });
}

function readHashView() {
  const hash = window.location.hash.replace('#', '');
  return VIEW_IDS.includes(hash) ? hash : 'checklist';
}

function setStatus(message) {
  document.getElementById('toolbar-status').textContent = message;
}

async function boot() {
  let data;
  try {
    const response = await fetch('data/trophies.json');
    if (!response.ok) throw new Error(`trophies.json: ${response.status}`);
    data = await response.json();
  } catch (error) {
    document.getElementById('trophy-list').textContent = '';
    document.getElementById('trophy-list').append(
      Object.assign(document.createElement('li'), {
        textContent: `Could not load the trophy list (${error.message}). Reload the page — the file lives beside this page, no network needed.`,
      }),
    );
    return;
  }
  const trophies = data.trophies;
  const state = loadSavedState();
  state.view = readHashView();

  // Toolbar controls, seeded from the saved state.
  const searchInput = document.getElementById('search-input');
  searchInput.value = state.query;
  searchInput.addEventListener('input', () => {
    state.query = searchInput.value;
    saveState(state);
    renderChecklist(state, trophies, (id) => selectTrophy(state, trophies, id), (id, earned) => {
      setEarned(state, id, earned);
      persistAndRender(state, trophies);
    });
  });
  const gradeSelect = document.getElementById('grade-select');
  gradeSelect.value = state.grade;
  gradeSelect.addEventListener('change', () => {
    state.grade = gradeSelect.value;
    persistAndRender(state, trophies);
  });
  const hideEarned = document.getElementById('hide-earned');
  hideEarned.checked = state.hideEarned;
  hideEarned.addEventListener('change', () => {
    state.hideEarned = hideEarned.checked;
    persistAndRender(state, trophies);
  });
  const spoilerToggle = document.getElementById('spoiler-toggle');
  spoilerToggle.checked = state.spoilers;
  spoilerToggle.addEventListener('change', () => {
    state.spoilers = spoilerToggle.checked;
    persistAndRender(state, trophies);
  });

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      showView(state, tab.dataset.view);
      saveState(state);
    });
  });
  window.addEventListener('hashchange', () => {
    showView(state, readHashView());
  });

  document.getElementById('export-button').addEventListener('click', () => {
    downloadJson('leonida-ledger-progress.json', buildExportDocument(state));
    setStatus('Progress exported — keep the file somewhere safe.');
  });
  document.getElementById('import-input').addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const text = await file.text();
    const result = parseImportDocument(text);
    if (result.error) {
      setStatus(result.error);
      return;
    }
    const imported = result.state;
    Object.assign(state, imported);
    state.view = readHashView();
    saveState(state);
    searchInput.value = state.query;
    gradeSelect.value = state.grade;
    hideEarned.checked = state.hideEarned;
    spoilerToggle.checked = state.spoilers;
    renderAll(state, trophies);
    setStatus(`Imported progress: ${Object.keys(state.earned).length} trophies earned.`);
  });
  document.getElementById('reset-button').addEventListener('click', () => {
    if (!window.confirm('Clear all earned trophies and notes in this browser?')) return;
    state.earned = {};
    state.notes = {};
    state.selectedId = null;
    saveState(state);
    renderAll(state, trophies);
    setStatus('Progress cleared.');
  });

  showView(state, state.view);
  renderAll(state, trophies);
}

boot();
