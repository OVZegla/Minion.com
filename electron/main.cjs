/**
 * minion.com — processus principal Electron.
 *
 * Pourquoi un serveur local plutôt qu'un simple fichier HTML ?
 * Toutes les données de l'application vivent dans IndexedDB, que Chromium
 * refuse d'ouvrir sur une page « file:// ». L'application embarque donc son
 * propre serveur Next.js, lancé sur 127.0.0.1 sur un port libre choisi au
 * démarrage. Rien ne sort de l'ordinateur : aucune requête réseau, aucun
 * compte, aucune clé API.
 */
const { app, BrowserWindow, Menu, net: electronNet, protocol, shell, dialog } = require('electron');
const { fork } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const http = require('node:http');
const fsp = require('node:fs/promises');
const path = require('node:path');
const library = require('./library.cjs');

const isDev = !app.isPackaged;
/** En production le serveur est copié dans resources/app-server. */
const SERVER_DIR = isDev
  ? path.join(__dirname, '..', 'desktop', 'app')
  : path.join(process.resourcesPath, 'app-server');

app.setName('minion.com');
app.setAppUserModelId('com.minion.app');

/**
 * Origine fixe de l'application.
 *
 * Le serveur interne écoute sur un port libre, donc différent à chaque
 * lancement. Si la fenêtre chargeait « http://127.0.0.1:<port> », l'origine
 * changerait à chaque ouverture — et IndexedDB, qui est cloisonné par origine,
 * repartirait vide : toutes les données seraient perdues.
 *
 * On expose donc le serveur derrière un schéma dédié et constant. Les données
 * restent attachées à « minion://app » pour toujours.
 */
const APP_SCHEME = 'minion';
const APP_ORIGIN = `${APP_SCHEME}://app`;

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
    },
  },
]);

let serverProcess = null;
let mainWindow = null;
let serverPort = 0;

/* ------------------------------ Utilitaires ----------------------------- */

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

/**
 * Attend que le serveur soit reellement pret.
 *
 * Un simple test de connexion TCP ne suffit pas : Next se met a ecouter AVANT
 * d'avoir fini son initialisation. Une requete arrivant dans cet intervalle
 * repond « Internal Server Error ». On interroge donc vraiment la page
 * d'accueil jusqu'a obtenir une reponse valide.
 */
function probe(port, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const request = http.get(
      { host: '127.0.0.1', port, path: '/', timeout: timeoutMs },
      (response) => {
        response.resume();
        resolve(response.statusCode ?? 0);
      },
    );
    request.on('timeout', () => {
      request.destroy();
      resolve(0);
    });
    request.on('error', () => resolve(0));
  });
}

