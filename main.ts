// Leonida Ledger — the hand-in program for gta6-trophy-guide-01.
// Node 22, standard library only. It copies this repository's app/ and
// screenshots/ into the output directory and writes /output/dossier.json
// with the kit's vendored make.fun library, exactly as the scorer rebuilds
// it. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The program writes the same bytes on every run: it copies files as they
// are and the dossier library is deterministic over them.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const appDir = join(here, 'app');
const shotsDir = join(here, 'screenshots');

// Fail loudly, before writing anything, when the entry is incomplete.
const trophyFile = join(appDir, 'data', 'trophies.json');
const trophyData = JSON.parse(readFileSync(trophyFile, 'utf8'));
if (!Array.isArray(trophyData.trophies) || trophyData.trophies.length !== 55) {
  throw new Error(`trophies.json must hold 55 trophies, found ${trophyData.trophies?.length ?? 0}`);
}
for (const trophy of trophyData.trophies) {
  if (!trophy.name || !trophy.guide || !String(trophy.guide).trim()) {
    throw new Error(`trophy ${JSON.stringify(trophy.name)} has no guide`);
  }
}
if (!existsSync(join(appDir, 'index.html'))) {
  throw new Error('app/index.html is missing');
}
const shots = existsSync(shotsDir) ? readdirSync(shotsDir).filter((name) => !name.startsWith('.')) : [];
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`screenshots/ must hold 3 or 4 images, found ${shots.length}`);
}

mkdirSync(out, { recursive: true });
cpSync(appDir, join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps: the dossier text cap shapes the bytes; the rest
// refuse an entry the scorer would refuse (too many or too large
// screenshots; too many files or bytes in app/).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);

console.log(`Leonida Ledger handed in: 55 trophies, ${shots.length} screenshots -> ${out}`);
