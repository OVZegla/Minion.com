/**
 * Pont de préchargement.
 *
 * La page n'obtient aucune API Node : uniquement des appels nommés, traités
 * dans le processus principal, qui décide seul de ce qu'il écrit sur le disque.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('minionDesktop', {
  isDesktop: true,
  platform: process.platform,

  /** Classement automatique des documents dans les fichiers de l'ordinateur. */
  library: {
    config: () => ipcRenderer.invoke('library:config'),
    setEnabled: (enabled) => ipcRenderer.invoke('library:setEnabled', enabled),
    chooseRoot: () => ipcRenderer.invoke('library:chooseRoot'),
    save: (payload) => ipcRenderer.invoke('library:save', payload),
    move: (payload) => ipcRenderer.invoke('library:move', payload),
    remove: (filePath) => ipcRenderer.invoke('library:remove', filePath),
    reveal: (filePath) => ipcRenderer.invoke('library:reveal', filePath),
    openRoot: () => ipcRenderer.invoke('library:openRoot'),
  },

  /** Enregistre la page en cours au format PDF dans les dossiers de l'utilisatrice. */
  exportPdf: (payload) => ipcRenderer.invoke('pdf:export', payload),
});
