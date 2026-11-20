// Rendering for the Leonida Ledger: the checklist, the detail pane, the
// roadmap, the missables page and the Next-up planner. Everything is built
// with textContent and created elements, never innerHTML, so trophy text
// can never run as markup.

import { earnedByGrade, earnedCount, isEarned } from './progress.js';
import { displayDescription, displayName, isSpoilerHidden, KINDS, KIND_LABELS, visibleTrophies } from './filters.js';
import { nextUp, stageProgress, stageTrophies, STAGES } from './roadmap.js';

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function gradeBadge(trophy) {
  return make('span', `badge grade-${trophy.grade}`, trophy.grade);
}

function kindBadge(trophy) {
  return make('span', 'badge', KIND_LABELS[trophy.kind] ?? trophy.kind);
}

function metaBadges(state, trophy) {
  const wrap = make('span', 'trophy-meta');
  wrap.append(gradeBadge(trophy), kindBadge(trophy));
  if (trophy.missable) wrap.append(make('span', 'badge missable', 'Missable'));
  if (trophy.unconfirmed) wrap.append(make('span', 'badge unconfirmed', 'Unconfirmed'));
  if (isSpoilerHidden(state, trophy)) wrap.append(make('span', 'badge spoiler', 'Spoiler hidden'));
  return wrap;
}

export function renderKindChips(state, onPick) {
  const fieldset = document.getElementById('kind-chips');
  fieldset.querySelectorAll('button').forEach((button) => button.remove());
  for (const [kind, label] of KINDS) {
    const button = make('button', 'chip', label);
    button.type = 'button';
    button.dataset.kind = kind;
    if (state.kind === kind) button.classList.add('is-active');
    button.addEventListener('click', () => onPick(kind));
    fieldset.append(button);
  }
}

export function renderProgress(state, trophies) {
  const earned = earnedCount(state);
  document.getElementById('progress-count').textContent = `${earned} / ${trophies.length} earned`;
  const bar = document.getElementById('progress-bar');
  bar.setAttribute('aria-valuenow', String(earned));
  document.getElementById('progress-fill').style.width = `${(earned / trophies.length) * 100}%`;
  const byGrade = earnedByGrade(state, trophies);
  const totals = { platinum: 1, gold: 2, silver: 6, bronze: 46 };
  const list = document.getElementById('grade-counts');
  list.textContent = '';
  for (const grade of ['platinum', 'gold', 'silver', 'bronze']) {
    const item = make('li', null);
    item.append(make('b', null, `${grade}: `), document.createTextNode(`${byGrade[grade]} / ${totals[grade]}`));
    list.append(item);
  }
  const note = document.getElementById('progress-note');
  if (earned === 0) {
    note.textContent = 'Tick a trophy off when you earn it. Your checklist is saved in this browser.';
  } else if (earned === trophies.length) {
    note.textContent = 'Platinum complete — Vice Got a Price! is yours. Leonida Legend.';
  } else {
    note.textContent = `${trophies.length - earned} to go. The Next up tab always knows what comes first.`;
  }
}

function trophyRow(state, trophy, onSelect, onToggle) {
  const row = make('li', 'trophy-row');
  if (isEarned(state, trophy.id)) row.classList.add('is-earned');
  if (state.selectedId === trophy.id) row.classList.add('is-selected');
  const check = make('input', 'trophy-check');
  check.type = 'checkbox';
  check.checked = isEarned(state, trophy.id);
  check.setAttribute('aria-label', `Earned: ${displayName(state, trophy)}`);
  check.addEventListener('change', () => onToggle(trophy.id, check.checked));
  const main = make('div', 'trophy-main');
  const nameButton = make('button', 'trophy-name', displayName(state, trophy));
  nameButton.type = 'button';
  nameButton.addEventListener('click', () => onSelect(trophy.id));
  const desc = make('p', 'trophy-desc', displayDescription(state, trophy));
  main.append(nameButton, desc, metaBadges(state, trophy));
  row.append(check, main);
  if (trophy.target != null) {
    row.append(make('span', 'trophy-target', `Target: ${trophy.target.toLocaleString('en-US')}`));
  } else {
    row.append(make('span', 'trophy-target', ''));
  }
  return row;
}

