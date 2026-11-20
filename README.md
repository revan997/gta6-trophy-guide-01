# Leonida Ledger — GTA VI Trophy Guide & Tracker

[![make.fun](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/revan997/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/revan997/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

An offline guide and tracker for all **55 PlayStation 5 trophies** of Grand
Theft Auto VI, built for make.fun competition `gta6-trophy-guide-01`
($250, top 50 pay). It is a plain static web app: open `app/index.html`
in a browser and it works with the network off.

## What it does

- **Checklist of all 55 trophies** — every official name, description and
  grade (1 platinum, 2 gold, 6 silver, 46 bronze), with a checkbox per
  trophy. Progress is saved in the browser (localStorage) and can be
  exported to a JSON file and imported back.
- **A guide for every trophy, in our own words, with cited sources** —
  each guide names 2–3 sources (PowerPyx, Exophase, PSNProfiles,
  Push Square, KeenGamer, GTASpotter). Where a trophy's method is not
  pinned down yet, the guide says so plainly instead of guessing:
  `Bad Luck, I Guess` (method unknown), `Fair Game` (exact animal
  unconfirmed), `Positive Mental Attitude` (whether the Chapter 1
  meditation is required is unconfirmed).
- **Filters** — by kind (story, side quests, collectibles, activities,
  heists, combat, exploration, money, milestones), by grade, by search
  text, and hide-earned. Personal notes per trophy, saved in the browser.
- **Spoiler-safe mode** — hides the names, descriptions and guides of
  story trophies until they are earned.
- **Roadmap to the platinum** — three stages built from the official
  descriptions: play the story (~60–80 h), clear the 100% checklist
  (~100 h), mop up (~10 h). PowerPyx puts the whole run at about
  200 hours, difficulty 4/10, one playthrough, no online trophies.
- **Missables** — only one trophy can be missed, `Positive Mental
  Attitude`, and only its first meditation (Chapter 1, Jason's house).
  The page also warns about cheats disabling trophies, no mission
  replay, and the permanent Irredeemable profile.
- **Next up planner** — given what you have earned, the next five
  trophies to chase, missable first.

## What it is not

No Rockstar Games logo, artwork, box art or game screenshots — the look
is our own. No network requests at run time: the app fetches only its
own `data/trophies.json`. Trophy names and descriptions are shown as
PlayStation publishes them; everything else is our own writing.

## Run it

```sh
node serve.ts            # serves app/ at http://localhost:8080
```

## Test it

```sh
node functest.mjs        # 21 functional tests, headless Chromium
node shots.mjs           # takes screenshots/1-cover.jpg … 4-sources.jpg
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and
`screenshots/` to the output directory and writes `dossier.json` with
the kit's vendored `vendor/makefun-frontend.ts`. It refuses to run
unless `trophies.json` holds 55 trophies with a guide each and
`screenshots/` holds 3–4 images, and it writes identical bytes on
every run.

## Files

- `app/index.html` — the page shell
- `app/css/ledger.css` — the ledger look (dark green, parchment, gold)
- `app/js/boot.js` — startup and wiring
- `app/js/progress.js` — saved progress, export/import
- `app/js/filters.js` — kind/grade/search filters and the spoiler rule
- `app/js/roadmap.js` — the three stages and the Next-up planner
- `app/js/views.js` — DOM rendering
- `app/data/trophies.json` — the 55 trophies with guides and sources
- `functest.mjs`, `shots.mjs`, `shots.json` — tests and screenshots
- `main.ts`, `serve.ts` — hand-in program and local server
- `vendor/makefun-frontend.ts` — the kit's library, unchanged

## License

MIT — see `LICENSE`.
