'use client';

/**
 * Accès à l'application de bureau depuis la page.
 *
 * Sur le web, `window.minionDesktop` n'existe pas : toutes les fonctions
 * renvoient `null` et l'interface masque simplement les options concernées.
 */

export interface LibraryConfig {
  root: string;
  enabled: boolean;
  available: boolean;
}

interface LibraryBridge {
  config(): Promise<LibraryConfig>;
  setEnabled(enabled: boolean): Promise<LibraryConfig>;
  chooseRoot(): Promise<LibraryConfig>;
  save(payload: {
    relativeDir: string;
    fileName: string;
    bytes: ArrayBuffer;
  }): Promise<{ path: string; root: string } | null>;
  move(payload: {
    from: string;
    relativeDir: string;
    fileName: string;
  }): Promise<{ path: string; root: string } | null>;
  remove(path: string): Promise<boolean>;
  reveal(path: string): Promise<boolean>;
  openRoot(): Promise<string>;
}

interface PdfBridge {
  (payload: { relativeDir: string; fileName: string }): Promise<{ path: string; root: string } | null>;
}

function bridge(): LibraryBridge | null {
  if (typeof window === 'undefined') return null;
  const desktop = window.minionDesktop as unknown as { library?: LibraryBridge } | undefined;
  return desktop?.library ?? null;
}

/**
 * Enregistre la page en cours au format PDF dans les dossiers de
 * l'utilisatrice. Renvoie null sur le web : c'est alors la boîte d'impression
 * du navigateur qui prend le relais.
 */
export async function exportPdf(
  relativeDir: string,
  fileName: string,
): Promise<{ path: string; root: string } | null> {
  if (typeof window === 'undefined') return null;
  const api = (window.minionDesktop as unknown as { exportPdf?: PdfBridge } | undefined)?.exportPdf;
  if (!api) return null;
  return (await api({ relativeDir, fileName })) ?? null;
}

export function isDesktop(): boolean {
  return typeof window !== 'undefined' && window.minionDesktop?.isDesktop === true;
}

export async function getLibraryConfig(): Promise<LibraryConfig | null> {
  return (await bridge()?.config()) ?? null;
}

export async function setLibraryEnabled(enabled: boolean): Promise<LibraryConfig | null> {
  return (await bridge()?.setEnabled(enabled)) ?? null;
}

export async function chooseLibraryRoot(): Promise<LibraryConfig | null> {
  return (await bridge()?.chooseRoot()) ?? null;
}

export async function openLibraryRoot(): Promise<string | null> {
  return (await bridge()?.openRoot()) ?? null;
}

export async function revealLocalFile(path: string): Promise<boolean> {
  return (await bridge()?.reveal(path)) ?? false;
}

export async function removeLocalFile(path: string): Promise<boolean> {
  return (await bridge()?.remove(path)) ?? false;
}

export async function saveToLibrary(
  relativeDir: string,
  fileName: string,
  blob: Blob,
): Promise<string | null> {
  const api = bridge();
  if (!api) return null;
  const bytes = await blob.arrayBuffer();
  const result = await api.save({ relativeDir, fileName, bytes });
  return result?.path ?? null;
}

export async function moveInLibrary(
  from: string,
  relativeDir: string,
  fileName: string,
): Promise<string | null> {
  const api = bridge();
  if (!api) return null;
  const result = await api.move({ from, relativeDir, fileName });
  return result?.path ?? null;
}
