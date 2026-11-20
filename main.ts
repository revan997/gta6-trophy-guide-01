// Leonida Ledger — the hand-in program (Node 22, standard library only).
//
// The guide itself is plain static files: app/index.html, its ES modules,
// its stylesheet and its trophy data, all offline, with 3 or 4 screenshots
// of the real app in screenshots/. This program is the only moving part of
// the entry: it copies app/ and screenshots/ from beside this file into the
// output directory and writes /output/dossier.json with the vendored make.fun
// library, byte for byte the dossier the scorer rebuilds. It writes the same
// bytes on every run: no timestamps, no randomness, nothing ambient.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the guide locally with `node serve.ts` (http://localhost:8080).

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const appDir = join(repoDir, 'app');
const shotsDir = join(repoDir, 'screenshots');

// Fail loudly, before copying anything, if a part of the entry is missing.
// The dossier builder enforces the scorer's caps itself (at most 4 shots,
// 256 KiB each; app/ at most 993 entries and 48 MiB), so this only checks
// that the two input trees exist at all.
function requireTree(path: string, label: string): void {
  if (!existsSync(path)) throw new Error(`Leonida Ledger: missing ${label} at ${path}`);
}

function shotCount(path: string): number {
  return readdirSync(path).filter((name) => !name.startsWith('.')).length;
}

requireTree(appDir, 'app/');
requireTree(shotsDir, 'screenshots/');
const shots = shotCount(shotsDir);
if (shots < 3 || shots > 4) throw new Error(`Leonida Ledger: expected 3 or 4 screenshots, found ${shots}`);

mkdirSync(outDir, { recursive: true });
cpSync(appDir, join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
