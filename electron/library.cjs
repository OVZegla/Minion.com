/**
 * Classement automatique des documents dans les fichiers de l'ordinateur.
 *
 * Le rendu (la page web) n'a aucun accès au disque : il envoie un dossier
 * relatif, un nom de fichier et des octets, et c'est ce module — côté
 * processus principal — qui décide où écrire. Chaque segment de chemin est
 * réassaini ici : on ne fait jamais confiance au chemin reçu.
 */
const { app, dialog, ipcMain, shell } = require('electron');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const CONFIG_FILE = () => path.join(app.getPath('userData'), 'library.json');

const { isInside, resolveTarget, uniquePath } = require('./paths.cjs');

function defaultRoot() {
  return path.join(app.getPath('documents'), 'minion.com');
}

function readConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_FILE(), 'utf8'));
    return {
      root: typeof raw.root === 'string' && raw.root ? raw.root : defaultRoot(),
      enabled: raw.enabled !== false,
    };
  } catch {
    return { root: defaultRoot(), enabled: true };
  }
}

function writeConfig(config) {
  fs.mkdirSync(path.dirname(CONFIG_FILE()), { recursive: true });
  fs.writeFileSync(CONFIG_FILE(), JSON.stringify(config, null, 2));
  return config;
}

const fileExists = (candidate) => fs.existsSync(candidate);

function register() {
  ipcMain.handle('library:config', () => ({ ...readConfig(), available: true }));

  ipcMain.handle('library:setEnabled', (_event, enabled) => {
    const config = readConfig();
    return { ...writeConfig({ ...config, enabled: Boolean(enabled) }), available: true };
  });

  ipcMain.handle('library:chooseRoot', async () => {
    const config = readConfig();
    const result = await dialog.showOpenDialog({
      title: 'Choisir le dossier de mes documents',
      defaultPath: config.root,
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Choisir ce dossier',
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { ...config, available: true };
    }
    return { ...writeConfig({ ...config, root: result.filePaths[0] }), available: true };
  });

  ipcMain.handle('library:save', async (_event, payload) => {
    const config = readConfig();
    if (!config.enabled) return null;

    const { dir, file } = resolveTarget(config.root, payload?.relativeDir, payload?.fileName);
    await fsp.mkdir(dir, { recursive: true });

    const target = uniquePath(file, fileExists);
    await fsp.writeFile(target, Buffer.from(payload?.bytes ?? new ArrayBuffer(0)));
    return { path: target, root: config.root };
  });

  /**
   * Enregistre la page en cours au format PDF, dans les mêmes dossiers que
   * les documents. La mise en page est celle de l'impression : la barre
   * latérale et les boutons sont masqués par la feuille de style.
   */
  ipcMain.handle('pdf:export', async (event, payload) => {
    const config = readConfig();
    const { dir, file } = resolveTarget(config.root, payload?.relativeDir, payload?.fileName);
    await fsp.mkdir(dir, { recursive: true });

    const contents = event.sender;
    const bytes = await contents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { marginType: 'custom', top: 0.6, bottom: 0.6, left: 0.6, right: 0.6 },
    });

    const target = uniquePath(file, fileExists);
    await fsp.writeFile(target, bytes);
    return { path: target, root: config.root };
  });

  ipcMain.handle('library:move', async (_event, payload) => {
    const config = readConfig();
    const from = payload?.from;
    if (!from || !fs.existsSync(from)) return null;

    const { dir, file } = resolveTarget(config.root, payload?.relativeDir, payload?.fileName);
    if (path.resolve(from) === path.resolve(file)) return { path: from, root: config.root };

    await fsp.mkdir(dir, { recursive: true });
    const target = uniquePath(file, fileExists);
    try {
      await fsp.rename(from, target);
    } catch (error) {
      // Changement de disque : on copie puis on supprime l'original.
      if (error?.code !== 'EXDEV') throw error;
      await fsp.copyFile(from, target);
      await fsp.unlink(from);
    }
    return { path: target, root: config.root };
  });

  ipcMain.handle('library:remove', async (_event, filePath) => {
    const config = readConfig();
    if (!filePath) return false;
    if (!isInside(config.root, filePath)) return false;
    await fsp.rm(filePath, { force: true });
    return true;
  });

  ipcMain.handle('library:reveal', (_event, filePath) => {
    if (filePath && fs.existsSync(filePath)) {
      shell.showItemInFolder(filePath);
      return true;
    }
    return false;
  });

  ipcMain.handle('library:openRoot', async () => {
    const { root } = readConfig();
    await fsp.mkdir(root, { recursive: true });
    await shell.openPath(root);
    return root;
  });
}

module.exports = { register, readConfig, defaultRoot };
