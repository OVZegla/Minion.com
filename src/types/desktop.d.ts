/** Pont exposé par l'application de bureau (Electron), absent sur le web. */
interface MinionDesktopBridge {
  isDesktop: true;
  platform: string;
}

interface Window {
  minionDesktop?: MinionDesktopBridge;
}
