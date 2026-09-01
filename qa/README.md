# Vérifications navigateur

Scripts Playwright utilisés pendant le développement pour vérifier
l'application réellement rendue (et non seulement le typage).

```bash
npm run build
npx next start -p 3120
node qa/smoke.mjs       # toutes les pages répondent, aucune erreur console
node qa/scenarios.mjs   # les 12 scénarios fonctionnels de bout en bout
node qa/autosave.mjs    # rien n'est perdu quand on quitte une page en pleine frappe
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

Ce second lancement est essentiel : il vérifie que l'origine ne change pas d'une
ouverture à l'autre, sans quoi IndexedDB repartirait vide à chaque démarrage.
