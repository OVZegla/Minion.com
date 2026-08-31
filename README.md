# minion.com

**L'espace étudiant personnel pour organiser toute une année universitaire.**

Cours, matières, emploi du temps, devoirs, examens, révisions, fiches, documents,
méthodes juridiques, SAÉ et sessions de travail — au même endroit, dans une
interface simple et rapide.

L'application fonctionne **entièrement en local** : aucun compte, aucun serveur,
aucune clé API, aucun service externe. Tout est stocké sur l'appareil
(IndexedDB).

Elle s'utilise dans un navigateur, s'installe comme une PWA, ou s'installe comme
une **application de bureau** — un `.exe` classique sous Windows
(cf. « Application de bureau » plus bas).

---

## Objectif

En ouvrant l'application, on doit pouvoir répondre immédiatement à :

- Qu'est-ce que j'ai aujourd'hui ?
- Qu'est-ce que j'ai à rendre ?
- Quels examens arrivent, et où en est ma préparation ?
- Où est mon cours de droit constitutionnel ?
- Quelles fiches ai-je déjà faites ? Quels chapitres restent à apprendre ?

Le jeu de démonstration livré (BUT Carrières Juridiques, 1re année, semestre 1)
donne l'impression d'une application déjà utilisée depuis quelques semaines.
Il est **entièrement fictif** et peut être supprimé ou remplacé à tout moment :
rien n'enferme l'application dans une formation précise.

---

## Stack

| Choix | Détail |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| Langage | TypeScript strict |
| UI | React 19, Tailwind CSS 3, composants maison |
| Icônes | lucide-react |
| Données | IndexedDB via Dexie + `dexie-react-hooks` (requêtes réactives) |
| Dates | date-fns (locale `fr`) |
| Validation | Zod (import de sauvegarde) |
| Bureau | Electron 33 + electron-builder (installeur NSIS) |
| Tests | Vitest (+ `fake-indexeddb`) et scénarios navigateur Playwright |

Aucune dépendance à une API externe, à un service d'IA ou à un backend.

---

## Installation et lancement

```bash
npm install          # installer les dépendances
npm run dev          # développement — http://localhost:3000
npm run build        # build de production
npm start            # servir le build
npm test             # tests unitaires (Vitest)
npm run typecheck    # vérification TypeScript
```

Au tout premier lancement, la base locale est vide : les données de
démonstration sont chargées automatiquement et un écran de bienvenue propose
soit de les explorer, soit de configurer directement sa propre année.

### Scénarios navigateur (facultatif)

```bash
npm run build && npx next start -p 3120     # dans un terminal
node qa/smoke.mjs                            # toutes les pages + console
node qa/scenarios.mjs                        # les 12 scénarios fonctionnels
```

Ces scripts utilisent Playwright et un Chromium local ; ils ne sont pas
nécessaires pour utiliser l'application.

---

## Structure

```
src/
  app/                    routes App Router (une page par section)
  components/
    layout/               AppShell, Sidebar, navigation mobile, providers
    ui/                   design system (Card, Modal, ProgressBar, EmptyState…)
  features/
    calendar/             occurrences, récurrence, carte d'événement
    courses/              éditeur de cours par blocs
    dashboard/            accueil
    documents/            dépôt de fichiers
    exams/                édition d'examen
    focus/                minuteur de session
    inbox/                classement des notes rapides
    legal-tools/          modèles de méthodologie juridique
    notifications/        notifications calculées
    onboarding/           bienvenue + assistant 5 étapes
    quick-add/            bouton « + » et formulaires courts
    revision/             plan de révision, flashcards
    sae/                  constantes SAÉ
    search/               recherche globale et palette de commandes
    subjects/             cartes, chapitres, édition de matière
    tasks/                cartes et détail de tâche
  db/                     schéma Dexie, dépôt (CRUD + cascades), seed, sauvegarde
  hooks/                  requêtes réactives, autosave, raccourcis clavier
  lib/                    dates, couleurs, progression, récurrence, parsing
  types/                  modèle de données complet
tests/                    tests unitaires
qa/                       scripts de vérification navigateur
```

---

## Fonctionnement des données

### Modèle

