/**
 * Vérifie l'application de bureau réellement lancée (Electron) :
 * fenêtre, isolation, classement des documents sur le disque, réglages,
 * et surtout la persistance des données d'une session à l'autre.
 */
import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const EXECUTABLE = './node_modules/electron/dist/electron';
const ARGS = ['.', '--no-sandbox', '--disable-gpu'];
const errors = [];
let pass = 0;
let fail = 0;

const check = (name, ok, detail = '') => {
  if (ok) {
    pass += 1;
    console.log(`OK   ${name}`);
  } else {
    fail += 1;
    console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`);
  }
};

async function launch() {
  const app = await electron.launch({ args: ARGS, executablePath: EXECUTABLE });
  const page = await app.firstWindow({ timeout: 60000 });
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  if (await page.getByRole('dialog').count()) {
    await page.getByRole('button', { name: 'Commencer' }).click();
    await page.waitForTimeout(800);
  }
  return { app, page };
}

const ORIGIN = 'minion://app';
const go = async (page, route) => {
  await page.goto(`${ORIGIN}${route}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
};

/* ======================= Première session ======================= */

let { app, page } = await launch();

check('La fenêtre utilise une origine fixe', page.url().startsWith(ORIGIN), page.url());
check('Titre de la fenêtre', (await page.title()).includes('minion'));

const bridge = await page.evaluate(() => ({
  isDesktop: window.minionDesktop?.isDesktop === true,
  hasLibrary: typeof window.minionDesktop?.library?.save === 'function',
  noRequire: typeof window.require === 'undefined',
  noProcess: typeof window.process === 'undefined',
}));
check('Pont « application de bureau » exposé', bridge.isDesktop && bridge.hasLibrary);
check('Aucune API Node accessible depuis la page', bridge.noRequire && bridge.noProcess);

let body = await page.textContent('body');
check('Données de démonstration chargées', body.includes('Droit constitutionnel'));

// Accueil personnalisé et phrase d'encouragement au démarrage
check('Salutation au prénom', /Bon(jour|soir|ne nuit) Einat/.test(body), body.slice(0, 0));
const phrase = await page.evaluate(
  () => document.querySelector('[data-encouragement]')?.textContent ?? '',
);
check('Une phrase d’encouragement est affichée', phrase.trim().length > 20, phrase.slice(0, 60));

const databases = await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name));
check('Base IndexedDB créée', databases.includes('minion-com'), databases.join(', '));

await go(page, '/calendrier');
body = await page.textContent('body');
check('Navigation vers le calendrier', body.includes('Calendrier') && body.includes('Semaine'));

/* ----------- Classement automatique dans les dossiers ----------- */

const libraryConfig = await page.evaluate(() => window.minionDesktop.library.config());
const libraryRoot = libraryConfig.root;
check('Dossier de classement annoncé', Boolean(libraryRoot), libraryRoot);
fs.rmSync(libraryRoot, { recursive: true, force: true });

await go(page, '/parametres');
body = await page.textContent('body');
check('Réglages du classement présents', body.includes('Mes fichiers sur l’ordinateur'));
check('Dossier de destination affiché', body.includes(libraryRoot));
check('Règle de classement expliquée', body.includes('droit-des-affaires-chapitre1'));

await page.getByRole('button', { name: 'Tout reclasser' }).click();
await page.waitForTimeout(4000);

for (const relative of [
  'cours/droit-constit-chapitre2/CM03 — La Constitution.pdf',
  'cours/methodo-chapitre3/TD02 — Trame de fiche d’arrêt.pdf',
  'matieres/intro-droit/Plan de cours — Introduction générale au droit.pdf',
  'sae/methodo/SAÉ 1.02 — consignes.pdf',
]) {
  check(`Fichier rangé : ${relative}`, fs.existsSync(path.join(libraryRoot, ...relative.split('/'))));
}

const allFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else allFiles.push(full);
  }
};
if (fs.existsSync(libraryRoot)) walk(libraryRoot);
check('Aucun fichier créé pour un lien', !allFiles.some((f) => f.includes('Légifrance')));
check(
  'Les PDF écrits sont de vrais PDF',
  allFiles.every((f) => fs.readFileSync(f).subarray(0, 4).toString() === '%PDF'),
);

await go(page, '/documents');
body = await page.textContent('body');
check('Chemin local affiché dans Documents', body.includes('droit-constit-chapitre2'));

