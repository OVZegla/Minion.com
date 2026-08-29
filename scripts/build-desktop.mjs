/**
 * Prépare le serveur autonome embarqué dans l'application de bureau.
 *
 * 1. « next build » en mode standalone   -> .next/standalone/server.js
 * 2. copie des fichiers statiques        -> desktop/app/.next/static
 * 3. copie des ressources publiques      -> desktop/app/public
 *
 * Le dossier desktop/app/ est ensuite embarqué tel quel par electron-builder.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'desktop', 'app');

function run(command, args) {
  execFileSync(command, args, {
    stdio: 'inherit',
    env: { ...process.env, DESKTOP_BUILD: '1' },
    cwd: root,
  });
}

function dirSize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? dirSize(full) : fs.statSync(full).size;
  }
  return total;
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.cpSync(from, to, { recursive: true });
}

console.log('→ Build Next.js (mode standalone)…');
run(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['next', 'build']);

const standalone = path.join(root, '.next', 'standalone');
if (!fs.existsSync(standalone)) {
  console.error('Le dossier .next/standalone est introuvable : le build a échoué.');
  process.exit(1);
}

console.log('→ Assemblage de desktop/app…');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

copyDir(standalone, outDir);
copyDir(path.join(root, '.next', 'static'), path.join(outDir, '.next', 'static'));
copyDir(path.join(root, 'public'), path.join(outDir, 'public'));

// Le service worker de la PWA n'a aucun intérêt dans l'application installée.
fs.rmSync(path.join(outDir, 'public', 'sw.js'), { force: true });

/*
 * Allègement du serveur embarqué.
 *
 * Next trace large : il emporte l'optimiseur d'images (sharp / libvips, et
 * seulement dans sa version Linux) et TypeScript, dont le serveur n'a aucun
 * besoin à l'exécution — l'application n'utilise pas next/image.
 */
const prunable = [
  'node_modules/@img',
  'node_modules/sharp',
  'node_modules/typescript',
  'node_modules/next/dist/compiled/@vercel/nft',
];

let removed = 0;
for (const relative of prunable) {
  const target = path.join(outDir, relative);
  if (!fs.existsSync(target)) continue;
  removed += dirSize(target);
  fs.rmSync(target, { recursive: true, force: true });
}

// Les cartes de sources ne servent qu'au débogage du framework.
let mapCount = 0;
const dropSourceMaps = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) dropSourceMaps(full);
    else if (entry.name.endsWith('.js.map') || entry.name.endsWith('.d.ts')) {
      removed += fs.statSync(full).size;
      fs.rmSync(full, { force: true });
      mapCount += 1;
    }
  }
};
dropSourceMaps(path.join(outDir, 'node_modules'));

console.log(
  `→ Allègement : ${Math.round(removed / 1024 / 1024)} Mo retirés (${mapCount} fichiers de débogage)`,
);

const serverEntry = path.join(outDir, 'server.js');
if (!fs.existsSync(serverEntry)) {
  console.error('server.js absent de desktop/app : assemblage incomplet.');
  process.exit(1);
}

console.log(`✓ desktop/app prêt (${Math.round(dirSize(outDir) / 1024 / 1024)} Mo)`);
