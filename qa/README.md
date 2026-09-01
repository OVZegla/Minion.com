# Vérifications navigateur

Scripts Playwright utilisés pendant le développement pour vérifier
l'application réellement rendue (et non seulement le typage).

```bash
npm run build
npx next start -p 3120
node qa/smoke.mjs       # toutes les pages répondent, aucune erreur console
node qa/scenarios.mjs   # les 12 scénarios fonctionnels de bout en bout
node qa/autosave.mjs    # rien n'est perdu quand on quitte une page en pleine frappe
node qa/editor.mjs      # éditeur : pas de saut d'écran, mise en forme, flashcards
```

`smoke.mjs` parcourt les 22 routes et échoue à la moindre erreur console.
`scenarios.mjs` crée une matière, des chapitres, un cours, une tâche, un examen,
planifie et termine une révision, change un état de maîtrise, utilise la
recherche, exporte puis réimporte les données, et vérifie la vue mobile.

`autosave.mjs` tape du texte dans un cours puis dans une fiche et quitte la page
(ou recharge) **immédiatement**, avant la fin du délai de sauvegarde, puis
revérifie le contenu enregistré. C'est la garantie qu'il n'y a jamais de bouton
« Enregistrer » à cliquer. Ces trois cas échouaient avant la correction du
moteur de sauvegarde (`src/lib/autosave.ts`).

`editor.mjs` couvre l'éditeur de cours et de fiches :

* **Saut d'écran.** Il remplit une page longue, descend dedans, tape, efface, et
  vérifie que `window.scrollY` ne bouge pas. L'ancien éditeur remontait la vue
  de 320 px dès la première frappe (mesuré : `scrollY 1360 -> 1040`) ; c'est ce
  scénario précis qui l'a mis en évidence, une frappe courte ne suffisait pas.
* **Mise en forme.** Gras, italique, souligné, couleur et surlignage sont
  appliqués puis relus dans IndexedDB : on vérifie qu'ils sont stockés en
  classes de thème (`rt-c-rouge`) et **jamais** en style en dur, et qu'ils
  survivent au rechargement.
* **Collage.** Un presse-papier contenant `<img onerror=…>` est collé : aucune
  balise n'entre dans le document et rien ne s'exécute.
* **Bouton Enregistrer et Ctrl+S**, champs de cours modifiables (matière,
  numéro, enseignant, salle), création d'une flashcard.
* **Barre de mise en forme** : les boutons s'allument selon la sélection, les
  couleurs sont des carrés, les tailles sont en points, les polices demandées
  sont proposées, et tout est relu dans IndexedDB après application.
* **Révisions** : une session se modifie et se marque comme faite, vérifié en
  base.
* **Flashcards** : filtres (matière, niveau, date d'ajout, recherche), cases à
  cocher, et séance mélangée limitée au nombre de cartes choisi.
* **Export PDF** : bouton présent sur les cours, fiches et méthodes, et
  vérification que l'interface d'édition disparaît en mode impression alors que
  le contenu reste.

## Application de bureau

```bash
npm run desktop:build
npm run qa:desktop      # lance Electron et vérifie la fenêtre réelle
```

`desktop.mjs` lance l'application Electron **deux fois de suite** :

1. première session — origine fixe, isolation (aucune API Node dans la page),
   base IndexedDB créée, données de démonstration, classement réel des documents
   sur le disque (chemins vérifiés fichier par fichier), dépôt d'un nouveau
   document, réglage d'affichage du nom ;
2. seconde session — les données saisies pendant la première session sont
   toujours là, y compris une saisie encore en cours au moment où la fenêtre a
   été fermée.

L'export PDF y est vérifié pour de vrai : le bouton est cliqué dans
l'application lancée, puis le fichier écrit sur le disque est relu (en-tête
`%PDF` et taille non nulle).

Ce second lancement est essentiel : il vérifie que l'origine ne change pas d'une
ouverture à l'autre, sans quoi IndexedDB repartirait vide à chaque démarrage.
