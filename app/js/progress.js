// Saved progress for the Leonida Ledger: what the reader has earned, their
// per-trophy notes, and their settings, kept in localStorage and portable
// as a JSON file (export / import). No network, no account, no cookies.

export const STORAGE_KEY = 'leonida-ledger-v1';

export const EMPTY_STATE = Object.freeze({
  earned: {},
  notes: {},
  spoilers: false,
  hideEarned: false,
  kind: 'all',
  grade: 'all',
  query: '',
  view: 'checklist',
  selectedId: null,
});

// Read the saved state, tolerating a missing or damaged entry.
export function loadSavedState() {
  let raw = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return structuredClone(EMPTY_STATE);
  }
  if (!raw) return structuredClone(EMPTY_STATE);
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return structuredClone(EMPTY_STATE);
  }
  if (!parsed || typeof parsed !== 'object') return structuredClone(EMPTY_STATE);
  const state = structuredClone(EMPTY_STATE);
  if (parsed.earned && typeof parsed.earned === 'object') {
    for (const [id, value] of Object.entries(parsed.earned)) {
      if (value) state.earned[id] = true;
    }
  }
  if (parsed.notes && typeof parsed.notes === 'object') {
    for (const [id, value] of Object.entries(parsed.notes)) {
      if (typeof value === 'string' && value.trim()) state.notes[id] = value;
    }
  }
  if (typeof parsed.spoilers === 'boolean') state.spoilers = parsed.spoilers;
  if (typeof parsed.hideEarned === 'boolean') state.hideEarned = parsed.hideEarned;
  if (typeof parsed.kind === 'string') state.kind = parsed.kind;
  if (typeof parsed.grade === 'string') state.grade = parsed.grade;
  if (typeof parsed.query === 'string') state.query = parsed.query;
  if (typeof parsed.view === 'string') state.view = parsed.view;
  if (parsed.selectedId != null) state.selectedId = parsed.selectedId;
  return state;
}

// Persist the state. Returns true when the write landed.
export function saveState(state) {
  const payload = {
    earned: state.earned,
    notes: state.notes,
    spoilers: state.spoilers,
    hideEarned: state.hideEarned,
    kind: state.kind,
    grade: state.grade,
    query: state.query,
    view: state.view,
    selectedId: state.selectedId,
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function isEarned(state, trophyId) {
  return Boolean(state.earned[String(trophyId)]);
}

export function setEarned(state, trophyId, earned) {
  if (earned) {
    state.earned[String(trophyId)] = true;
  } else {
    delete state.earned[String(trophyId)];
  }
}

export function earnedCount(state) {
  return Object.keys(state.earned).length;
}

export function earnedByGrade(state, trophies) {
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const trophy of trophies) {
    if (isEarned(state, trophy.id)) counts[trophy.grade] += 1;
  }
  return counts;
}

// Build the portable export document (versioned, so future imports can tell).
export function buildExportDocument(state) {
  return {
    app: 'leonida-ledger',
    version: 1,
    exportedAt: new Date().toISOString(),
    earned: Object.keys(state.earned).map(Number).sort((a, b) => a - b),
    notes: state.notes,
    spoilers: state.spoilers,
  };
}

// Parse an imported document. Returns { state } or { error }.
export function parseImportDocument(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: 'That file is not valid JSON.' };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { error: 'That file is not a Leonida Ledger export.' };
  }
  const earnedList = Array.isArray(parsed.earned) ? parsed.earned : null;
  if (!earnedList && !(parsed.earned && typeof parsed.earned === 'object')) {
    return { error: 'That file has no earned-trophy list in it.' };
  }
  const state = structuredClone(EMPTY_STATE);
  const ids = Array.isArray(earnedList) ? earnedList : Object.keys(parsed.earned);
  for (const id of ids) {
    const n = Number(id);
    if (Number.isInteger(n) && n >= 1 && n <= 55) state.earned[String(n)] = true;
  }
  if (parsed.notes && typeof parsed.notes === 'object') {
    for (const [id, value] of Object.entries(parsed.notes)) {
      if (typeof value === 'string' && value.trim()) state.notes[id] = value;
    }
  }
  if (typeof parsed.spoilers === 'boolean') state.spoilers = parsed.spoilers;
  return { state };
}

// Offer a JSON file for download. Returns true when the click was issued.
export function downloadJson(filename, exportDocument) {
  const blob = new Blob([JSON.stringify(exportDocument, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