async function waitForServer(port, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  let lastStatus = 0;

  while (Date.now() < deadline) {
    lastStatus = await probe(port);
    // 2xx/3xx/4xx = le routeur repond ; 5xx ou 0 = pas encore pret.
    if (lastStatus > 0 && lastStatus < 500) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(
    lastStatus >= 500
      ? `Le moteur de l'application a repondu ${lastStatus} au demarrage.`
      : "Le moteur de l'application n'a pas demarre a temps.",
  );
}

/* --------------------------- Position fenêtre --------------------------- */

const stateFile = () => path.join(app.getPath('userData'), 'window-state.json');

function readWindowState() {
  try {
    const raw = JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
    if (typeof raw.width === 'number' && typeof raw.height === 'number') return raw;
  } catch {
    /* première ouverture : valeurs par défaut */
  }
  return { width: 1280, height: 860 };
}

function saveWindowState(win) {
  if (!win || win.isDestroyed()) return;
  try {
    const bounds = win.isMaximized() ? win.getNormalBounds() : win.getBounds();
    fs.writeFileSync(
      stateFile(),
      JSON.stringify({ ...bounds, maximized: win.isMaximized() }, null, 2),
    );
  } catch {
    /* la position n'est qu'un confort : on n'échoue jamais dessus */
  }
}

/* ------------------------------- Journal -------------------------------- */

/**
 * Journal du moteur interne, pour pouvoir diagnostiquer un démarrage raté
 * sans avoir à relancer l'application depuis un terminal.
 */
const logFile = () => path.join(app.getPath('userData'), 'journal.log');

function appendLog(text) {
  try {
    fs.appendFileSync(logFile(), text.endsWith('\n') ? text : `${text}\n`);
  } catch {
    /* le journal ne doit jamais empêcher l'application de tourner */
  }
}

async function resetLog() {
  try {
    await fsp.mkdir(path.dirname(logFile()), { recursive: true });
    await fsp.writeFile(logFile(), `minion.com ${app.getVersion()} — ${new Date().toISOString()}\n`);
  } catch {
    /* idem */
  }
}

/* ------------------------------- Serveur -------------------------------- */

async function startServer() {
  const entry = path.join(SERVER_DIR, 'server.js');
  if (!fs.existsSync(entry)) {
    throw new Error(
      `Serveur introuvable (${entry}).\n` +
        'Lance « npm run desktop:build » avant « npm run desktop:start ».',
    );
  }

  serverPort = await findFreePort();

  // On repart d'un environnement propre : NODE_OPTIONS et les variables
  // ELECTRON_* héritées perturbent le processus enfant.
  const childEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key === 'NODE_OPTIONS' || key.startsWith('ELECTRON_')) continue;
    childEnv[key] = value;
  }

  serverProcess = fork(entry, [], {
    cwd: SERVER_DIR,
    // ELECTRON_RUN_AS_NODE fait tourner le binaire Electron comme un Node
    // classique : le serveur Next reste isolé du processus principal.
    env: {
      ...childEnv,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: String(serverPort),
      HOSTNAME: '127.0.0.1',
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });

  const record = (prefix) => (chunk) => {
    const line = `${prefix} ${chunk}`;
    process.stdout.write(line);
    appendLog(line);
  };
  serverProcess.stdout?.on('data', record('[serveur]'));
  serverProcess.stderr?.on('data', record('[serveur erreur]'));
  serverProcess.on('exit', (code) => {
    serverProcess = null;
    if (code !== 0 && !app.isQuitting) {
      dialog.showErrorBox(
        'minion.com',
        'Le moteur de l’application s’est arrêté de façon inattendue. Relance minion.com.',
      );
      app.quit();
    }
  });

  await waitForServer(serverPort);
  return serverPort;
}

/** Page d'erreur lisible, plutôt que le « Internal Server Error » brut de Next. */
function errorPage(detail) {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>minion.com</title><style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#fcfaf5;color:#241f18;font:15px/1.6 system-ui,sans-serif;padding:24px}
.box{max-width:520px}h1{font-size:20px;margin:0 0 12px}
p{color:#7b7264;margin:0 0 10px}code{background:#f7f3ea;padding:2px 6px;border-radius:6px;
font-size:13px;word-break:break-all}
button{margin-top:16px;border:0;border-radius:12px;background:#ffc93c;color:#2a2109;
font:600 14px system-ui,sans-serif;padding:10px 18px;cursor:pointer}
</style></head><body><div class="box">
<h1>minion.com n’a pas réussi à démarrer</h1>
<p>Le moteur interne de l’application n’a pas répondu correctement. Tes données ne
sont pas touchées : elles restent enregistrées sur cet ordinateur.</p>
<p>Détail : <code>${String(detail).replace(/[<>&]/g, '')}</code></p>
<p>Un journal détaillé se trouve dans :<br><code>${logFile()}</code></p>
<button onclick="location.reload()">Réessayer</button>
</div></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

/** Relaie « minion://app/... » vers le serveur local, sans exposer le port. */
function registerAppProtocol(port) {
  protocol.handle(APP_SCHEME, async (request) => {
    const incoming = new URL(request.url);
    const target = `http://127.0.0.1:${port}${incoming.pathname}${incoming.search}`;

    const init = {
      method: request.method,
      headers: request.headers,
      redirect: 'follow',
    };
    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
    if (hasBody) {
      init.body = request.body;
      init.duplex = 'half';
    }

    let lastError = null;
    // Une requête peut arriver pendant que Next finit de s'initialiser :
    // on laisse passer quelques tentatives avant de conclure à une panne.
    const attempts = hasBody ? 1 : 3;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const response = await electronNet.fetch(target, init);
        if (response.status < 500 || attempt === attempts - 1) return response;
        lastError = `réponse ${response.status}`;
      } catch (error) {
        lastError = String(error?.message ?? error);
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    appendLog(`[protocole] ${incoming.pathname} : ${lastError}`);

    // Seule une navigation mérite une page d'erreur ; pour une ressource on
    // renvoie un code d'erreur discret.
    if (request.method === 'GET' && (request.headers.get('accept') ?? '').includes('text/html')) {
      return errorPage(lastError ?? 'inconnu');
    }
    return new Response('', { status: 502 });
  });
}

/* ------------------------------- Fenêtre -------------------------------- */

function createWindow() {
  const state = readWindowState();

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 380,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#fcfaf5',
    title: 'minion.com',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: true,
    },
  });

  if (state.maximized) mainWindow.maximize();

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('close', () => saveWindowState(mainWindow));
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Les liens externes s'ouvrent dans le navigateur, jamais dans l'app.
  const openExternally = (url) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  };
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(APP_ORIGIN)) return { action: 'allow' };
    return openExternally(url);
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(APP_ORIGIN)) {
      event.preventDefault();
      openExternally(url);
    }
  });

  mainWindow.loadURL(`${APP_ORIGIN}/`);
}

