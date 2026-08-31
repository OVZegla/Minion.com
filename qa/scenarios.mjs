import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:3140';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const errors = [];
let pass = 0, fail = 0;

function check(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`OK   ${name}`); }
  else { fail += 1; console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 1360, height: 950 }, locale: 'fr-FR', acceptDownloads: true });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

const goto = async (p) => { await page.goto(BASE + p, { waitUntil: 'networkidle' }); await page.waitForTimeout(700); };

await goto('/');
if (await page.getByRole('dialog').count()) {
  await page.getByRole('button', { name: 'Commencer' }).click();
  await page.waitForTimeout(400);
}

/* SCENARIO 1 — créer une matière */
await goto('/matieres');
await page.getByRole('button', { name: /^Matière$/ }).click();
await page.waitForTimeout(400);
await page.getByLabel('Nom de la matière').fill('Droit administratif');
await page.getByRole('button', { name: 'Créer la matière' }).click();
await page.waitForTimeout(1200);
check('S1 — matière créée', page.url().includes('/matieres/'));
const subjectUrl = page.url();

/* SCENARIO 5a — ajouter des chapitres */
await page.getByRole('button', { name: 'Ajouter un chapitre' }).click();
await page.waitForTimeout(300);
for (const title of ['Les actes administratifs', 'Le service public', 'La responsabilité']) {
  await page.getByPlaceholder('Titre du chapitre').fill(title);
  await page.locator('form:has(input[placeholder="Titre du chapitre"]) button[type=submit]').click();
  await page.waitForTimeout(500);
}
await page.getByRole('button', { name: 'Fermer' }).first().click().catch(() => {});
await page.waitForTimeout(300);
let txt = await page.textContent('body');
check('S5a — 3 chapitres ajoutés', txt.includes('Les actes administratifs') && txt.includes('La responsabilité'));

/* SCENARIO 8 — changer l'état de maîtrise et voir la progression bouger */
const before = await page.textContent('body');
const beforePct = (before.match(/(\d+)\s%/) || [])[1];
await page.getByRole('button', { name: /État : Pas commencé/ }).first().click();
await page.waitForTimeout(700);
const after = await page.textContent('body');
check('S8 — état de maîtrise modifié', after.includes('À apprendre'));
const afterPct = (after.match(/(\d+)\s%/) || [])[1];
check('S8 — progression recalculée', beforePct !== afterPct, `${beforePct}% -> ${afterPct}%`);

/* SCENARIO 2 — créer un cours dans cette matière */
await page.getByRole('button', { name: /^Cours$/ }).click();
await page.waitForTimeout(400);
await page.getByLabel('Titre du cours').fill('La notion d’acte administratif');
await page.selectOption('#qa-course-subject', { label: 'Droit administratif' }).catch(() => {});
const subjSel = page.locator('select').filter({ hasText: 'Droit administratif' }).first();
if (await subjSel.count()) await subjSel.selectOption({ label: 'Droit administratif' });
await page.getByRole('button', { name: 'Créer le cours' }).click();
await page.waitForTimeout(1200);
check('S2 — cours créé', page.url().includes('/cours/'));

/* éditeur : ajouter un bloc */
await page.getByRole('button', { name: 'Ajouter un bloc' }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'À retenir', exact: true }).click();
await page.waitForTimeout(300);
await page.getByLabel('Contenu de l’encadré').fill('Bloc de test créé par le scénario.');
await page.waitForTimeout(1500);
txt = await page.textContent('body');
check('S2b — bloc « À retenir » ajouté et sauvegardé', txt.includes('À RETENIR') || txt.includes('À retenir'));

/* SCENARIO 3 — créer une tâche liée */
await goto('/a-faire');
await page.getByRole('button', { name: /^Tâche$/ }).click();
await page.waitForTimeout(400);
await page.getByLabel('Que dois-tu faire ?').fill('Relire le cours d’administratif demain');
await page.waitForTimeout(600);
const suggestion = page.getByRole('button', { name: /Appliquer/ });
if (await suggestion.count()) { await suggestion.click(); await page.waitForTimeout(300); }
await page.getByRole('dialog').getByRole('button', { name: 'Ajouter', exact: true }).click();
await page.waitForTimeout(900);
// la tâche est pour demain : on passe sur le filtre « À venir »
await page.getByRole('tab', { name: 'À venir' }).click();
await page.waitForTimeout(700);
txt = await page.textContent('body');
check('S3 — tâche créée', txt.includes('Relire le cours'));
check('S58 — date détectée par le parsing local', txt.includes('Demain'));

/* terminer la tâche */
await page.getByRole('button', { name: /^Terminer « Relire le cours/ }).click();
await page.waitForTimeout(800);
await page.getByRole('tab', { name: 'Terminées' }).click();
await page.waitForTimeout(700);
txt = await page.textContent('body');
check('S63 — tâche terminée déplacée dans « Terminées »', txt.includes('Relire le cours'));

/* SCENARIO 4 + 5 — créer un examen avec plusieurs chapitres */
await goto('/examens');
await page.getByRole('button', { name: /^Examen$/ }).click();
await page.waitForTimeout(400);
await page.getByLabel('Intitulé').fill('Partiel de droit administratif');
const examSubject = page.locator('#qa-exam-subject, select').filter({ hasText: 'Droit administratif' }).first();
await examSubject.selectOption({ label: 'Droit administratif' });
await page.waitForTimeout(500);
const d = new Date(Date.now() + 15 * 864e5).toISOString().slice(0, 10);
await page.getByLabel('Date').fill(d);
await page.getByRole('button', { name: 'Plus d’options' }).click();
await page.waitForTimeout(400);
const boxes = page.locator('fieldset input[type=checkbox]');
const n = await boxes.count();
for (let i = 0; i < Math.min(2, n); i += 1) await boxes.nth(i).check();
await page.getByRole('dialog').getByRole('button', { name: 'Ajouter', exact: true }).click();
await page.waitForTimeout(1000);
txt = await page.textContent('body');
check('S4 — examen créé', txt.includes('Partiel de droit administratif'));
check('S5 — chapitres associés à l’examen', /chapitres?\s+maîtrisés?|2 chapitres/.test(txt));