24 entités : `UserSettings`, `AcademicYear`, `Semester`, `Subject`, `Chapter`,
`Course`, `Note`, `InboxItem`, `Task` (+ `TaskSubItem` embarqué),
`CalendarEvent`, `Exam`, `RevisionSession`, `Flashcard`, `StudySheet`,
`DocumentItem`, `SAE`, `SAETask`, `Grade`, `FocusSession`, `CaseLaw`,
`LegalTerm`, `MethodDoc`, `AppNotification`, `Reminder`.

Relations principales :

```
Subject → Chapters, Courses, StudySheets, Exams, RevisionSessions, Tasks, Documents
Course  → Subject, Chapter, Documents, Notes, Flashcards
Exam    → Subject, Chapters, RevisionSessions, Tasks
SAE     → Semester, Subjects, SAETasks, Members, Documents
```

### Dates

Les jours sont stockés en `YYYY-MM-DD` et les instants en `YYYY-MM-DDTHH:mm`,
toujours en heure **locale** : aucun décalage de fuseau ne peut décaler un cours
d'un jour.

### Récurrence

Un cours hebdomadaire n'est saisi qu'une fois. Les occurrences ne sont jamais
stockées : elles sont calculées à l'affichage (`lib/recurrence.ts`) à partir
d'une date de début, de jours de semaine, d'un intervalle, d'une date de fin et
d'une liste d'exceptions. Déplacer une seule séance ajoute une exception et crée
un événement unique ; modifier toute la série met à jour l'événement d'origine.

### Progression (règle documentée)

Chaque chapitre, fiche ou cours porte un état de maîtrise auto-déclaré :

| État | Poids |
| --- | --- |
| Pas commencé | 0 |
| À apprendre | 0,25 |
| À revoir | 0,60 |
| Maîtrisé | 1 |

La progression affichée est la moyenne de ces poids, arrondie au pourcent.
Aucun pourcentage n'est écrit en dur : cocher « maîtrisé » sur un chapitre met
immédiatement à jour la matière, l'examen concerné et l'accueil.

Ce sont des **repères personnels**, pas une mesure de connaissances.

### Suppression en cascade contrôlée

Supprimer une matière supprime ce qui n'a plus de sens sans elle (chapitres,
cours, fiches, examens, révisions, flashcards, notes, résultats) et **détache**
ce qui garde du sens seul (tâches, documents, événements, jurisprudence,
lexique). Chaque cascade est couverte par un test.

### Notifications

Elles sont **calculées** à partir des données réelles (devoirs à rendre, examens
à moins de 7 jours, révisions du jour, SAÉ à rendre, éléments à classer), jamais
stockées : elles ne peuvent donc pas devenir fausses. Seul l'état « lue » est
persisté. Chaque catégorie peut être désactivée dans les paramètres.

---

## Démo : réinitialiser ou supprimer

Dans **Paramètres → Données de démonstration** :

- **Réinitialiser la démo** : recharge le jeu d'exemple complet ;
- **Supprimer toutes les données** : repart d'un espace totalement vide.

Les dates du seed sont recalculées **à chaque chargement** à partir de la date du
jour : le semestre a commencé il y a 5 semaines, le partiel est dans 12 jours,
un devoir est à rendre demain. La démo reste donc pertinente quelle que soit la
date de lancement.

---

## Export / import

Dans **Paramètres → Sauvegarde** :

- **Exporter mes données** télécharge un JSON contenant toutes les tables et les
  fichiers joints (encodés en base64) ;
- **Importer une sauvegarde** valide le fichier avec Zod, affiche un récapitulatif
  (nombre d'éléments par table, date d'export) et **avertit avant remplacement**.

Sécurité de l'import : validation stricte, tables inconnues ignorées, chaînes
assainies (caractères de contrôle retirés, longueur bornée), types MIME des
fichiers vérifiés. L'application n'utilise nulle part `dangerouslySetInnerHTML`
pour du contenu utilisateur : aucun HTML importé n'est jamais interprété.

---

## PWA et hors ligne

