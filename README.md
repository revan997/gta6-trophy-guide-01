[![gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/c/gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/revan997/gta6-trophy-guide-01/rank.svg)](https://make.fun/c/gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/revan997/gta6-trophy-guide-01/reward.svg)](https://make.fun/c/gta6-trophy-guide-01)

# Leonida Ledger — GTA 6 Trophy Guide & Tracker

An offline guide and tracker for all **55 PlayStation 5 trophies** of Grand Theft Auto VI
(1 platinum, 2 gold, 6 silver, 46 bronze, 28 hidden, 0 online). Built for
[make.fun's gta6-trophy-guide-01 competition](https://make.fun/c/gta6-trophy-guide-01).

Open `app/index.html` in a desktop browser — or serve `app/` with any static server —
and it works with the network off. No build step, no accounts, no tracking.

## What it does

- **Checklist** — every trophy with its official name, description and grade; tick
  one off and it stays ticked (saved in the browser). Export your progress to a file
  and import it back on any machine.
- **Filters** — by kind (story, side quests, collectibles, activities, robbery,
  exploration, combat, secrets, money & misc, 100% completion), by grade, and by
  free-text search. A “hide earned” switch clears the done ones out of the way.
- **Spoiler setting** — on by default: story trophies stay hidden (name, description
  and guide) until you earn them, or until you switch spoilers off.
- **Roadmap to the platinum** — three stages (story, 100% checklist, clean-up) with
  per-stage progress, the platinum in numbers (~200 hours, 4/10, 1 playthrough,
  no mission replay), and a “Next up” planner for your next session.
- **Missables** — the one trophy to watch (Positive Mental Attitude: Lucia's
  Chapter 1 balcony meditation) plus why nothing else can lock you out, and a
  save strategy for a game with no mission replay.
- **A cited guide to each trophy** — written in our own words from the sources
  listed on the Sources tab (PowerPyx, Exophase, PSNProfiles and others), with
  what to do, where and how, and when it can be missed. Where a trophy is not yet
  pinned down (Bad Luck, I Guess), the guide says so plainly instead of guessing.
- **Your notes** — add a note to any trophy; it is saved with your progress.

## Run it

```sh
node serve.ts        # serves app/ at http://localhost:8080
```

or open `app/index.html` directly. Everything the app loads is a file under `app/`.

## Files

- `app/index.html`, `app/style.css` — the page and its look
- `app/app.js` — boot and wiring; `app/views.js` — the four views; `app/store.js` — saved progress, export/import
- `app/data/trophies.json` — the 55 trophies with official names, descriptions, grades, guides, steps and sources
- `main.ts` — the entry program: copies `app/` and `screenshots/` to `/output` and writes `dossier.json`
- `screenshots/` — renders of the guide (see `shots.json` for how each was taken)
- `vendor/makefun-frontend.ts` — the kit's library, unchanged

## Sources

Trophy names, descriptions and grades are the official PlayStation 5 list as
Exophase and PSNProfiles published it on 18 November 2026. Methods, counts and
locations come from PowerPyx's GTA 6 trophy guide & roadmap (played from the
released game), cross-checked against Output Lag, GTA Zone, GTA Vibes, Leonida
Intel and ComingSoon. Full source list with links: the Sources tab in the app,
and `app/data/trophies.json`.

## License

MIT — see `LICENSE`. Unofficial fan guide, not affiliated with Rockstar Games,
Take-Two Interactive or PlayStation. No Rockstar logo or official artwork is used.