const dropped = path.join('/tmp', 'Notes de TD.pdf');
fs.writeFileSync(dropped, '%PDF-1.4\n% document de test\n');
await page.setInputFiles('input[type=file]', dropped);
await page.waitForTimeout(2500);
check(
  'Document déposé rangé immédiatement',
  fs.existsSync(path.join(libraryRoot, 'divers', 'Notes de TD.pdf')),
);

/* ------------- Bouton pour masquer le nom de l'app ------------- */

await go(page, '/parametres');
const nameToggle = page.getByRole('checkbox', { name: /Afficher le nom/ });
check('Réglage du nom présent', (await nameToggle.count()) > 0);

const sidebarShowsName = async () =>
  ((await page.locator('aside').first().textContent()) ?? '').includes('minion');

await nameToggle.click();
await page.waitForTimeout(1500);
check('Nom masqué dans la barre latérale', !(await sidebarShowsName()));

await nameToggle.click();
await page.waitForTimeout(1500);
check('Nom réaffiché quand on recoche', await sidebarShowsName());

/* ---------- Marqueur pour vérifier la persistance ---------- */

const MARKER = 'Repère de persistance';
await page.evaluate(async (title) => {
  const open = indexedDB.open('minion-com');
  const db = await new Promise((res, rej) => {
    open.onsuccess = () => res(open.result);
    open.onerror = () => rej(open.error);
  });
  await new Promise((res, rej) => {
    const tx = db.transaction('tasks', 'readwrite');
    tx.objectStore('tasks').put({
      id: 'tsk_persistance',
      title,
      subjectId: null,
      courseId: null,
      examId: null,
      saeId: null,
      type: 'perso',
      dueDate: null,
      dueTime: null,
      priority: 'normal',
      status: 'todo',
      subtasks: [],
      estimatedMinutes: null,
      completedAt: null,
      createdAt: '2026-01-01T08:00',
      updatedAt: '2026-01-01T08:00',
    });
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });
}, MARKER);
await page.waitForTimeout(800);

/* ---------- Saisie non terminée au moment de fermer la fenêtre ---------- */

const TYPED = 'Note tapee juste avant la fermeture';
await go(page, '/cours');
await page.locator('a[href^="/cours/"]').first().click();
await page.locator('input[aria-label="Titre du cours"]').waitFor({ state: 'visible', timeout: 20000 });
await page.waitForTimeout(800);
const typedRoute = new URL(page.url()).pathname;
await page.locator('input[aria-label="Titre du cours"]').fill(TYPED);
// On ferme tout de suite : le délai de sauvegarde n'a pas eu le temps de s'écouler.
await app.close();
await new Promise((resolve) => setTimeout(resolve, 2000));

/* ======================= Seconde session ======================= */

({ app, page } = await launch());

check('Origine identique après redémarrage', page.url().startsWith(ORIGIN), page.url());

await go(page, '/a-faire');
await page.getByRole('tab', { name: 'À venir' }).click();
await page.waitForTimeout(1200);
body = await page.textContent('body');
check('Les données survivent à la fermeture de l’application', body.includes(MARKER));

await go(page, typedRoute);
await page.locator('input[aria-label="Titre du cours"]').waitFor({ state: 'visible', timeout: 20000 });
await page.waitForTimeout(800);
const typedBack = await page.locator('input[aria-label="Titre du cours"]').inputValue();
check(
  'Une saisie non terminée est enregistrée à la fermeture de la fenêtre',
  typedBack === TYPED,
  `trouvé « ${typedBack} »`,
);

const secondSessionDocs = await page.evaluate(async () => {
  const open = indexedDB.open('minion-com');
  const db = await new Promise((res, rej) => {
    open.onsuccess = () => res(open.result);
    open.onerror = () => rej(open.error);
  });
  return new Promise((res) => {
    const q = db.transaction('documents', 'readonly').objectStore('documents').getAll();
    q.onsuccess = () => res(q.result.filter((d) => d.localPath).length);
  });
});
check('Les chemins de classement sont conservés', secondSessionDocs >= 4, `${secondSessionDocs} documents`);

await page.screenshot({ path: '/tmp/desktop-window.png' });
await app.close();

console.log('\n--- ERREURS CONSOLE ---');
console.log(errors.length ? errors.join('\n') : '(aucune)');
console.log(`\n${pass}/${pass + fail} vérifications OK`);
process.exit(fail || errors.length ? 1 : 0);
