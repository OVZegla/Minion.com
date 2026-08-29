/**
 * Pont de préchargement.
 *
 * L'application web n'a besoin d'aucune API privilégiée : on expose seulement
 * un indicateur permettant d'adapter quelques détails d'interface. Aucune API
 * Node n'est accessible depuis la page (contextIsolation activé).
 */
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('minionDesktop', {
  isDesktop: true,
  platform: process.platform,
});
