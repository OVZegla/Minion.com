/**
 * Vérifie l'éditeur de cours dans un vrai navigateur :
 * la mise en forme du texte, et l'absence de saut de la page pendant la frappe.
 */
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE || 'http://localhost:3200';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const errors = [];
let pass = 0, fail = 0;
let phase = 'demarrage';
const check = (n, ok, d = '') => { if (ok) { pass++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n + (d ? ' — ' + d : '')); } };

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'fr-FR' });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push('[' + phase + '] ' + m.text()); });
page.on('pageerror', (e) => errors.push('[' + phase + '] pageerror: ' + e.message.slice(0, 60)));
const goto = async (p) => { await page.goto(BASE + p, { waitUntil: 'networkidle' }); await page.waitForTimeout(600); };

await goto('/');
if (await page.getByRole('dialog').count()) {
  await page.getByRole('button', { name: 'Commencer' }).click();
  await page.waitForTimeout(600);
}

await goto('/cours');
await page.locator('a[href^="/cours/"]').first().click();
await page.locator('input[aria-label="Titre du cours"]').waitFor({ state: 'visible', timeout: 20000 });
await page.waitForTimeout(800);
const courseUrl = page.url();

const addBlock = async (label) => {
  await page.getByRole('button', { name: 'Ajouter un bloc' }).click();
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: label, exact: true }).first().click();
  await page.waitForTimeout(700);
};

/* ---------- 1. La page ne remonte pas pendant la frappe ---------- */
phase = '1-remplissage';

// Scénario qui reproduisait le bug : une page longue, on descend dedans,
// et on tape. L'ancien éditeur remontait la vue de plus de 300 px dès la
// première frappe (mesuré : scrollY 1360 -> 1040).
for (let i = 0; i < 12; i += 1) {
  await addBlock('Texte');
  const zone = page.locator('[role=textbox][aria-label="Texte"]').last();
  await zone.click();
  await zone.type(`Bloc ${i + 1}. ` + 'remplissage '.repeat(30));
}
await page.waitForTimeout(1500);

const position = async () =>
  page.evaluate(() => {
    const boxes = document.querySelectorAll('[role=textbox][aria-label="Texte"]');
    const el = boxes[boxes.length - 1];
    return {
      top: Math.round(el.getBoundingClientRect().top),
      y: Math.round(window.scrollY),
      h: document.documentElement.scrollHeight,
    };
  });

const last = page.locator('[role=textbox][aria-label="Texte"]').last();
await last.click();
await page.waitForTimeout(500);

const start = await position();
check('La page est assez longue pour défiler', start.h > 1500, `${start.h}px`);
check('On édite bien loin dans la page', start.y > 600, `scrollY=${start.y}`);

phase = '1b-frappe'; await page.keyboard.type('encore du texte tapé plus bas dans la page ');
await page.waitForTimeout(500);
const afterTyping = await position();
check(
  'L’écran ne remonte pas pendant la frappe',
  Math.abs(afterTyping.y - start.y) <= 8,
  `scrollY ${start.y} -> ${afterTyping.y}`,
);
check(
  'Le texte édité ne bouge pas à l’écran',
  Math.abs(afterTyping.top - start.top) <= 8,
  `top ${start.top} -> ${afterTyping.top}`,
);

for (let i = 0; i < 40; i += 1) await page.keyboard.press('Backspace');
await page.waitForTimeout(500);
const afterDelete = await position();
check(
  'L’écran ne bouge pas non plus quand on efface',
  Math.abs(afterDelete.y - start.y) <= 8,
  `scrollY ${start.y} -> ${afterDelete.y}`,
);

await page.waitForTimeout(2000);
const afterSave = await position();
check(
  'L’écran ne bouge pas quand la sauvegarde se déclenche',
  Math.abs(afterSave.y - start.y) <= 8,
  `scrollY ${start.y} -> ${afterSave.y}`,
);

/* ---------- 2. Mise en forme ---------- */
phase = '2-mise-en-forme';

await addBlock('Texte');
const zone = page.locator('[role=textbox][aria-label="Texte"]').last();
await zone.click();
await page.keyboard.type('gras italique souligne couleur surligne taille police');
await page.waitForTimeout(300);

