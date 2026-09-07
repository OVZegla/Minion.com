/**
 * Vérifie l'outil de diagnostic d'entreprise : saisie PESTEL et interne,
 * report automatique dans la matrice SWOT, enregistrement et impression.
 */
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE || 'http://localhost:3200';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const errors = [];
let pass = 0, fail = 0;
const check = (n, ok, d = '') => { if (ok) { pass++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n + (d ? ' — ' + d : '')); } };

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 1360, height: 950 }, locale: 'fr-FR' });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 80)));
const goto = async (p) => { await page.goto(BASE + p, { waitUntil: 'networkidle' }); await page.waitForTimeout(700); };

await goto('/');
if (await page.getByRole('dialog').count()) {
  await page.getByRole('button', { name: 'Commencer' }).click();
  await page.waitForTimeout(700);
}

/* ---------- Accès ---------- */
check('Les diagnostics sont dans le menu', (await page.locator('a[href="/swot"]').count()) > 0);
await page.locator('a[href="/swot"]').first().click();
await page.waitForTimeout(1200);
check('La page des diagnostics s’ouvre', page.url().includes('/swot'));

const corps = await page.textContent('body');
check('Le diagnostic de démonstration est là', corps.includes('Ateliers Berthier'), corps.slice(0, 120));
check('La démonstration est annoncée comme fictive', corps.includes('fictive'));

/* ---------- Création ---------- */
await page.getByRole('button', { name: 'Nouveau diagnostic' }).first().click();
await page.waitForTimeout(500);
await page.locator('#swot-company').fill('SARL Test QA');
await page.getByRole('button', { name: 'Créer', exact: true }).click();
await page.waitForTimeout(1500);
check('Un diagnostic peut être créé', /\/swot\/swt_/.test(page.url()), page.url());
const swotUrl = page.url();

/* ---------- Les trois vues ---------- */
check('Vue PESTEL disponible', (await page.getByRole('tab', { name: /PESTEL/ }).count()) > 0);
const bodyPestel = await page.textContent('body');
for (const dimension of ['Politique', 'Économique', 'Socioculturel', 'Technologique', 'Écologique', 'Légal']) {
  check(`Dimension PESTEL : ${dimension}`, bodyPestel.includes(dimension));
}

/* ---------- Une opportunité et une menace ---------- */
const ajouterDans = async (titreSection, texte, defavorable) => {
  const section = page.locator('section').filter({ hasText: titreSection }).first();
  await section.getByRole('button', { name: 'Ajouter un constat' }).click();
  await page.waitForTimeout(350);
  const champ = section.locator('input[aria-label^="Constat"]').last();
  if (defavorable) {
    await section.getByRole('button', { name: /^Menace|^Faiblesse/ }).last().click();
    await page.waitForTimeout(250);
  }
  await champ.fill(texte);
  await page.waitForTimeout(300);
};

await ajouterDans('Économique', 'Marché porteur', false);
await ajouterDans('Légal', 'Nouvelle norme contraignante', true);

await page.getByRole('tab', { name: 'Diagnostic interne' }).click();
await page.waitForTimeout(600);
const bodyInterne = await page.textContent('body');
for (const domaine of ['Ressources humaines', 'Finances', 'Commercial et marketing', 'Organisation', 'Production et technique', 'Image et réputation']) {
  check(`Domaine interne : ${domaine}`, bodyInterne.includes(domaine));
}
await ajouterDans('Ressources humaines', 'Equipe experimentee', false);
await ajouterDans('Finances', 'Tresorerie tendue', true);

/* ---------- La matrice se remplit toute seule ---------- */
await page.getByRole('tab', { name: 'Matrice SWOT' }).click();
await page.waitForTimeout(800);

const quadrant = async (nom) => {
  const section = page.locator('section').filter({ hasText: nom }).first();
  return (await section.textContent()) || '';
};
check('Opportunité reportée depuis le PESTEL', (await quadrant('Opportunités')).includes('Marché porteur'));
check('Menace reportée depuis le PESTEL', (await quadrant('Menaces')).includes('Nouvelle norme contraignante'));
check('Force reportée du diagnostic interne', (await quadrant('Forces')).includes('Equipe experimentee'));
check('Faiblesse reportée du diagnostic interne', (await quadrant('Faiblesses')).includes('Tresorerie tendue'));

const matrice = await page.textContent('body');
check('La matrice rappelle d’où viennent les constats', matrice.includes('Environnement (PESTEL)') && matrice.includes('Diagnostic interne'));

/* ---------- Enregistrement ---------- */
await page.waitForTimeout(1600);
const enBase = await page.evaluate(async (url) => {
  const id = url.split('/').pop();
  const open = indexedDB.open('minion-com');
  const db = await new Promise((res, rej) => { open.onsuccess = () => res(open.result); open.onerror = () => rej(open.error); });
  const row = await new Promise((res, rej) => {
    const tx = db.transaction('swots', 'readonly');
    const req = tx.objectStore('swots').get(id);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  return {
    total: row.items.length,
    opportunites: row.items.filter((i) => i.side === 'externe' && i.polarity === 'favorable').length,
    menaces: row.items.filter((i) => i.side === 'externe' && i.polarity === 'defavorable').length,
    forces: row.items.filter((i) => i.side === 'interne' && i.polarity === 'favorable').length,
    faiblesses: row.items.filter((i) => i.side === 'interne' && i.polarity === 'defavorable').length,
  };
}, swotUrl);
check('Les quatre constats sont enregistrés', enBase.total === 4, JSON.stringify(enBase));
check('Répartition correcte en base', enBase.opportunites === 1 && enBase.menaces === 1 && enBase.forces === 1 && enBase.faiblesses === 1, JSON.stringify(enBase));

/* ---------- Rechargement ---------- */
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.getByRole('tab', { name: 'Matrice SWOT' }).click();
await page.waitForTimeout(700);
check('Les constats survivent au rechargement', (await quadrant('Opportunités')).includes('Marché porteur'));

/* ---------- Export PDF et impression ---------- */
check('Le diagnostic peut être exporté en PDF', (await page.getByRole('button', { name: 'Exporter en PDF' }).count()) > 0);
await page.emulateMedia({ media: 'print' });
await page.waitForTimeout(500);
const imprime = await page.textContent('body');
check('L’impression reprend l’analyse PESTEL', imprime.includes('Environnement — analyse PESTEL'));
check('L’impression reprend le diagnostic interne', imprime.includes('Diagnostic interne'));
check('L’impression reprend la matrice', imprime.includes('Matrice SWOT'));
const ongletsImprimes = await page.getByRole('tab', { name: 'Matrice SWOT' }).isVisible().catch(() => false);
check('Les onglets ne sont pas imprimés', !ongletsImprimes);
await page.emulateMedia({ media: 'screen' });

await browser.close();
console.log('\n--- ERREURS CONSOLE ---');
console.log(errors.length ? errors.join('\n') : '(aucune)');
console.log(`\n${pass} OK / ${fail} FAIL`);
process.exit(fail || errors.length ? 1 : 0);
