// Leonida Ledger — entry program for gta6-trophy-guide-01 (Node 22, standard library only).
//
// The guide is plain static files in app/ (index.html, style.css, app.js, views.js,
// store.js and data/trophies.json) that open in a desktop browser and work with the
// network off. This program hands it in: it copies app/ and screenshots/ from beside
// this file to /output and writes /output/dossier.json with the kit's vendored
// make.fun library, which the scorer rebuilds byte for byte. vendor/makefun-frontend.ts
// is the kit's copy, unchanged.
//
// Run it twice and both runs must write identical bytes:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Start from a clean output directory so a stale file can never ride along.
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): text_max_bytes shapes the dossier text;
// the others refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files and directories in app/ or 48 MiB of app files).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