const selectWord = async (word) => {
  await page.evaluate((target) => {
    const boxes = [...document.querySelectorAll('[role=textbox][aria-label="Texte"]')];
    const el = boxes[boxes.length - 1];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const index = node.textContent.indexOf(target);
      if (index === -1) continue;
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + target.length);
      const selection = window.getSelection();
      el.focus();
      selection.removeAllRanges();
      selection.addRange(range);
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      return true;
    }
    return false;
  }, word);
  await page.waitForTimeout(250);
};

await selectWord('gras');
check('Le bouton Gras est éteint avant', (await page.getByRole('button', { name: 'Gras' }).getAttribute('aria-pressed')) === 'false');
await page.getByRole('button', { name: 'Gras' }).click();
await page.waitForTimeout(350);
check(
  'Le bouton Gras s’allume une fois appliqué',
  (await page.getByRole('button', { name: 'Gras' }).getAttribute('aria-pressed')) === 'true',
);

await selectWord('italique');
await page.getByRole('button', { name: 'Italique' }).click();
await page.waitForTimeout(300);
check(
  'Le bouton Italique s’allume',
  (await page.getByRole('button', { name: 'Italique' }).getAttribute('aria-pressed')) === 'true',
);
check(
  'Le bouton Gras est éteint sur un autre mot',
  (await page.getByRole('button', { name: 'Gras' }).getAttribute('aria-pressed')) === 'false',
);

await selectWord('souligne');
await page.getByRole('button', { name: 'Souligné' }).click();
await page.waitForTimeout(300);

// Couleur : carrés de couleur dans une palette, pas une liste déroulante.
await selectWord('couleur');
await page.getByRole('button', { name: 'Couleur du texte' }).click();
await page.waitForTimeout(250);
check('La palette de couleurs propose des carrés', (await page.getByRole('button', { name: 'Rouge' }).count()) > 0);
await page.getByRole('button', { name: 'Rouge' }).click();
await page.waitForTimeout(350);

await selectWord('surligne');
await page.getByRole('button', { name: 'Surligner' }).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: 'Jaune' }).click();
await page.waitForTimeout(350);

// Taille en points, comme dans un traitement de texte.
await selectWord('taille');
await page.getByLabel('Taille').selectOption('18');
await page.waitForTimeout(400);
check('La taille affichée suit la sélection', (await page.getByLabel('Taille').inputValue()) === '18');

// Police.
await selectWord('police');
await page.getByLabel('Police').selectOption('montserrat');
await page.waitForTimeout(400);
check('La police affichée suit la sélection', (await page.getByLabel('Police').inputValue()) === 'montserrat');

const optionsTaille = await page.locator('select[aria-label="Taille"] option').allTextContents();
check('Les tailles sont en points', optionsTaille.slice(0, 5).join(',') === '8,9,10,11,12', optionsTaille.join(','));
const optionsPolice = await page.locator('select[aria-label="Police"] option').allTextContents();
check(
  'Les polices demandées sont proposées',
  ['Times New Roman', 'Arial', 'Calibri', 'Montserrat', 'Roboto'].every((f) => optionsPolice.includes(f)),
  optionsPolice.join(' | '),
);

await page.waitForTimeout(1600);

