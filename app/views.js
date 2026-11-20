// Views for the Leonida Ledger: checklist, roadmap, missables and sources.
// Every view is plain DOM built from app/data/trophies.json — no network, no framework.
import { isEarned } from './store.js';

export const KIND_LABELS = {
  story: 'Story',
  side: 'Side quests',
  collectibles: 'Collectibles',
  activities: 'Activities',
  robbery: 'Robbery',
  exploration: 'Exploration',
  combat: 'Combat',
  secrets: 'Secrets',
  misc: 'Money & misc',
  completion: '100% completion',
  platinum: 'Platinum',
};

const GRADE_LETTER = { platinum: 'P', gold: 'G', silver: 'S', bronze: 'B' };

// The spoiler rule: with spoilers on, a story trophy the reader has not earned yet
// shows no name, no description and no guide — only its grade and that it is a story trophy.
export function spoilerHidden(trophy, store) {
  return store.spoilers && trophy.kind === 'story' && !isEarned(store, trophy.name);
}

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function medal(trophy) {
  const m = el('span', 'medal ' + trophy.grade, GRADE_LETTER[trophy.grade]);
  m.title = trophy.grade;
  m.setAttribute('aria-label', trophy.grade + ' trophy');
  return m;
}

function tagsFor(trophy) {
  const wrap = el('div', 't-tags');
  wrap.append(el('span', 'tag grade', trophy.grade));
  const kindLabel = KIND_LABELS[trophy.kind] || trophy.kind;
  if (kindLabel.toLowerCase() !== trophy.grade) wrap.append(el('span', 'tag', kindLabel));
  if (trophy.count) wrap.append(el('span', 'tag count', 'Target: ' + trophy.count));
  if (trophy.missable) wrap.append(el('span', 'tag missable', 'Potentially missable'));
  return wrap;
}

