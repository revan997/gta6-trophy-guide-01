// Leonida Ledger — saved progress. One localStorage key holds everything the
// tracker needs: the earned trophy names, per-trophy notes, and the two
// display settings. Nothing leaves the browser except through Export.
export const LEDGER_KEY = 'leonida-ledger-v1';
export const APP_TAG = 'leonida-ledger';
export const APP_VERSION = 1;

function blankLedger() {
  return { app: APP_TAG, version: APP_VERSION, earned: [], notes: {}, spoilers: true, hideEarned: false };
}

// Read the saved ledger, tolerating a missing key, bad JSON, or an older
// shape: unknown fields are dropped, known ones keep their types.
export function loadLedger() {
  const fresh = blankLedger();
  let raw = null;
  try { raw = localStorage.getItem(LEDGER_KEY); } catch { return fresh; }
  if (!raw) return fresh;
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch { return fresh; }
  if (!parsed || typeof parsed !== 'object') return fresh;
  if (Array.isArray(parsed.earned)) {
    fresh.earned = parsed.earned.filter((n) => typeof n === 'string');
  }
  if (parsed.notes && typeof parsed.notes === 'object' && !Array.isArray(parsed.notes)) {
    for (const [name, text] of Object.entries(parsed.notes)) {
      if (typeof text === 'string') fresh.notes[name] = text;
    }
  }
  if (typeof parsed.spoilers === 'boolean') fresh.spoilers = parsed.spoilers;
  if (typeof parsed.hideEarned === 'boolean') fresh.hideEarned = parsed.hideEarned;
  return fresh;
}

export function saveLedger(ledger) {
  try {
    localStorage.setItem(LEDGER_KEY, JSON.stringify({
      app: APP_TAG,
      version: APP_VERSION,
      earned: ledger.earned,
      notes: ledger.notes,
      spoilers: ledger.spoilers,
      hideEarned: ledger.hideEarned,
    }));
  } catch { /* private mode or full storage: progress just does not persist */ }
}

export function isEarned(ledger, name) {
  return ledger.earned.includes(name);
}

export function setEarned(ledger, name, earned) {
  const has = ledger.earned.includes(name);
  if (earned && !has) ledger.earned.push(name);
  if (!earned && has) ledger.earned = ledger.earned.filter((n) => n !== name);
  saveLedger(ledger);
}

export function setNote(ledger, name, text) {
  if (text) ledger.notes[name] = text;
  else delete ledger.notes[name];
  saveLedger(ledger);
}

// The export file: the same shape the importer accepts, plus a timestamp so
// two exports can be told apart. Earned names are the stable identifiers.
export function buildExport(ledger) {
  return JSON.stringify({
    app: APP_TAG,
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    earned: [...ledger.earned],
    notes: { ...ledger.notes },
  }, null, 2);
}

// Validate an imported file before it touches the ledger: it must be our
// app's payload, with an earned list of strings. Unknown names are dropped
// by the caller, which knows the trophy list.
export function parseImport(text) {
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { return null; }
  if (!parsed || typeof parsed !== 'object') return null;
  if (parsed.app !== APP_TAG) return null;
  if (!Array.isArray(parsed.earned)) return null;
  if (!parsed.earned.every((n) => typeof n === 'string')) return null;
  const notes = {};
  if (parsed.notes && typeof parsed.notes === 'object' && !Array.isArray(parsed.notes)) {
    for (const [name, value] of Object.entries(parsed.notes)) {
      if (typeof value === 'string') notes[name] = value;
    }
  }
  return { earned: parsed.earned, notes };
}

// Count earned trophies per grade for the header line.
export function gradeCounts(trophies, ledger) {
  const out = { platinum: [0, 0], gold: [0, 0], silver: [0, 0], bronze: [0, 0] };
  for (const trophy of trophies) {
    const bucket = out[trophy.grade];
    if (!bucket) continue;
    bucket[1] += 1;
    if (isEarned(ledger, trophy.name)) bucket[0] += 1;
  }
  return out;
}
