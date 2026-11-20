// Leonida Ledger — rendering. Pure functions of (trophies, ledger, ui): the
// checklist, the detail pane, the roadmap, the missables page and the sources
// page. Event wiring lives in main.js; this file only builds HTML strings.
import { isEarned, gradeCounts } from './state.js';

export const STAGES = {
  1: {
    title: 'Stage 1 — Play the story',
    time: '60–80 hours',
    blurb: 'Play the five chapters, take the optional missions as they appear, and scan vehicles and study animals as you go — the 100% checklist counts progress made during the story. One thing to do before Chapter 1 ends: the meditation at Jason\u2019s house.',
  },
  2: {
    title: 'Stage 2 — The 100% checklist',
    time: 'about 100 hours',
    blurb: 'After the credits, the checklist opens under Progress, Stats, 100% Completion. It is closer to 60% true completion: any 100 optional missions, 200 of 277 vehicles scanned, 100 of 255 animals studied, any 70 of 80 challenges — plus every robbery, shooting range and drone race.',
  },
  3: {
    title: 'Stage 3 — Cleanup and the platinum',
    time: 'about 10 hours',
    blurb: 'The Strangers & Freaks strands that do not count toward 100%, the character quests you skipped, and the one-off miscellaneous trophies — then the platinum. Leave Bad Luck, I Guess for last: nobody has confirmed how it unlocks yet.',
  },
};

const GRADE_LABEL = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
const KIND_LABEL = { story: 'Story', collectibles: 'Collectibles', activities: 'Activities', online: 'Online' };

export function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// The spoiler rule, in one place: a story trophy stays masked — name and
// description both — while spoilers are on and it is not yet earned. Grades,
// kinds and counts are public information and stay visible.
export function isMasked(trophy, ledger) {
  return trophy.kind === 'story' && ledger.spoilers && !isEarned(ledger, trophy.name);
}

export function displayName(trophy, ledger) {
  return isMasked(trophy, ledger) ? 'Hidden story trophy' : trophy.name;
}

export function displayDescription(trophy, ledger) {
  return isMasked(trophy, ledger)
    ? 'Story details stay hidden until you earn this trophy.'
    : trophy.description;
}

function chip(trophy) {
  return `<span class="chip ${trophy.grade}">${GRADE_LABEL[trophy.grade]}</span>`;
}

function kindTag(trophy) {
  const label = trophy.missable ? 'Missable' : KIND_LABEL[trophy.kind];
  const cls = trophy.missable ? 'tag missable' : 'tag';
  return `<span class="${cls}">${label}</span>`;
}

