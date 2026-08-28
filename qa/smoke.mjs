import { chromium } from 'playwright';

const BASE = 'http://localhost:3120';
const errors = [];
const results = [];

function step(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fr-FR' });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// Onboarding welcome modal
const welcome = page.getByRole('dialog');
if (await welcome.count()) {
  await page.getByRole('button', { name: 'Commencer' }).click();
  await page.waitForTimeout(500);
  step('Écran de bienvenue affiché puis fermé', true);
} else {
  step('Écran de bienvenue affiché', false, 'non trouvé');
}

// Dashboard filled
const body = await page.textContent('body');
step('Dashboard rempli (matières visibles)', body.includes('Droit constitutionnel'));
step('Section Aujourd\'hui présente', body.includes("Aujourd’hui") || body.includes("Aujourd'hui"));
step('Section À faire présente', body.includes('À faire'));
step('Prochains examens présents', body.includes('Prochains examens'));
step('Cette semaine présente', body.includes('Cette semaine'));

// Navigate pages
const routes = ['/calendrier','/matieres','/cours','/a-faire','/revisions','/fiches','/examens','/sae','/documents','/methodes','/jurisprudence','/lexique','/a-classer','/focus','/resultats','/parametres','/mon-annee'];
for (const r of routes) {
  const res = await page.goto(BASE + r, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const txt = await page.textContent('body');
  step(`Page ${r}`, res.status() === 200 && txt.length > 200, `status ${res.status()}`);
}

await browser.close();
console.log('\n--- ERREURS CONSOLE ---');
console.log(errors.length ? errors.join('\n') : '(aucune)');
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} vérifications OK`);
process.exit(failed.length || errors.length ? 1 : 0);