const stored = await page.evaluate(async (url) => {
  const id = url.split('/').pop();
  const open = indexedDB.open('minion-com');
  const db = await new Promise((res, rej) => { open.onsuccess = () => res(open.result); open.onerror = () => rej(open.error); });
  const course = await new Promise((res, rej) => {
    const tx = db.transaction('courses', 'readonly');
    const req = tx.objectStore('courses').get(id);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  return JSON.stringify(course.blocks);
}, courseUrl);

check('Gras enregistré', stored.includes('<b>gras</b>'), stored.slice(-300));
check('Italique enregistré', stored.includes('<i>italique</i>'));
check('Souligné enregistré', stored.includes('<u>souligne</u>'));
check('Couleur enregistrée comme classe de thème', stored.includes('rt-c-rouge'));
check('Surlignage enregistré', stored.includes('rt-m-jaune'));
check('Taille enregistrée en points', stored.includes('rt-pt-18'), stored.slice(-300));
check('Police enregistrée', stored.includes('rt-f-montserrat'));
check('Aucun style en dur enregistré', !stored.includes('style='), stored.slice(-300));

/* ---------- 3. La mise en forme survit au rechargement ---------- */
phase = '3-rechargement';

await page.goto(courseUrl, { waitUntil: 'networkidle' });
await page.locator('input[aria-label="Titre du cours"]').waitFor({ state: 'visible', timeout: 20000 });
await page.waitForTimeout(1500);
const rendered = await page.evaluate(() => {
  const boxes = [...document.querySelectorAll('[role=textbox]')];
  return boxes.map((b) => b.innerHTML).join('');
});
check('Le gras est toujours là après rechargement', rendered.includes('<b>gras</b>'));
check('La couleur est toujours là après rechargement', rendered.includes('rt-c-rouge'));
check('La taille est toujours là après rechargement', rendered.includes('rt-pt-18'));
check('La police est toujours là après rechargement', rendered.includes('rt-f-montserrat'));

/* ---------- 3b. Menu d'ajout de bloc ---------- */
phase = '3b-menu-blocs';

await page.getByRole('button', { name: 'Ajouter un bloc' }).click();
await page.waitForTimeout(350);
const carte = page.getByRole('button', { name: 'Texte', exact: true }).first();
const boite = await carte.boundingBox();
check('Les cases du menu sont grandes', boite && boite.height >= 80, boite ? `${Math.round(boite.height)}px` : 'introuvable');
const iconesMenu = await page.evaluate(() => {
  const menu = [...document.querySelectorAll('button')].filter((b) => /Liste à puces/.test(b.textContent || ''));
  return menu.length > 0 && menu[0].querySelector('svg') !== null;
});
check('Chaque case a une icône', iconesMenu);
// Une fois ouvert, le bouton s'intitule « Fermer ».
await page.getByRole('button', { name: 'Fermer' }).first().click();
await page.waitForTimeout(250);

/* ---------- 4. Le collage n'introduit pas de HTML ---------- */
phase = '4-collage';

const pasted = await page.evaluate(() => {
  const box = document.querySelector('[role=textbox][aria-label="Texte"]');
  box.focus();
  const data = new DataTransfer();
  data.setData('text/html', '<img src=x onerror="window.__pwned=1">collé');
  data.setData('text/plain', '<img src=x onerror="window.__pwned=1">collé');
  box.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  return box.innerHTML;
});
check('Le collage n’insère aucune balise', !/<img/i.test(pasted), pasted.slice(0, 120));
check('Aucun script du presse-papier n’a été exécuté', !(await page.evaluate(() => window.__pwned)));

/* ---------- 5. Bouton Enregistrer et Ctrl+S ---------- */
phase = '5-bouton-enregistrer';

await page.goto(courseUrl, { waitUntil: 'networkidle' });
await page.locator('input[aria-label="Titre du cours"]').waitFor({ state: 'visible', timeout: 20000 });
await page.waitForTimeout(1000);

check('Un bouton Enregistrer est présent', await page.getByRole('button', { name: /Enregistr/ }).count() > 0);

const marqueur = 'TITRE-BOUTON-' + Date.now();
await page.locator('input[aria-label="Titre du cours"]').fill(marqueur);
await page.getByRole('button', { name: /Enregistr/ }).click();
await page.waitForTimeout(700);
const apresBouton = await page.evaluate(async (url) => {
  const id = url.split('/').pop();
  const open = indexedDB.open('minion-com');
  const db = await new Promise((res, rej) => { open.onsuccess = () => res(open.result); open.onerror = () => rej(open.error); });
  return await new Promise((res, rej) => {
    const tx = db.transaction('courses', 'readonly');
    const req = tx.objectStore('courses').get(id);
    req.onsuccess = () => res(req.result.title);
    req.onerror = () => rej(req.error);
  });
}, courseUrl);
check('Le bouton enregistre tout de suite', apresBouton === marqueur, `trouvé "${apresBouton}"`);
check('Le bouton confirme « Enregistré »', await page.getByRole('button', { name: /Enregistré/ }).count() > 0);

const marqueur2 = 'TITRE-CTRLS-' + Date.now();
await page.locator('input[aria-label="Titre du cours"]').fill(marqueur2);
await page.keyboard.press('Control+s');
await page.waitForTimeout(700);
const apresCtrlS = await page.evaluate(async (url) => {
  const id = url.split('/').pop();
  const open = indexedDB.open('minion-com');
  const db = await new Promise((res, rej) => { open.onsuccess = () => res(open.result); open.onerror = () => rej(open.error); });
  return await new Promise((res, rej) => {
    const tx = db.transaction('courses', 'readonly');
    const req = tx.objectStore('courses').get(id);
    req.onsuccess = () => res(req.result.title);
    req.onerror = () => rej(req.error);
  });
}, courseUrl);
check('Ctrl+S enregistre aussi', apresCtrlS === marqueur2, `trouvé "${apresCtrlS}"`);

/* ---------- 6. Tout est modifiable sur un cours ---------- */
phase = '6-champs-modifiables';

const matieres = await page.locator('select[aria-label="Matière du cours"]').count();
check('La matière du cours est modifiable', matieres === 1);
check('Le numéro du cours est modifiable', await page.locator('input[aria-label="Numéro du cours"]').count() === 1);
check('L’enseignant est modifiable', await page.locator('#course-teacher').count() === 1);
check('La salle est modifiable', await page.locator('#course-room').count() === 1);
check('Le chapitre est toujours proposé', await page.locator('label[for="course-chapter"]').count() === 1);

const optionsMatiere = await page.locator('select[aria-label="Matière du cours"] option').count();
if (optionsMatiere > 1) {
  const avant = await page.locator('select[aria-label="Matière du cours"]').inputValue();
  const autre = await page.locator('select[aria-label="Matière du cours"] option').nth(1).getAttribute('value');
  const cible = autre === avant
    ? await page.locator('select[aria-label="Matière du cours"] option').nth(0).getAttribute('value')
    : autre;
  await page.locator('select[aria-label="Matière du cours"]').selectOption(cible);
  await page.waitForTimeout(900);
  const stocke = await page.evaluate(async (url) => {
    const id = url.split('/').pop();
    const open = indexedDB.open('minion-com');
    const db = await new Promise((res, rej) => { open.onsuccess = () => res(open.result); open.onerror = () => rej(open.error); });
    return await new Promise((res, rej) => {
      const tx = db.transaction('courses', 'readonly');
      const req = tx.objectStore('courses').get(id);
      req.onsuccess = () => res(req.result.subjectId);
      req.onerror = () => rej(req.error);
    });
  }, courseUrl);
  check('Changer de matière est bien enregistré', stocke === cible, `${avant} -> ${stocke}`);
} else {
  check('Changer de matière est bien enregistré', false, 'une seule matière disponible');
}

await page.locator('input[aria-label="Numéro du cours"]').fill('7');
await page.waitForTimeout(900);
check('Le numéro modifié est enregistré', await page.evaluate(async (url) => {
  const id = url.split('/').pop();
  const open = indexedDB.open('minion-com');
  const db = await new Promise((res, rej) => { open.onsuccess = () => res(open.result); open.onerror = () => rej(open.error); });
  const n = await new Promise((res, rej) => {
    const tx = db.transaction('courses', 'readonly');
    const req = tx.objectStore('courses').get(id);
    req.onsuccess = () => res(req.result.number);
    req.onerror = () => rej(req.error);
  });
  return n === 7;
}, courseUrl));

/* ---------- 7. Flashcards ---------- */
phase = '7-flashcards';

await goto('/');
check('Les flashcards sont dans le menu', await page.locator('a[href="/flashcards"]').count() > 0);
await page.locator('a[href="/flashcards"]').first().click();
await page.waitForTimeout(1200);
check('La page Flashcards s’ouvre', page.url().includes('/flashcards'));

await page.getByRole('button', { name: 'Nouvelle carte' }).first().click();
await page.waitForTimeout(400);
const premiereMatiere = await page.locator('#card-subject option').nth(1).getAttribute('value');
await page.locator('#card-subject').selectOption(premiereMatiere);
await page.locator('#card-question').fill('Qu’est-ce que la hiérarchie des normes ?');
await page.locator('#card-answer').fill('Le classement des règles de droit par valeur.');
await page.getByRole('button', { name: 'Ajouter la carte' }).click();
await page.waitForTimeout(1200);
// La question est modifiable sur place : elle est dans un champ, pas dans le
// texte de la page. On vérifie donc l'affichage ET la base.
const questionsAffichees = await page.$$eval('input[aria-label="Question"]', (nodes) =>
  nodes.map((node) => node.value),
);
check(
  'Une flashcard créée s’affiche',
  questionsAffichees.some((q) => q.includes('hiérarchie des normes')),
  questionsAffichees.slice(0, 3).join(' | '),
);
const enBase = await page.evaluate(async () => {
  const open = indexedDB.open('minion-com');
  const db = await new Promise((res, rej) => { open.onsuccess = () => res(open.result); open.onerror = () => rej(open.error); });
  const all = await new Promise((res, rej) => {
    const tx = db.transaction('flashcards', 'readonly');
    const req = tx.objectStore('flashcards').getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  return all.some((c) => c.question.includes('hiérarchie des normes'));
});
check('La flashcard est bien enregistrée', enBase);

/* ---------- 8. Fiches : mise en forme et pas de saut ---------- */
phase = '8-fiches';

await goto('/fiches');
await page.locator('a[href^="/fiches/"]').first().click();
await page.locator('input[aria-label="Titre de la fiche"]').waitFor({ state: 'visible', timeout: 20000 });
await page.waitForTimeout(1000);
const ficheUrl = page.url();

const SEC = '[role=textbox][aria-label^="Contenu de la section"]';
check('Les sections de fiche sont des champs enrichis', (await page.locator(SEC).count()) > 0);
check('La barre de mise en forme est là', (await page.getByRole('button', { name: 'Gras' }).count()) > 0);

const zoneFiche = page.locator(SEC).first();
await zoneFiche.click();
await page.keyboard.type(' motimportant');
await page.waitForTimeout(300);

await page.evaluate((sel) => {
  const el = document.querySelector(sel);
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const i = node.textContent.indexOf('motimportant');
    if (i === -1) continue;
    const range = document.createRange();
    range.setStart(node, i);
    range.setEnd(node, i + 'motimportant'.length);
    const sel2 = window.getSelection();
    el.focus();
    sel2.removeAllRanges();
    sel2.addRange(range);
    return;
  }
}, SEC);
await page.waitForTimeout(200);
await page.getByRole('button', { name: 'Surligner' }).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: 'Jaune' }).click();
await page.waitForTimeout(1800);

await page.goto(ficheUrl, { waitUntil: 'networkidle' });
await page.locator('input[aria-label="Titre de la fiche"]').waitFor({ state: 'visible', timeout: 20000 });
await page.waitForTimeout(1500);
const htmlFiche = await page.$$eval(SEC, (nodes) => nodes.map((n) => n.innerHTML).join(''));
check('Le surlignage d’une fiche est conservé', htmlFiche.includes('rt-m-jaune'), htmlFiche.slice(0, 140));

/* ---------- 9. Révisions : modifier et valider ---------- */
phase = '9-revisions';

await goto('/revisions');
const modifierSession = page.getByRole('button', { name: /^Modifier la session/ });
check('Une session peut être modifiée', (await modifierSession.count()) > 0);
const validerSession = page.getByRole('button', { name: 'Terminée' });
check('Une session peut être marquée faite', (await validerSession.count()) > 0);

if ((await modifierSession.count()) > 0) {
  await modifierSession.first().click();
  await page.waitForTimeout(600);
  const titreSession = 'SESSION-MODIFIEE-' + Date.now();
  await page.locator('#rs-title').fill(titreSession);
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await page.waitForTimeout(1200);
  const enBaseSession = await page.evaluate(async (attendu) => {
    const open = indexedDB.open('minion-com');
    const db = await new Promise((res, rej) => { open.onsuccess = () => res(open.result); open.onerror = () => rej(open.error); });
    const all = await new Promise((res, rej) => {
      const tx = db.transaction('revisionSessions', 'readonly');
      const req = tx.objectStore('revisionSessions').getAll();
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    return all.some((s) => s.title === attendu);
  }, titreSession);
  check('La session modifiée est enregistrée', enBaseSession);
}

const avantValidation = await page.evaluate(async () => {
  const open = indexedDB.open('minion-com');
  const db = await new Promise((res, rej) => { open.onsuccess = () => res(open.result); open.onerror = () => rej(open.error); });
  const all = await new Promise((res, rej) => {
    const tx = db.transaction('revisionSessions', 'readonly');
    const req = tx.objectStore('revisionSessions').getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  return all.filter((s) => s.status === 'done').length;
});
await page.getByRole('button', { name: 'Terminée' }).first().click();
await page.waitForTimeout(1200);
const apresValidation = await page.evaluate(async () => {
  const open = indexedDB.open('minion-com');
  const db = await new Promise((res, rej) => { open.onsuccess = () => res(open.result); open.onerror = () => rej(open.error); });
  const all = await new Promise((res, rej) => {
    const tx = db.transaction('revisionSessions', 'readonly');
    const req = tx.objectStore('revisionSessions').getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  return all.filter((s) => s.status === 'done').length;
});
check('Valider une session la marque bien faite', apresValidation === avantValidation + 1, `${avantValidation} -> ${apresValidation}`);

/* ---------- 10. Flashcards : filtres, sélection, mode mélangé ---------- */
phase = '10-flashcards';

await goto('/flashcards');
check('Filtre par matière', (await page.locator('#filter-subject').count()) === 1);
check('Filtre par date d’ajout', (await page.locator('#filter-added').count()) === 1);
check('Choix de l’ordre', (await page.locator('#filter-order').count()) === 1);
check('Recherche dans les cartes', (await page.locator('#filter-query').count()) === 1);
check('Nombre de cartes par séance', (await page.locator('#session-size').count()) === 1);
check('Filtre par niveau : Maîtrisé', (await page.getByRole('button', { name: 'Maîtrisé' }).count()) > 0);
check('Bouton de séance mélangée', (await page.getByRole('button', { name: 'Séance mélangée' }).count()) > 0);

const totalCartes = await page.locator('input[aria-label^="Sélectionner"]').count();
check('Chaque carte a une case à cocher', totalCartes > 0, `${totalCartes} cartes`);

// Filtrer par niveau réduit vraiment la liste.
await page.getByRole('button', { name: 'Maîtrisé' }).first().click();
await page.waitForTimeout(700);
const apresFiltre = await page.locator('input[aria-label^="Sélectionner"]').count();
check('Le filtre par niveau réduit la liste', apresFiltre < totalCartes, `${totalCartes} -> ${apresFiltre}`);
await page.getByRole('button', { name: 'Tous les niveaux' }).click();
await page.waitForTimeout(700);

// Sélection puis séance limitée à 10 cartes.
await page.getByRole('button', { name: 'Tout sélectionner' }).click();
await page.waitForTimeout(500);
const coche = await page.locator('input[aria-label^="Sélectionner"]:checked').count();
check('« Tout sélectionner » coche les cartes', coche === totalCartes, `${coche}/${totalCartes}`);

await page.locator('#session-size').selectOption('10');
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Séance mélangée' }).click();
await page.waitForTimeout(900);
const titreSeance = await page.textContent('body');
check('La séance mélangée démarre', /Ma sélection/.test(titreSeance), titreSeance.slice(0, 90));
check(
  'La séance est limitée au nombre demandé',
  /Ma sélection · (10|[1-9]) carte/.test(titreSeance),
  (titreSeance.match(/Ma sélection · \d+ cartes?/) || ['?'])[0],
);

/* ---------- 11. Export PDF ---------- */
phase = '11-pdf';

await goto('/fiches');
await page.locator('a[href^="/fiches/"]').first().click();
await page.locator('input[aria-label="Titre de la fiche"]').waitFor({ state: 'visible', timeout: 20000 });
await page.waitForTimeout(800);
check('Une fiche peut être exportée en PDF', (await page.getByRole('button', { name: 'Exporter en PDF' }).count()) > 0);

await goto('/methodes');
await page.locator('a[href^="/methodes/"]').first().click();
await page.waitForTimeout(1500);
check('Une méthode peut être exportée en PDF', (await page.getByRole('button', { name: 'Exporter en PDF' }).count()) > 0);

await page.goto(courseUrl, { waitUntil: 'networkidle' });
await page.locator('input[aria-label="Titre du cours"]').waitFor({ state: 'visible', timeout: 20000 });
await page.waitForTimeout(800);
check('Un cours peut être exporté en PDF', (await page.getByRole('button', { name: 'Exporter en PDF' }).count()) > 0);

// À l'impression, l'interface d'édition disparaît.
await page.emulateMedia({ media: 'print' });
await page.waitForTimeout(400);
const barreVisible = await page.getByRole('button', { name: 'Gras' }).isVisible().catch(() => false);
check('La barre de mise en forme n’est pas imprimée', !barreVisible);
const ajoutVisible = await page.getByRole('button', { name: 'Ajouter un bloc' }).isVisible().catch(() => false);
check('Le bouton « Ajouter un bloc » n’est pas imprimé', !ajoutVisible);
const texteImprime = await page.locator('[role=textbox][aria-label="Texte"]').first().isVisible();
check('Le contenu du cours est bien imprimé', texteImprime);
await page.emulateMedia({ media: 'screen' });

await browser.close();
console.log('\n--- ERREURS CONSOLE ---');
console.log(errors.length ? errors.join('\n') : '(aucune)');
console.log(`\n${pass} OK / ${fail} FAIL`);
process.exit(fail || errors.length ? 1 : 0);