// The checklist, in official order (the platinum first). Filters apply in
// this order: kind, grade, hide-earned, then search — and a masked trophy
// never matches a search, so a search cannot leak a hidden name.
export function visibleTrophies(trophies, ledger, ui) {
  const query = ui.query.trim().toLowerCase();
  return trophies.filter((trophy) => {
    if (ui.kind === 'missable' && !trophy.missable) return false;
    if (ui.kind !== 'all' && ui.kind !== 'missable' && trophy.kind !== ui.kind) return false;
    if (ui.kind === 'online') return false;
    if (ui.grade !== 'all' && trophy.grade !== ui.grade) return false;
    if (ui.hideEarned && isEarned(ledger, trophy.name)) return false;
    if (query) {
      if (isMasked(trophy, ledger)) return false;
      const haystack = `${trophy.name} ${trophy.description} ${trophy.guide}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

function rowHtml(trophy, ledger) {
  const earned = isEarned(ledger, trophy.name);
  const note = ledger.notes[trophy.name] ? '<span class="row-note-flag" title="Has a note">&#9998; note</span>' : '';
  const count = trophy.count ? `<span class="row-count">Target ${Number(trophy.count).toLocaleString('en-US')}</span>` : '';
  return `<article class="row${earned ? ' earned' : ''}" data-name="${esc(trophy.name)}" tabindex="0">`
    + `<input type="checkbox" data-name="${esc(trophy.name)}"${earned ? ' checked' : ''} aria-label="Earned: ${esc(displayName(trophy, ledger))}">`
    + `<div><h3 class="row-name">${esc(displayName(trophy, ledger))}</h3>`
    + `<p class="row-desc">${esc(displayDescription(trophy, ledger))}</p>`
    + `<div class="row-meta">${chip(trophy)}${kindTag(trophy)}${note}</div></div>`
    + `${count}</article>`;
}

export function renderChecklist(viewEl, trophies, ledger, ui) {
  const shown = visibleTrophies(trophies, ledger, ui);
  if (!shown.length) {
    viewEl.innerHTML = '<p class="empty">No trophies match these filters. All 55 trophies are offline and single-player, so the Online filter is always empty — try clearing it.</p>';
    return;
  }
  viewEl.innerHTML = shown.map((trophy) => rowHtml(trophy, ledger)).join('');
}

// The detail pane for one trophy: official description, the guide in our own
// words, its sources, a missable warning where it applies, and a notes box.
// A masked story trophy shows only its grade and the placeholder text.
export function renderDetail(detailEl, trophy, ledger) {
  if (!trophy) { detailEl.hidden = true; detailEl.innerHTML = ''; return; }
  const earned = isEarned(ledger, trophy.name);
  const masked = isMasked(trophy, ledger);
  let html = '<button class="detail-close" type="button" data-close-detail aria-label="Close detail">&times;</button>';
  html += `<h2>${esc(displayName(trophy, ledger))}</h2>`;
  html += `<p class="row-desc">${esc(displayDescription(trophy, ledger))}</p>`;
  html += `<div class="row-meta">${chip(trophy)}${kindTag(trophy)}`;
  if (trophy.count) html += `<span class="tag">PSN target: ${Number(trophy.count).toLocaleString('en-US')}</span>`;
  html += '</div>';
  if (masked) {
    html += '<p class="detail-guide">Turn spoilers off, or earn this trophy, to see its guide. The spoiler setting hides story trophies until they are earned.</p>';
  } else {
    if (trophy.missable) {
      html += '<div class="warn"><strong>Potentially missable.</strong> This is the one trophy PowerPyx flags as possibly missable: the first meditation, at Jason\u2019s house in Chapter 1, becomes permanently unavailable after that chapter. Do it before Chapter 1 ends.</div>';
    }
    html += `<div class="detail-guide"><p>${esc(trophy.guide)}</p></div>`;
    html += '<span class="src-label">Sources — where each fact comes from</span><ul class="src-list">';
    for (const source of trophy.sources) {
      html += `<li><a href="${esc(source.url)}" target="_blank" rel="noopener">${esc(source.label)}</a></li>`;
    }
    html += '</ul>';
    html += `<div class="detail-note"><label for="detailNote">Your note for this trophy</label>`
      + `<textarea id="detailNote" data-name="${esc(trophy.name)}" placeholder="e.g. done at the second spot, 12 of 18…">${esc(ledger.notes[trophy.name] || '')}</textarea></div>`;
  }
  html += `<button class="detail-earn${earned ? ' earned' : ''}" type="button" data-name="${esc(trophy.name)}">${earned ? '✓ Earned — click to unmark' : 'Mark as earned'}</button>`;
  detailEl.innerHTML = html;
  detailEl.hidden = false;
}

// The next trophy on the roadmap: lowest stage first, then official order,
// skipping earned ones. A masked story trophy is named only as hidden.
export function nextUp(trophies, ledger) {
  const ordered = [...trophies].sort((a, b) => (a.stage - b.stage) || (a.id - b.id));
  return ordered.find((trophy) => !isEarned(ledger, trophy.name)) || null;
}

export function renderRoadmap(viewEl, trophies, ledger) {
  const next = nextUp(trophies, ledger);
  let html = '<h2 class="view-head">Roadmap to the platinum</h2>'
    + '<p class="view-intro">About <strong>200 hours</strong> and difficulty <strong>4/10</strong> (PowerPyx), one playthrough, no mission replay after the story — but free-roam continues and nothing on the 100% checklist is missable. Work the stages in order; the Next up box always points at the next trophy in line.</p>';
  if (next) {
    html += '<div class="next-up"><h3>Next up</h3>'
      + `<p class="next-name">${esc(displayName(next, ledger))}</p>`
      + `<p>${chip(next)} Stage ${next.stage} &middot; ${esc(displayDescription(next, ledger))}</p></div>`;
  } else {
    html += '<div class="next-up"><h3>Next up</h3><p class="next-name">Platinum earned</p><p>Vice Got a Price! is yours — every trophy is done.</p></div>';
  }
  for (const stageNo of [1, 2, 3]) {
    const stage = STAGES[stageNo];
    const members = trophies.filter((t) => t.stage === stageNo);
    const done = members.filter((t) => isEarned(ledger, t.name)).length;
    html += `<section class="stage"><h3>Stage ${stageNo} — ${esc(stage.title.replace(/^Stage \d+ — /, ''))} (${esc(stage.time)})</h3>`
      + `<p>${esc(stage.blurb)} ${done} of ${members.length} earned.</p>`;
    for (const trophy of members) {
      const earned = isEarned(ledger, trophy.name);
      html += `<div class="mini-row${earned ? ' done' : ''}" data-name="${esc(trophy.name)}" tabindex="0">`
        + `<span aria-hidden="true">${earned ? '☑' : '☐'}</span>`
        + `<span class="mini-name">${esc(displayName(trophy, ledger))}</span>${chip(trophy)}</div>`;
    }
    html += '</section>';
  }
  viewEl.innerHTML = html;
}

// The missables page: one trophy to watch, and the reassurance that the rest
// of the list is safe. Built from PowerPyx, which flags exactly one trophy.
export function renderMissables(viewEl, trophies, ledger) {
  const flagged = trophies.filter((t) => t.missable);
  let html = '<h2 class="view-head">Missable trophies: 1 to watch</h2>'
    + '<p class="view-intro">PowerPyx flags <strong>one</strong> trophy as potentially missable, and no other. Everything else is safe: there is no mission replay, but free-roam continues after the story, every trophy-related quest giver is still there, and nothing on the 100% checklist can be missed.</p>';
  for (const trophy of flagged) {
    html += '<section class="missable-card"><div class="warn"><strong>Potentially missable.</strong> Do the Chapter 1 meditation before Chapter 1 ends — after that, the spot at Jason\u2019s house is gone for good, and it is still unconfirmed whether the trophy needs it.</div>'
      + `<h3>${esc(displayName(trophy, ledger))}</h3>`
      + `<p class="row-desc">${esc(trophy.description)}</p>`
      + `<div class="row-meta">${chip(trophy)}${kindTag(trophy)}</div>`
      + `<div class="detail-guide"><p>${esc(trophy.guide)}</p></div>`
      + '<span class="src-label">Sources</span><ul class="src-list">';
    for (const source of trophy.sources) {
      html += `<li><a href="${esc(source.url)}" target="_blank" rel="noopener">${esc(source.label)}</a></li>`;
    }
    html += '</ul></section>';
  }
  html += '<section class="missable-card"><h3>Why nothing else is flagged</h3>'
    + '<p class="detail-guide">Story trophies pop as you finish chapters and missions, and missions cannot be failed out of the list. Optional questlines for Andy, Kenton, Billy, Randy, Tyrone and Bret all stay available after the story, and a quest giver who goes quiet mid-story comes back later. Cheats are the real trap: PowerPyx and GTABase both say cheats disable trophies and saving, so leave them off for a trophy run.</p></section>';
  viewEl.innerHTML = html;
}

// The sources page: what each source is used for, and how the guide was built.
export function renderSources(viewEl) {
  viewEl.innerHTML = '<h2 class="view-head">Sources</h2>'
    + '<p class="view-intro">Every guide in this ledger is written in our own words. A source is cited, never copied: the official names and descriptions are shown as PlayStation publishes them, and the walkthrough facts name where they came from.</p>'
    + '<section class="source-card"><h3>PowerPyx — GTA 6 Trophy Guide &amp; Roadmap</h3>'
    + '<p>Walkthrough facts, roadmap times and the missable flag: the 200-hour estimate, the 4/10 difficulty, the three roadmap steps, the Chapter 1 meditation warning, and the per-trophy methods (counts, locations, questlines).</p>'
    + '<p><a href="https://www.powerpyx.com/gta-6-grand-theft-auto-vi-trophy-guide-roadmap/" target="_blank" rel="noopener">powerpyx.com — GTA 6 Trophy Guide &amp; Roadmap</a></p></section>'
    + '<section class="source-card"><h3>Exophase — GTA VI trophy list</h3>'
    + '<p>The official list: every trophy\u2019s name, description and grade, as Exophase publishes it.</p>'
    + '<p><a href="https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/" target="_blank" rel="noopener">exophase.com — GTA VI trophies</a></p></section>'
    + '<section class="source-card"><h3>PSNProfiles — GTA VI trophies</h3>'
    + '<p>The counts PlayStation tracks for trophies that have one (42 shooting range challenges, 250 stunts, 18 meditation spots, 500 profile actions, and the rest), as PSNProfiles lists them.</p>'
    + '<p><a href="https://psnprofiles.com/trophies/43531-grand-theft-auto-vi" target="_blank" rel="noopener">psnprofiles.com — GTA VI trophies</a></p></section>'
    + '<section class="source-card"><h3>How this guide was built</h3>'
    + '<p>Names, descriptions and grades come from the official list frozen on 18 November 2026, on which Exophase and PSNProfiles agree. Walkthrough facts were re-checked against PowerPyx\u2019s live guide on 20 November 2026 and paraphrased here, never copied. One trophy, Bad Luck, I Guess, is still unconfirmed by every source we checked, and its guide says so instead of guessing. No Rockstar artwork or logo appears anywhere in this guide; the look is our own.</p></section>';
}

// Header progress: big count, bar width, and the per-grade line.
export function updateProgress(trophies, ledger) {
  const earned = trophies.filter((t) => isEarned(ledger, t.name)).length;
  const countEl = document.getElementById('earnedCount');
  const fillEl = document.getElementById('progressFill');
  const barEl = document.getElementById('progressBar');
  const lineEl = document.getElementById('gradeLine');
  if (countEl) countEl.textContent = String(earned);
  if (fillEl) fillEl.style.width = `${Math.round((earned / trophies.length) * 100)}%`;
  if (barEl) barEl.setAttribute('aria-valuenow', String(earned));
  if (lineEl) {
    const counts = gradeCounts(trophies, ledger);
    const label = (grade) => `${GRADE_LABEL[grade]} ${counts[grade][0]}/${counts[grade][1]}`;
    lineEl.textContent = ['platinum', 'gold', 'silver', 'bronze'].map(label).join(' · ');
  }
}
