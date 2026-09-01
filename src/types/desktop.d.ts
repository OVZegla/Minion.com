/** Pont exposé par l'application de bureau (Electron), absent sur le web. */
interface MinionDesktopBridge {
  isDesktop: true;
  platform: string;
  exportPdf?: (payload: { relativeDir: string; fileName: string }) => Promise<unknown>;
}

interface Window {
  minionDesktop?: MinionDesktopBridge;
}
