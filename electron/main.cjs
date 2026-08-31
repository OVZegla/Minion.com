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

function waitForServer(port, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect(port, '127.0.0.1');
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() > deadline) {
          reject(new Error('Le serveur local n’a pas démarré à temps.'));
        } else {
          setTimeout(attempt, 150);
        }
      });
    };
    attempt();
  });
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

  serverProcess = fork(entry, [], {
    cwd: SERVER_DIR,
    // ELECTRON_RUN_AS_NODE fait tourner le binaire Electron comme un Node
    // classique : le serveur Next reste isolé du processus principal.
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: String(serverPort),
      HOSTNAME: '127.0.0.1',
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });

  serverProcess.stdout?.on('data', (chunk) => process.stdout.write(`[serveur] ${chunk}`));
  serverProcess.stderr?.on('data', (chunk) => process.stderr.write(`[serveur] ${chunk}`));
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
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = request.body;
      init.duplex = 'half';
    }

    try {
      return await electronNet.fetch(target, init);
    } catch (error) {
      return new Response(`Erreur interne : ${String(error?.message ?? error)}`, {
        status: 502,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }
  });
}

function stopServer() {
  if (!serverProcess) return;
  serverProcess.removeAllListeners('exit');
  serverProcess.kill();
  serverProcess = null;
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
    // Classement automatique des documents sur le disque.
    library.register();

    try {
      const port = await startServer();
      registerAppProtocol(port);
      buildMenu();
      createWindow();
    } catch (error) {
      dialog.showErrorBox('minion.com — démarrage impossible', String(error?.message ?? error));
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