export function renderChecklist(state, trophies, onSelect, onToggle) {
  const list = document.getElementById('trophy-list');
  list.textContent = '';
  const visible = visibleTrophies(state, trophies);
  for (const trophy of visible) {
    list.append(trophyRow(state, trophy, onSelect, onToggle));
  }
  const count = document.getElementById('list-count');
  if (visible.length === trophies.length) {
    count.textContent = `Showing all ${trophies.length} trophies.`;
  } else {
    count.textContent = `Showing ${visible.length} of ${trophies.length} trophies — change the filters to see the rest.`;
  }
}

export function renderDetail(state, trophies, onNote) {
  const pane = document.getElementById('detail-pane');
  pane.textContent = '';
  const trophy = trophies.find((item) => item.id === state.selectedId);
  if (!trophy) {
    pane.append(make('p', 'detail-empty', 'Select a trophy to read its guide and sources.'));
    return;
  }
  pane.append(make('h3', null, displayName(state, trophy)));
  pane.append(make('p', 'trophy-desc', displayDescription(state, trophy)));
  pane.append(metaBadges(state, trophy));
  if (isSpoilerHidden(state, trophy)) {
    pane.append(make('p', 'detail-guide', 'Spoiler-safe mode is on and this story trophy is not earned yet. Its guide stays hidden until you earn it — tick it off in the checklist to reveal it.'));
    return;
  }
  pane.append(make('p', 'detail-guide-label', 'How to earn it'));
  pane.append(make('p', 'detail-guide', trophy.guide));
  if (trophy.unconfirmed) {
    pane.append(make('p', 'detail-unconfirmed', `Unconfirmed: ${trophy.unconfirmed}`));
  }
  pane.append(make('p', 'detail-sources-label', 'Sources'));
  const sources = make('ol', 'detail-sources');
  for (const source of trophy.sources) {
    const item = make('li', null);
    const link = make('a', null, source.label);
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener';
    item.append(link);
    sources.append(item);
  }
  pane.append(sources);
  pane.append(make('p', 'detail-note-label', 'Your note'));
  const note = make('textarea', 'detail-note');
  note.value = state.notes[String(trophy.id)] ?? '';
  note.placeholder = 'Your own note for this trophy — saved in this browser.';
  note.setAttribute('aria-label', `Note for ${trophy.name}`);
  note.addEventListener('input', () => onNote(trophy.id, note.value));
  pane.append(note);
}

export function renderRoadmap(state, trophies, onSelect) {
  const list = document.getElementById('stage-list');
  list.textContent = '';
  for (const stage of STAGES) {
    const card = make('li', 'stage-card');
    const heading = make('h3', null, `Stage ${stage.number}: ${stage.title} `);
    heading.append(make('span', 'stage-hours', `— ${stage.hours}`));
    card.append(heading);
    card.append(make('p', null, stage.blurb));
    const progress = stageProgress(state, stage, trophies);
    card.append(make('p', 'stage-progress', `${progress.earned} / ${progress.total} earned in this stage`));
    const items = make('ul', 'stage-trophies');
    for (const trophy of stageTrophies(stage, trophies)) {
      const item = make('li', null);
      if (isEarned(state, trophy.id)) item.classList.add('done');
      const button = make('button', 'trophy-name', displayName(state, trophy));
      button.type = 'button';
      button.addEventListener('click', () => onSelect(trophy.id));
      item.append(button);
      items.append(item);
    }
    card.append(items);
    list.append(card);
  }
}

export function renderMissables(state, trophies, onSelect, onToggle) {
  const list = document.getElementById('missable-list');
  list.textContent = '';
  const missable = trophies.filter((trophy) => trophy.missable);
  if (missable.length === 0) {
    list.append(make('p', null, 'No missable trophies are known for this game.'));
    return;
  }
  for (const trophy of missable) {
    list.append(trophyRow(state, trophy, onSelect, onToggle));
  }
}

export function renderPlanner(state, trophies, onSelect) {
  const list = document.getElementById('planner-list');
  list.textContent = '';
  const picks = nextUp(state, trophies);
  if (picks.length === 0) {
    list.append(make('p', 'planner-done', 'Nothing left — every trophy is earned.'));
    return;
  }
  picks.forEach((pick, index) => {
    const item = make('li', null);
    item.append(make('span', 'planner-rank', String(index + 1)));
    const body = make('div', null);
    const heading = make('h3', null);
    const button = make('button', null, displayName(state, pick.trophy));
    button.type = 'button';
    button.addEventListener('click', () => onSelect(pick.trophy.id));
    heading.append(button);
    body.append(heading, make('p', 'planner-reason', pick.reason), metaBadges(state, pick.trophy));
    item.append(body);
    list.append(item);
  });
}
