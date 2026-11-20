// Filtering and the spoiler rule for the Leonida Ledger.
//
// Kinds are our own grouping of the 55 trophies. The spoiler rule hides a
// story trophy's name, description and guide until the reader has earned
// it — the grade and kind stay visible so the list keeps its shape.

import { isEarned } from './progress.js';

export const KINDS = [
  ['all', 'All kinds'],
  ['story', 'Story'],
  ['side', 'Side quests'],
  ['collectibles', 'Collectibles'],
  ['activities', 'Activities'],
  ['heists', 'Heists'],
  ['combat', 'Combat'],
  ['exploration', 'Exploration'],
  ['money', 'Money'],
  ['meta', 'Milestones'],
];

export const KIND_LABELS = Object.fromEntries(KINDS);

export const GRADES = ['platinum', 'gold', 'silver', 'bronze'];

// A story trophy is a spoiler while it is unearned and the reader asked
// for spoiler-safe browsing.
export function isSpoilerHidden(state, trophy) {
  return state.spoilers && trophy.kind === 'story' && !isEarned(state, trophy.id);
}

export function displayName(state, trophy) {
  return isSpoilerHidden(state, trophy) ? 'Hidden story trophy' : trophy.name;
}

export function displayDescription(state, trophy) {
  return isSpoilerHidden(state, trophy)
    ? 'Earn this trophy to reveal its name and description.'
    : trophy.description;
}

// The visible list: kind, grade, search text, and the hide-earned switch.
export function visibleTrophies(state, trophies) {
  const query = state.query.trim().toLowerCase();
  return trophies.filter((trophy) => {
    if (state.kind !== 'all' && trophy.kind !== state.kind) return false;
    if (state.grade !== 'all' && trophy.grade !== state.grade) return false;
    if (state.hideEarned && isEarned(state, trophy.id)) return false;
    if (query) {
      const haystack = `${trophy.name} ${trophy.description} ${trophy.guide}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function countByKind(trophies) {
  const counts = {};
  for (const trophy of trophies) {
    counts[trophy.kind] = (counts[trophy.kind] || 0) + 1;
  }
  return counts;
}