/* -------------------------------- Menu ---------------------------------- */

function buildMenu() {
  const go = (route) => () => {
    if (mainWindow) mainWindow.loadURL(`${APP_ORIGIN}${route}`);
  };

  const template = [
    {
      label: 'Fichier',
      submenu: [
        { label: 'Accueil', accelerator: 'CmdOrCtrl+1', click: go('/') },
        { label: 'Calendrier', accelerator: 'CmdOrCtrl+2', click: go('/calendrier') },
        { label: 'À faire', accelerator: 'CmdOrCtrl+3', click: go('/a-faire') },
        { label: 'Matières', accelerator: 'CmdOrCtrl+4', click: go('/matieres') },
        { type: 'separator' },
        { label: 'Paramètres', click: go('/parametres') },
        { type: 'separator' },
        { role: 'quit', label: 'Quitter' },
      ],
    },
    {
      label: 'Édition',
      submenu: [
        { role: 'undo', label: 'Annuler' },
        { role: 'redo', label: 'Rétablir' },
        { type: 'separator' },
        { role: 'cut', label: 'Couper' },
        { role: 'copy', label: 'Copier' },
        { role: 'paste', label: 'Coller' },
        { role: 'selectAll', label: 'Tout sélectionner' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { role: 'reload', label: 'Recharger' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Taille normale' },
        { role: 'zoomIn', label: 'Agrandir' },
        { role: 'zoomOut', label: 'Réduire' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Plein écran' },
        { role: 'toggleDevTools', label: 'Outils de développement' },
      ],
    },
    {
      label: 'Aide',
      submenu: [
        {
          label: 'À propos de minion.com',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'À propos',
              message: 'minion.com',
              detail:
                `Version ${app.getVersion()}\n\n` +
                'Ton espace pour organiser tes cours, tes révisions et tes études.\n\n' +
                'Toutes tes données restent sur cet ordinateur : aucune connexion, ' +
                'aucun compte, aucun envoi vers l’extérieur.\n\n' +
                `Emplacement des données :\n${app.getPath('userData')}`,
              buttons: ['Fermer'],
            });
          },
        },
        {
          label: 'Ouvrir le dossier de mes données',
          click: () => shell.openPath(app.getPath('userData')),
        },
        {
          label: 'Ouvrir le journal technique',
          click: () => shell.openPath(logFile()),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ------------------------------ Démarrage ------------------------------- */

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    await resetLog();

    // Classement automatique des documents sur le disque.
    library.register();

    try {
      const port = await startServer();
      registerAppProtocol(port);
      buildMenu();
      createWindow();
    } catch (error) {
      const detail = String(error?.message ?? error);
      appendLog(`[demarrage] ${detail}`);
      dialog.showErrorBox(
        'minion.com — démarrage impossible',
        `${detail}\n\nUn journal détaillé se trouve dans :\n${logFile()}`,
      );
      app.quit();
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0 && serverPort) createWindow();
    });
  });

  app.on('before-quit', () => {
    app.isQuitting = true;
    stopServer();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
