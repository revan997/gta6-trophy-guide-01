// The platinum roadmap: three stages built from the official descriptions,
// and the Next-up planner that picks what to do next from what is earned.
//
// Stage 1 is the story (Chapters 1-5). Stage 2 is the 100% completion
// checklist that opens after the story. Stage 3 is everything left over.

import { isEarned } from './progress.js';

export const STAGES = [
  {
    number: 1,
    title: 'Play the story',
    hours: '60–80 hours',
    blurb:
      'Finish Chapters 1 to 5 and enjoy the game. There are no mission gold medals and no mission replay, so keep a manual save at the start and end of each chapter. Scan vehicles and study animals as you go — the 100% checklist is not visible yet, but progress already counts. Do the one thing that cannot wait: the Chapter 1 meditation at Jason’s house (see Missables).',
    trophyFilter: (trophy) => trophy.stage === 1,
  },
  {
    number: 2,
    title: 'Clear the 100% checklist',
    hours: 'about 100 hours',
    blurb:
      'After the final mission, the checklist appears under Progress, then Stats, then 100% Completion. It is forgiving — closer to 60% true completion — and you only need any 70 of the 80 challenges. The parts that demand everything are the robberies, underwater discoveries, shooting ranges, drone races and Bret’s quests. This stage earns the gold A Long Road and most of the silvers.',
    trophyFilter: (trophy) => trophy.stage === 2,
  },
  {
    number: 3,
    title: 'Mop up and take the platinum',
    hours: 'about 10 hours',
    blurb:
      'Finish the stranger strands and the named questlines, then the odd jobs: partner crimes, easter eggs, money and garages. Every quest-giver tied to a trophy is still around in free-roam after the story. When the last trophy pops, Vice Got a Price! follows on its own.',
    trophyFilter: (trophy) => trophy.stage === 3,
  },
];

export function stageTrophies(stage, trophies) {
  return trophies.filter(stage.trophyFilter);
}

export function stageProgress(state, stage, trophies) {
  const list = stageTrophies(stage, trophies);
  const earned = list.filter((trophy) => isEarned(state, trophy.id)).length;
  return { total: list.length, earned };
}

// The planner: the missable trophy first while it can still be done,
// then the earliest stage with anything left, then the lowest id in it.
export function nextUp(state, trophies) {
  const unearned = trophies.filter((trophy) => !isEarned(state, trophy.id));
  if (unearned.length === 0) return [];
  const missable = unearned.find((trophy) => trophy.missable);
  const ordered = [...unearned].sort((a, b) => {
    if (a.stage !== b.stage) return a.stage - b.stage;
    return a.id - b.id;
  });
  const picks = [];
  if (missable) {
    picks.push({ trophy: missable, reason: 'Do this first — its first meditation only happens in Chapter 1.' });
  }
  for (const trophy of ordered) {
    if (picks.length >= 5) break;
    if (missable && trophy.id === missable.id) continue;
    picks.push({ trophy, reason: plannerReason(trophy) });
  }
  return picks;
}

export function plannerReason(trophy) {
  if (trophy.stage === 1) return 'Stage 1 — part of the story, do it as you play.';
  if (trophy.stage === 2) return 'Stage 2 — part of the 100% checklist cleanup.';
  if (trophy.kind === 'side') return 'Stage 3 — a named questline, still available after the story.';
  if (trophy.kind === 'money') return 'Stage 3 — earns or spends money; robberies pay for it.';
  if (trophy.unconfirmed) return 'Stage 3 — method still unconfirmed, check the guide before chasing it.';
  return 'Stage 3 — cleanup, quick once the checklist is done.';
}
