# Leonida Ledger — GTA VI Trophy Guide & Tracker

An offline web app that guides and tracks all **55 PlayStation 5 trophies** of
Grand Theft Auto VI (1 platinum, 2 gold, 6 silver, 46 bronze): a checklist
with saved progress, a 3-stage roadmap to the platinum, the one missable
trophy flagged, and a cited guide for every trophy — all in our own words.

## What it does

- **Checklist** — every trophy with its official name, description and grade;
  tick to earn, progress saves in the browser (localStorage).
- **Filters** — by kind (story, missable, collectibles, activities, online),
  by grade, by search, and hide-earned.
- **Spoiler setting** — story trophies stay hidden ("Hidden story trophy")
  until earned.
- **Roadmap** — 3 stages (story, 100% checklist, cleanup) with a Next up
  planner that always points at the next trophy in line.
- **Missables** — the one trophy PowerPyx flags as potentially missable
  (Positive Mental Attitude: the Chapter 1 meditation), and why the rest are safe.
- **Detail pane** — click any trophy for its guide, its sources, a missable
  warning where it applies, and a personal note field.
- **Export / import** — download progress as JSON, import it back later.
- **Offline** — static files under `app/`, no build step, no network requests
  at run time. Every guide cites its sources (PowerPyx, Exophase,
  PSNProfiles); the one trophy nobody has confirmed yet (Bad Luck, I Guess)
  says so instead of guessing.

## Run it

```sh
node serve.ts        # serves app/ at http://localhost:8080
```

## Test it

```sh
node serve.ts &     # in one terminal
node functest.mjs   # 21 functional checks in headless Chrome over CDP
```

## Screenshots

```sh
node shots.mjs      # reads shots.json, writes 4 JPEGs to screenshots/
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/dossier.json
```

`main.ts` copies `app/` and `screenshots/` to the output directory and
builds the dossier with the vendored `vendor/makefun-frontend.ts`. It writes
the same bytes on every run.

## Layout

- `app/index.html` — the shell: hero progress, tabs, toolbar, detail pane.
- `app/style.css` — the whole look (Vice-sunset: deep plum, neon pink, teal).
- `app/js/main.js` — boot, hash routing, event wiring, export/import.
- `app/js/state.js` — the localStorage ledger and the export/import payloads.
- `app/js/render.js` — checklist, detail, roadmap, missables, sources, progress.
- `app/data/trophies.json` — the 55 trophies: official name, description and
  grade, plus kind, missable flag, roadmap stage, PSN target count, our guide
  and its sources.

## License

MIT. Unofficial and not affiliated with Rockstar Games; no Rockstar artwork
or logo appears anywhere in this guide.
