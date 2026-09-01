import { chromium } from 'playwright';

const BASE = process.env.QA_BASE || 'http://localhost:3200';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let pass = 0, fail = 0;
const check = (n, ok, d = '') => { if (ok) { pass++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n + (d ? ' — ' + d : '')); } };

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 1360, height: 950 }, locale: 'fr-FR' });
const page = await ctx.newPage();
const goto = async (p) => { await page.goto(BASE + p, { waitUntil: 'networkidle' }); await page.waitForTimeout(600); };

await goto('/');
if (await page.getByRole('dialog').count()) {
  await page.getByRole('button', { name: 'Commencer' }).click();
  await page.waitForTimeout(600);
}

await goto('/cours');
await page.locator('a[href^="/cours/"]').first().click();
await page.waitForTimeout(900);
await page.locator('input[aria-label="Titre du cours"]').waitFor({ state: 'visible', timeout: 15000 });
const courseUrl = page.url();
console.log('cours:', courseUrl);

/* CAS A — on tape puis on quitte la page IMMEDIATEMENT (< delai de debounce) */
const marker = 'PREUVE-NAVIGATION-' + Date.now();
await page.locator('input[aria-label="Titre du cours"]').fill(marker);
await page.locator('a[href="/aujourdhui"], a[href="/"]').first().click();
await page.waitForTimeout(2500);
await page.goto(courseUrl, { waitUntil: 'networkidle' });
await page.locator('input[aria-label="Titre du cours"]').waitFor({ state: 'visible', timeout: 15000 });
await page.waitForTimeout(1200);
const titreA = await page.locator('input[aria-label="Titre du cours"]').inputValue();
check('A — titre conserve apres navigation immediate', titreA === marker, `attendu "${marker}", trouve "${titreA}"`);

/* CAS B — on tape puis on ferme/recharge l'onglet IMMEDIATEMENT */
const marker2 = 'PREUVE-FERMETURE-' + Date.now();
await page.locator('input[aria-label="Titre du cours"]').fill(marker2);
await page.reload({ waitUntil: 'networkidle' });
await page.locator('input[aria-label="Titre du cours"]').waitFor({ state: 'visible', timeout: 15000 });
await page.waitForTimeout(1200);
const titreB = await page.locator('input[aria-label="Titre du cours"]').inputValue();
check('B — titre conserve apres fermeture immediate', titreB === marker2, `attendu "${marker2}", trouve "${titreB}"`);

/* CAS C — on tape puis on attend (comportement normal) */
const marker3 = 'PREUVE-ATTENTE-' + Date.now();
await page.locator('input[aria-label="Titre du cours"]').fill(marker3);
await page.waitForTimeout(1800);
await page.reload({ waitUntil: 'networkidle' });
await page.locator('input[aria-label="Titre du cours"]').waitFor({ state: 'visible', timeout: 15000 });
await page.waitForTimeout(1200);
const titreC = await page.locator('input[aria-label="Titre du cours"]').inputValue();
check('C — titre conserve apres pause normale', titreC === marker3, `attendu "${marker3}", trouve "${titreC}"`);

/* CAS D — texte tape dans un bloc de cours, navigation immediate */
const marker4 = 'PREUVE-BLOC-' + Date.now();
const SEL_TEXTE = '[role=textbox][aria-label="Texte"]';
if (!(await page.locator(SEL_TEXTE).count())) {
  await page.getByRole('button', { name: 'Ajouter un bloc' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Texte', exact: true }).first().click();
  await page.waitForTimeout(1200);
}
const bloc = page.locator(SEL_TEXTE).first();
if (await bloc.count()) {
  await bloc.click();
  await page.keyboard.type(marker4);
  await page.locator('a[href="/aujourdhui"], a[href="/"]').first().click();
  await page.waitForTimeout(2500);
  await page.goto(courseUrl, { waitUntil: 'networkidle' });
  await page.locator('input[aria-label="Titre du cours"]').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(1200);
  const corps = await page.$$eval(SEL_TEXTE, (nodes) => nodes.map((n) => n.textContent).join(' '));
  check('D — notes du cours conservees apres navigation immediate', corps.includes(marker4), corps.slice(0, 80));
} else {
  check('D — bloc de notes introuvable', false);
}

/* CAS E — fiche de revision, navigation immediate */
await goto('/fiches');
await page.locator('a[href^="/fiches/"]').first().click();
await page.locator('input[aria-label="Titre de la fiche"]').waitFor({ state: 'visible', timeout: 15000 });
await page.waitForTimeout(600);
const ficheUrl = page.url();
const marker5 = 'PREUVE-FICHE-' + Date.now();
await page.locator('input[aria-label="Titre de la fiche"]').fill(marker5);
await page.locator('a[href="/aujourdhui"], a[href="/"]').first().click();
await page.waitForTimeout(2500);
await page.goto(ficheUrl, { waitUntil: 'networkidle' });
await page.locator('input[aria-label="Titre de la fiche"]').waitFor({ state: 'visible', timeout: 15000 });
await page.waitForTimeout(1200);
const titreE = await page.locator('input[aria-label="Titre de la fiche"]').inputValue();
check('E — titre de fiche conserve apres navigation immediate', titreE === marker5, `trouve "${titreE}"`);

await browser.close();
console.log(`\n${pass} OK / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