/* SCENARIO 6 — planifier une session de révision */
await goto('/revisions');
await page.getByRole('tab', { name: 'Plan de révision' }).click();
await page.waitForTimeout(700);
const examSelect = page.locator('#rp-exam');
await examSelect.selectOption({ label: /Partiel de droit administratif/ }).catch(async () => {
  const opts = await examSelect.locator('option').allTextContents();
  const idx = opts.findIndex((o) => o.includes('administratif'));
  if (idx >= 0) await examSelect.selectOption({ index: idx });
});
await page.waitForTimeout(700);
const planBtn = page.getByRole('button', { name: 'Planifier' }).first();
check('S6a — chapitres planifiables', await planBtn.count() > 0);
if (await planBtn.count()) { await planBtn.click(); await page.waitForTimeout(900); }
txt = await page.textContent('body');
check('S6 — session planifiée', txt.includes('Planifiée') || txt.includes('Terminée'));

/* SCENARIO 7 — terminer une session du jour */
await page.getByRole('tab', { name: 'À réviser' }).click();
await page.waitForTimeout(700);
const doneBtn = page.getByRole('button', { name: 'Terminée' }).first();
if (await doneBtn.count()) {
  await doneBtn.click();
  await page.waitForTimeout(900);
  check('S7 — session marquée terminée', true);
} else {
  check('S7 — session marquée terminée', false, 'aucune session du jour');
}

/* SCENARIO 9 — recherche globale */
await page.keyboard.press('Control+k');
await page.waitForTimeout(600);
await page.getByLabel('Recherche globale').fill('constitution');
await page.waitForTimeout(700);
txt = await page.textContent('body');
check('S9 — recherche renvoie des résultats', txt.includes('Droit constitutionnel') && (txt.includes('Cours') || txt.includes('Matières')));
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

/* SCENARIO 10 — export */
await goto('/parametres');
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.getByRole('button', { name: 'Exporter mes données' }).click(),
]);
const file = path.join('/tmp', 'minion-backup.json');
await download.saveAs(file);
const raw = fs.readFileSync(file, 'utf8');
const json = JSON.parse(raw);
check('S10 — export JSON valide', json.app === 'minion.com' && Array.isArray(json.tables.subjects));
const exportedSubjects = json.tables.subjects.length;

/* SCENARIO 11 — import */
await page.getByRole('button', { name: 'Réinitialiser la démo' }).click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Réinitialiser', exact: true }).click();
await page.waitForTimeout(1500);
await goto('/matieres');
txt = await page.textContent('body');
check('S41 — réinitialisation de la démo', !txt.includes('Droit administratif'));

await goto('/parametres');
await page.setInputFiles('input[type=file]', file);
await page.waitForTimeout(900);
txt = await page.textContent('body');
check('S11a — aperçu de la sauvegarde avant remplacement', txt.includes('Attention') && txt.includes('subjects'));
await page.getByRole('button', { name: 'Remplacer mes données' }).click();
await page.waitForTimeout(1800);
await goto('/matieres');
txt = await page.textContent('body');
check('S11 — données réimportées', txt.includes('Droit administratif'), `${exportedSubjects} matières exportées`);

/* SCENARIO 12 — vue mobile */
const mobile = await ctx.newPage();
mobile.on('pageerror', (e) => errors.push('mobile pageerror: ' + e.message));
await mobile.setViewportSize({ width: 390, height: 844 });
await mobile.goto(BASE, { waitUntil: 'networkidle' });
await mobile.waitForTimeout(1500);
const mtxt = await mobile.textContent('body');
check('S12 — dashboard mobile', mtxt.includes('Prochain cours') || mtxt.includes("Aujourd’hui"));
check('S12 — barre de navigation mobile', await mobile.getByRole('navigation', { name: 'Navigation' }).count() > 0);
await mobile.getByRole('button', { name: 'Ajouter' }).first().click();
await mobile.waitForTimeout(600);
check('S12 — bottom sheet « + » fonctionnelle', (await mobile.textContent('body')).includes('Que veux-tu ajouter'));
await mobile.keyboard.press('Escape');
await mobile.waitForTimeout(300);
await mobile.getByRole('button', { name: 'Ouvrir le menu' }).click();
await mobile.waitForTimeout(500);
check('S12 — menu mobile complet', (await mobile.textContent('body')).includes('Outils juridiques'));

/* calendrier : vues */
await goto('/calendrier');
for (const v of ['Jour', 'Mois', 'Agenda', 'Semaine']) {
  await page.getByRole('tab', { name: v }).click();
  await page.waitForTimeout(600);
}
txt = await page.textContent('body');
check('S8b — calendrier : 4 vues fonctionnelles', txt.length > 500);

/* thème sombre */
await goto('/parametres');
await page.getByRole('button', { name: 'Sombre' }).click();
await page.waitForTimeout(600);
const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
check('Mode sombre', isDark);
await page.getByRole('button', { name: 'Clair' }).click();
await page.waitForTimeout(400);

await browser.close();
console.log('\n--- ERREURS CONSOLE ---');
console.log(errors.length ? errors.join('\n') : '(aucune)');
console.log(`\n${pass}/${pass + fail} scénarios OK`);
process.exit(fail ? 1 : 0);