// Checklist: one row a trophy, tick to earn, click the row to open its guide.
export function renderChecklist(container, data, store, filters, callbacks) {
  container.replaceChildren();
  const { query, kind, grade, hideEarned } = filters;
  const q = query.trim().toLowerCase();
  const shown = data.trophies.filter((t) => {
    if (kind !== 'all' && t.kind !== kind) return false;
    if (grade !== 'all' && t.grade !== grade) return false;
    if (hideEarned && isEarned(store, t.name)) return false;
    if (q) {
      const hay = (t.name + ' ' + t.description + ' ' + t.guide + ' ' + (KIND_LABELS[t.kind] || '')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const line = el('p', 'count-line');
  line.innerHTML = '';
  line.append(
    document.createTextNode('Showing '),
    el('b', null, String(shown.length)),
    document.createTextNode(' of 55 trophies · '),
    el('b', null, String(store.earned.length)),
    document.createTextNode(' earned'),
  );
  container.append(line);
  if (!shown.length) {
    container.append(el('p', 'empty', 'No trophies match those filters. Clear the search or pick another kind.'));
    return;
  }
  const list = el('ul', 'trophy-list');
  for (const t of shown) {
    const earned = isEarned(store, t.name);
    const hidden = spoilerHidden(t, store);
    const li = el('li');
    const row = el('button', 'row' + (earned ? ' earned' : '') + (callbacks.selected === t.name ? ' selected' : ''));
    row.type = 'button';
    row.addEventListener('click', (event) => {
      if (event.target === box) return;
      callbacks.openDetail(t);
    });
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned;
    box.setAttribute('aria-label', 'Mark ' + t.name + ' as earned');
    box.addEventListener('change', () => callbacks.toggle(t));
    box.addEventListener('click', (event) => event.stopPropagation());
    row.append(box, medal(t));
    const main = el('div', 't-main');
    if (hidden) {
      main.append(el('div', 't-name', 'Hidden story trophy'));
      main.append(el('div', 't-desc', 'A story trophy — its name and description stay hidden until you earn it, or turn spoilers off.'));
      const spoiler = el('div', 'spoiler-box');
      spoiler.innerHTML = '<b>Spoiler hidden.</b> Earn this trophy in the game, or switch “Hide story spoilers” off above to see it.';
      main.append(spoiler);
    } else {
      main.append(el('div', 't-name', t.name));
      main.append(el('div', 't-desc', t.description));
      main.append(tagsFor(t));
      const guide = el('div', 't-guide');
      guide.textContent = t.guide.length > 220 ? t.guide.slice(0, 220).trimEnd() + '…' : t.guide;
      main.append(guide);
    }
    row.append(main);
    li.append(row);
    list.append(li);
  }
  container.append(list);
}

// Detail drawer: the full guide to one trophy, with its steps, its missable note and its sources.
export function renderDetail(panel, trophy, data, store, callbacks) {
  panel.hidden = false;
  panel.replaceChildren();
  const close = el('button', 'close', 'Close');
  close.type = 'button';
  close.addEventListener('click', () => callbacks.closeDetail());
  panel.append(close);
  const earned = isEarned(store, trophy.name);
  panel.append(el('h2', null, trophy.name));
  panel.append(el('p', 'official', '“' + trophy.description + '” — official description'));
  panel.append(tagsFor(trophy));
  if (trophy.missable) {
    const warn = el('div', 'warn');
    warn.innerHTML = '<b>Potentially missable — the only one on the list.</b> Do Lucia’s balcony meditation in Chapter 1 before the chapter ends (see the steps below). There is no mission replay, so keep a manual save at the start of each chapter.';
    panel.append(warn);
  }
  panel.append(el('h3', null, 'How to get it'));
  panel.append(el('p', null, trophy.guide));
  if (trophy.steps && trophy.steps.length) {
    panel.append(el('h3', null, 'Steps'));
    const ol = el('ol');
    for (const step of trophy.steps) ol.append(el('li', null, step));
    panel.append(ol);
  }
  panel.append(el('h3', null, 'Sources'));
  const intro = el('p', null, 'Guide written in our own words from these sources — nothing copied. Links open only if you follow them; this app fetches nothing.');
  panel.append(intro);
  const list = el('ul', 'src-list');
  for (const key of trophy.sources || []) {
    const src = data.sources[key];
    if (!src) continue;
    const li = el('li');
    const a = document.createElement('a');
    a.href = src.url;
    a.rel = 'noopener';
    a.textContent = src.name;
    li.append(a);
    list.append(li);
  }
  panel.append(list);
  const noteLabel = el('label', 'note-label', 'Your note (saved in this browser)');
  const note = document.createElement('textarea');
  note.value = store.notes[trophy.name] || '';
  note.placeholder = 'e.g. “Meditation spot 7 done, 11 to go”';
  note.setAttribute('aria-label', 'Your note for ' + trophy.name);
  note.addEventListener('change', () => callbacks.setNote(trophy, note.value));
  noteLabel.append(note);
  panel.append(noteLabel);
  const earn = el('button', 'earn-btn' + (earned ? ' earned' : ''), earned ? '✓ Earned — tap to unmark' : 'Mark as earned');
  earn.type = 'button';
  earn.addEventListener('click', () => callbacks.toggle(trophy));
  panel.append(earn);
}

// Roadmap: the three stages to the platinum, the facts that frame the run, and what to do next.
export function renderRoadmap(container, data, store, callbacks) {
  container.replaceChildren();
  const stages = [
    { n: 1, title: 'Stage 1 — Play the story', hours: '60–80 hours', body: 'Finish Chapters 1–5 and enjoy the game. The 100% checklist is not visible until after the story, but everything you do now already counts. There are no mission medals, so play how you like — with one exception in Chapter 1 (see Missables). Do side content as you find it; the quest givers for trophies all come back later.' },
    { n: 2, title: 'Stage 2 — 100% Completion checklist', hours: 'About 100 hours', body: 'After the story, open Progress > Stats > 100% Completion. It is lenient — about 60% true completion. Scan 200 of 277 base-model vehicles, study 100 of 255 animals, finish any 70 of 80 challenges and any 100 optional missions, and complete the required robberies, ranges, drone races, underwater finds and Bret’s quests. Nothing here is missable.' },
    { n: 3, title: 'Stage 3 — Strangers, secrets & clean-up', hours: 'About 10 hours', body: 'Sweep what is left: the 8 Strangers & Freaks strands, the partner robberies, the combat one-offs, the secrets (UFO, the blue Banshee, the cocktail on Ocean Beach) and the money trophies. Then the platinum pops.' },
  ];
  const facts = el('div', 'card');
  facts.append(el('h2', null, 'The platinum in numbers'));
  const chips = el('div', 'facts');
  for (const [big, small] of [['~200 h', 'to the platinum'], ['4/10', 'difficulty (PowerPyx)'], ['1', 'playthrough needed'], ['0', 'online trophies'], ['1', 'potentially missable'], ['15', 'manual save slots'], ['No', 'mission replay'], ['Yes', 'cheats disable trophies']]) {
    const f = el('div', 'fact');
    f.append(el('b', null, big), document.createTextNode(small));
    chips.append(f);
  }
  facts.append(chips);
  facts.append(el('p', null, 'Save advice: keep a manual save at the start and end of each chapter (10 saves), then rotate the remaining 5 for free-roam clean-up.'));
  container.append(facts);
  for (const stage of stages) {
    const members = data.trophies.filter((t) => t.stage === stage.n);
    const done = members.filter((t) => isEarned(store, t.name)).length;
    const card = el('div', 'card');
    const head = el('div', 'stage-head');
    head.append(el('h2', null, stage.title));
    head.append(el('span', 'stage-progress', done + ' / ' + members.length + ' · ' + stage.hours));
    card.append(head, el('p', null, stage.body));
    const list = el('ul', 'mini-list');
    for (const t of members) {
      const li = el('li');
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = isEarned(store, t.name);
      box.setAttribute('aria-label', 'Mark ' + t.name + ' as earned');
      box.addEventListener('change', () => callbacks.toggle(t));
      const label = el('span', isEarned(store, t.name) ? 'done' : null, spoilerHidden(t, store) ? 'Hidden story trophy' : t.name);
      li.append(box, label);
      if (t.missable) li.append(el('span', 'tag missable', 'Potentially missable'));
      list.append(li);
    }
    card.append(list);
    container.append(card);
  }
  // Next up: the next five unearned trophies in roadmap order — the plan for the next session.
  const next = data.trophies.filter((t) => !isEarned(store, t.name)).sort((a, b) => a.stage - b.stage || a.id - b.id).slice(0, 5);
  const planner = el('div', 'card');
  planner.append(el('h2', null, 'Next up — your next session'));
  planner.append(el('p', null, 'The next five unearned trophies in roadmap order. Tap one to open its guide.'));
  const wrap = el('div', 'nextup');
  for (const t of next) {
    const row = el('button', 'row');
    row.type = 'button';
    row.addEventListener('click', () => callbacks.openDetail(t));
    row.append(medal(t));
    const main = el('div', 't-main');
    main.append(el('div', 't-name', spoilerHidden(t, store) ? 'Hidden story trophy' : t.name));
    main.append(el('div', 't-desc', 'Stage ' + t.stage + ' · ' + (KIND_LABELS[t.kind] || t.kind)));
    row.append(main);
    wrap.append(row);
  }
  planner.append(wrap);
  container.append(planner);
}

// Missables: the one trophy to watch, and why nothing else can lock you out.
export function renderMissables(container, data, store) {
  container.replaceChildren();
  const card = el('div', 'card');
  card.append(el('h2', null, 'Missable trophies: 1 to watch, 54 safe'));
  const warn = el('div', 'warn');
  warn.innerHTML = '<b>Positive Mental Attitude — potentially missable.</b> Meditate at every spot across Leonida (18 spots, 10 locations). The first meditation, Lucia’s on the balcony at Jason’s house in Chapter 1, disappears once the chapter ends — and it is not yet confirmed whether it counts toward the trophy. Do it to be safe.';
  card.append(warn);
  card.append(el('h3', null, 'What to do in Chapter 1'));
  const ol = el('ol');
  for (const step of [
    'After the Chapter 1 mission Down to Earth, talk to Lucia in the kitchen in the morning.',
    'She says she is going to meditate and walks out to the balcony. Follow her and choose “Accept”.',
    'She shows you how to meditate. It adds +1 to the counter in the Progress menu.',
    'Keep a manual save at the start of Chapter 1 as well, so you can go back if you miss it.',
  ]) ol.append(el('li', null, step));
  card.append(ol);
  card.append(el('p', null, 'Source: PowerPyx’s trophy guide & roadmap — the Chapter 1 meditation is the only missable step it flags, and it notes the requirement is still unconfirmed.'));
  container.append(card);
  const safe = el('div', 'card');
  safe.append(el('h2', null, 'Why nothing else can lock you out'));
  const ul = el('ul');
  for (const line of [
    'No mission replay and no New Game+ — but every trophy-related quest giver comes back later in the game, so a quest you skip is not lost.',
    'Optional missions that disappear (black icons with pink letters) do not matter for trophies; there are far more than the 100 the 100% list needs.',
    'Some fences become permanently unavailable, but new ones unlock — and none of them gate a trophy.',
    'A few magazine collectibles sit in story buildings that later close, but the same magazines spawn elsewhere, and no trophy needs all of them.',
    'Some quests carry an hourglass icon and fail after a while. None of them is relevant to a trophy.',
    'The 100% checklist is only visible after the story, and nothing on it is missable — everything is doable in free-roam.',
    'Your criminal profile only changes how police treat you. The Irredeemable profile is permanent and best avoided, but it blocks no trophy.',
  ]) ul.append(el('li', null, line));
  safe.append(ul);
  safe.append(el('p', null, 'Sources: PowerPyx’s roadmap (missable-content notes) and the official trophy descriptions.'));
  container.append(safe);
  const strategy = el('div', 'card');
  strategy.append(el('h2', null, 'Save strategy'));
  const ul2 = el('ul');
  for (const line of [
    'The game supports 15 manual save slots plus 1 autosave slot.',
    'Keep a save at the start and end of each chapter — 10 saves cover the whole story.',
    'Rotate the remaining 5 saves for free-roam clean-up.',
    'Save before the final mission: it is the point of no return for the story.',
  ]) ul2.append(el('li', null, line));
  strategy.append(ul2);
  container.append(strategy);
}

// Sources: every source the guides draw on, what it was used for, and the honesty note.
export function renderSources(container, data) {
  container.replaceChildren();
  const card = el('div', 'card');
  card.append(el('h2', null, 'Sources'));
  card.append(el('p', null, 'Every guide on this page is written in our own words from the sources below — nothing is copied. A link opens only if you follow it; this app fetches nothing and works with the network off.'));
  const list = el('ul', 'src-list');
  for (const [key, src] of Object.entries(data.sources)) {
    const li = el('li');
    const a = document.createElement('a');
    a.href = src.url;
    a.rel = 'noopener';
    a.textContent = src.name;
    li.append(a, document.createTextNode(' — ' + src.usedFor));
    list.append(li);
  }
  card.append(list);
  card.append(el('h3', null, 'What is still unconfirmed'));
  card.append(el('p', null, 'Bad Luck, I Guess is not pinned down yet: PowerPyx lists it as currently unknown, believed to be tied to the Payday Loans store from the prologue. This guide says so plainly instead of guessing. The Chapter 1 meditation for Positive Mental Attitude is likewise unconfirmed as a requirement, and is flagged as “do it to be safe”.'));
  card.append(el('h3', null, 'The official list'));
  card.append(el('p', null, 'Trophy names, descriptions and grades are the official PlayStation 5 list as Exophase and PSNProfiles published it on 18 November 2026 — 55 trophies, 1 platinum, 2 gold, 6 silver, 46 bronze, 28 hidden. The list was checked against PowerPyx, Output Lag, GTA Zone, GTA Vibes and Leonida Intel, which all agree on the 55 names.'));
  container.append(card);
}