`manifest.webmanifest`, icônes générées (`npm exec node scripts/generate-icons.mjs`),
affichage `standalone` et service worker (`public/sw.js`) enregistré en
production. Les données vivant dans IndexedDB, l'application reste pleinement
utilisable sans réseau une fois la coquille en cache.

---

## Application de bureau (Windows, macOS, Linux)

minion.com s'installe aussi comme une vraie application, sans navigateur ni
connexion. L'installeur Windows est un `.exe` classique.

### Utiliser l'application installée

1. Lancer `minion.com-1.0.0-windows-x64.exe`.
2. Windows affiche un écran bleu **« Windows a protégé votre ordinateur »** :
   c'est normal, l'application n'est pas signée par un certificat payant.
   Cliquer sur **Informations complémentaires** puis **Exécuter quand même**.
3. Choisir le dossier d'installation. Aucun droit administrateur n'est requis :
   l'installation se fait pour l'utilisateur courant.
4. Des raccourcis sont créés sur le bureau et dans le menu Démarrer.

Une version **portable** (`minion.com-1.0.0-portable.exe`) est aussi produite :
elle ne s'installe pas et peut tourner depuis une clé USB.

### Classement automatique des documents

Dans l'application de bureau, chaque document ajouté est **aussi écrit dans les
dossiers de l'ordinateur**, rangé tout seul :

```
<dossier choisi>/<catégorie>/<matière>-chapitre<N>/<fichier>

cours/droit-des-affaires-chapitre1/CM03.pdf
fiches/droit-constitutionnel/les-sources.pdf
examens/comptabilite-generale/annales.pdf
matieres/intro-droit/plan-de-cours.pdf
divers/reglement-interieur.pdf
```

- La **catégorie** vient du rattachement du document : un document lié à un
  cours va dans `cours/`, lié à une fiche dans `fiches/`, à un examen dans
  `examens/`, à une SAÉ dans `sae/`, etc.
- Le **chapitre** vient du cours auquel le document est rattaché. Sans cours,
  le document est rangé dans le dossier de la matière ; sans matière, dans
  `divers/`.
- Les **liens** n'ont pas de fichier : rien n'est écrit pour eux.
- Un nom déjà pris devient `CM03 (2).pdf` : aucun fichier n'est jamais écrasé.

Réglages dans **Paramètres → Mes fichiers sur l'ordinateur** : choisir le
dossier (par défaut `Documents/minion.com`), désactiver le classement, ouvrir le
dossier, ou **tout reclasser** après un changement.

Depuis la page Documents, le bouton « Classer » permet de rattacher un document
à une autre matière ou à un autre cours : **le fichier est réellement déplacé**
sur le disque, et le chemin de destination est affiché avant validation.

Côté sécurité, la page n'a aucun accès au disque : elle envoie un dossier
relatif, un nom et des octets, et c'est le processus principal qui décide où
écrire. Chaque segment de chemin y est réassaini et le résultat doit rester
sous le dossier choisi — impossible d'écrire ailleurs.

### Une origine fixe pour ne jamais perdre les données

Le serveur interne écoute sur un port libre, donc différent à chaque lancement.
Si la fenêtre chargeait `http://127.0.0.1:<port>`, l'origine changerait à chaque
ouverture — et IndexedDB, cloisonné par origine, repartirait vide. La fenêtre
charge donc un schéma dédié et constant, `minion://app`, relayé vers le serveur
local : les données restent attachées à cette origine pour toujours.

### Où sont les données ?

Dans le profil Windows de l'utilisatrice :
`%APPDATA%\minion.com`. Le menu **Aide → Ouvrir le dossier de mes données**
y conduit directement. Désinstaller l'application **ne supprime pas** ces
données ; pour les emporter ailleurs, utiliser l'export JSON des paramètres.

### Comment ça marche

Toutes les données vivent dans IndexedDB, que Chromium refuse d'ouvrir sur une
page `file://`. L'application embarque donc son propre serveur Next.js, lancé
au démarrage sur `127.0.0.1` sur un port libre, dans un processus séparé.

Cela reste **100 % local** : le serveur n'écoute que sur la boucle locale,
aucune requête ne sort de l'ordinateur, et l'application fonctionne sans réseau.
Comme le socket est lié à `127.0.0.1` et non à toutes les interfaces, le
pare-feu Windows n'affiche normalement aucune demande d'autorisation.

