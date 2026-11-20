// Saved progress for the Leonida Ledger: localStorage, export and import.
// Nothing leaves the browser except the file the reader chooses to download.
export const STORE_KEY = 'leonida-ledger-v1';

export function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return freshStore();
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return freshStore();
    return {
      earned: Array.isArray(data.earned) ? data.earned.filter((n) => typeof n === 'string') : [],
      notes: data.notes && typeof data.notes === 'object' ? data.notes : {},
      spoilers: data.spoilers !== false,
      hideEarned: data.hideEarned === true,
    };
  } catch {
    return freshStore();
  }
}

export function freshStore() {
  return { earned: [], notes: {}, spoilers: true, hideEarned: false };
}

export function saveStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export function isEarned(store, name) {
  return store.earned.includes(name);
}

export function toggleEarned(store, name) {
  const at = store.earned.indexOf(name);
  if (at >= 0) store.earned.splice(at, 1);
  else store.earned.push(name);
  saveStore(store);
  return store.earned.includes(name);
}

export function setNote(store, name, text) {
  if (text.trim()) store.notes[name] = text.trim();
  else delete store.notes[name];
  saveStore(store);
}

// Export: one JSON file the reader can keep, move to another browser, or back up.
export function exportProgress(store) {
  const payload = {
    app: 'leonida-ledger',
    game: 'Grand Theft Auto VI',
    exportedAt: new Date().toISOString(),
    earned: [...store.earned].sort(),
    notes: store.notes,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gta6-trophy-progress.json';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return payload.earned.length;
}

// Import: only names that exist in the official list are accepted; anything else is ignored.
export async function importProgress(store, file, validNames) {
  const text = await file.text();
  const data = JSON.parse(text);
  const names = Array.isArray(data) ? data : data.earned;
  if (!Array.isArray(names)) throw new Error('That file has no earned-trophy list in it.');
  const valid = new Set(validNames);
  const earned = [...new Set(names.filter((n) => typeof n === 'string' && valid.has(n)))];
  store.earned = earned;
  if (data && typeof data === 'object' && data.notes && typeof data.notes === 'object') {
    for (const [name, note] of Object.entries(data.notes)) {
      if (valid.has(name) && typeof note === 'string' && note.trim()) store.notes[name] = note.trim();
    }
  }
  saveStore(store);
  return earned.length;
}
