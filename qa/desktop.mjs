/**
 * Vérifie l'application de bureau réellement lancée (Electron),
 * pas seulement le build : fenêtre, données locales, navigation.
 */
import { _electron as electron } from 'playwright';

const errors = [];
let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) { pass += 1; console.log(`OK   ${name}`); }
  else { fail += 1; console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`); }
};

const app = await electron.launch({
  args: ['.', '--no-sandbox', '--disable-gpu'],
  executablePath: './node_modules/electron/dist/electron',
  env: { ...process.env, DISPLAY: process.env.DISPLAY ?? ':99' },
});

const page = await app.firstWindow({ timeout: 60000 });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.waitForLoadState('networkidle');
await page.waitForTimeout(3000);

const url = page.url();
check('La fenêtre charge le serveur local', url.startsWith('http://127.0.0.1:'), url);

const title = await page.title();
check('Titre de la fenêtre', title.includes('minion'), title);

// Le pont de préchargement est bien exposé, sans API Node
const bridge = await page.evaluate(() => ({
  isDesktop: window.minionDesktop?.isDesktop === true,
  noRequire: typeof window.require === 'undefined',
  noProcess: typeof window.process === 'undefined',
}));
check('Indicateur « application de bureau » exposé', bridge.isDesktop);
check('Aucune API Node accessible depuis la page', bridge.noRequire && bridge.noProcess);

// Premier lancement : bienvenue puis données de démonstration
if (await page.getByRole('dialog').count()) {
  await page.getByRole('button', { name: 'Commencer' }).click();
  await page.waitForTimeout(800);
}
let body = await page.textContent('body');
check('Données de démonstration chargées', body.includes('Droit constitutionnel'));

// IndexedDB fonctionne réellement (c'est tout l'enjeu du serveur local)
const dbCheck = await page.evaluate(async () => {
  const dbs = await indexedDB.databases();
  return dbs.map((d) => d.name);
});
check('Base IndexedDB créée', dbCheck.includes('minion-com'), dbCheck.join(', '));

// Navigation interne
await page.goto(url.replace(/\/$/, '') + '/calendrier');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1500);
body = await page.textContent('body');
check('Navigation vers le calendrier', body.includes('Calendrier') && body.includes('Semaine'));

// Persistance : les données survivent à un rechargement
await page.goto(url);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000);
body = await page.textContent('body');
check('Données persistées après rechargement', body.includes('Droit constitutionnel'));

await page.screenshot({ path: '/tmp/desktop-window.png' });

await app.close();
console.log('\n--- ERREURS CONSOLE ---');
console.log(errors.length ? errors.join('\n') : '(aucune)');
console.log(`\n${pass}/${pass + fail} vérifications OK`);
process.exit(fail || errors.length ? 1 : 0);