Côté sécurité : `contextIsolation` activé, `nodeIntegration` désactivé, aucune
API Node exposée à la page, et les liens externes s'ouvrent dans le navigateur
par défaut plutôt que dans la fenêtre de l'application.

### Construire soi-même

```bash
npm install
npm run desktop:build     # prépare le serveur embarqué (desktop/app)
npm run desktop:start     # lance l'application sans l'empaqueter
npm run qa:desktop        # vérifie l'application Electron lancée

npm run dist:win          # -> dist-desktop/*.exe   (installeur + portable)
npm run dist:linux        # -> dist-desktop/*.AppImage et *.deb
npm run dist:mac          # -> dist-desktop/*.dmg
```

`npm run dist:win` sur une machine Windows est le chemin le plus simple.
Depuis Linux, il faut `wine` installé (32 bits inclus) pour que l'icône et les
métadonnées soient écrites dans l'exécutable.

Le dépôt contient aussi un workflow GitHub Actions
(`.github/workflows/desktop.yml`) qui construit l'installeur sur un vrai runner
Windows : déclenchement manuel, ou automatique sur un tag `v*` (les `.exe` sont
alors attachés à la release).

### Signature de code

Les installeurs ne sont pas signés : c'est ce qui déclenche l'avertissement
SmartScreen au premier lancement. Pour le supprimer, il faut un certificat
Authenticode (payant) et renseigner les variables `CSC_LINK` et
`CSC_KEY_PASSWORD` avant `npm run dist:win`.

---

## Discrétion

Un réglage **Paramètres → Apparence → « Afficher le nom minion.com en haut de
l'application »** masque le nom dans la barre latérale et l'en-tête mobile ;
seule la pastille reste, et la navigation continue de fonctionner. Pratique pour
travailler en cours sans afficher le nom de l'application.

---

## Accessibilité

Navigation clavier complète, focus visible partout, lien d'évitement, rôles et
libellés ARIA sur les dialogues, onglets et boutons d'action, zones tactiles
d'au moins 44 px sur mobile. **La couleur n'est jamais la seule information** :
les états de maîtrise, priorités et statuts portent toujours un libellé texte.

Raccourcis clavier : `Ctrl/Cmd + K` ou `/` pour la recherche, `N` pour l'ajout
rapide, `Échap` pour fermer.

---

## Ce qui est volontairement reporté

- **Pas d'IA en V1** : aucun bouton ne prétend analyser ou générer quoi que ce
  soit. L'architecture (blocs de cours structurés, fiches en sections,
  flashcards) permettra d'ajouter plus tard « créer une fiche depuis ce cours »
  ou « générer des questions ».
- **Répétition espacée** : les flashcards utilisent quatre réponses simples. Les
  champs `dueAt`, `intervalDays` et `ease` existent déjà dans le modèle pour
  brancher un algorithme plus tard sans migration.
- **Export PDF** : l'impression navigateur est gérée (mise en page dédiée sur les
  fiches et les documents de méthode) ; un export PDF natif viendra ensuite.
- **Rappels système** : le modèle `Reminder` est en place ; les notifications
  sont pour l'instant internes à l'application, sans notification push.
- **Synchronisation / comptes** : la couche de données est isolée pour pouvoir
  ajouter Supabase ou PostgreSQL par-dessus, mais rien n'est requis pour la V1.
- **Stockage cloud des fichiers** : le champ `storageRef` est prévu ; les
  fichiers sont pour l'instant stockés localement (15 Mo max par fichier).
- **Glisser-déposer dans le calendrier** : les événements se déplacent via leur
  fiche (date et heure), volontairement, pour rester fiable au doigt.

---

## Avertissement

Les outils juridiques (méthodes, jurisprudence, lexique) servent **uniquement à
organiser un travail universitaire**. Ils ne donnent aucun conseil juridique et
ne remplacent ni les cours ni les sources officielles. La bibliothèque de
jurisprudence ne contient que les décisions saisies manuellement par
l'utilisatrice ; les données de démonstration restent volontairement génériques
et invitent à compléter avec ses propres notes.
