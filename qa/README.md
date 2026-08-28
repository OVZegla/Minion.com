# Vérifications navigateur

Scripts Playwright utilisés pendant le développement pour vérifier
l'application réellement rendue (et non seulement le typage).

```bash
npm run build
npx next start -p 3120
node qa/smoke.mjs       # toutes les pages répondent, aucune erreur console
node qa/scenarios.mjs   # les 12 scénarios fonctionnels de bout en bout
```

`smoke.mjs` parcourt les 22 routes et échoue à la moindre erreur console.
`scenarios.mjs` crée une matière, des chapitres, un cours, une tâche, un examen,
planifie et termine une révision, change un état de maîtrise, utilise la
recherche, exporte puis réimporte les données, et vérifie la vue mobile.
