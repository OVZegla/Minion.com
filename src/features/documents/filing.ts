import { db } from '@/db/db';
import { documentFolder, isFilable, safeFileName } from '@/lib/library';
import {
  isDesktop,
  moveInLibrary,
  removeLocalFile,
  saveToLibrary,
  type LibraryConfig,
} from '@/lib/desktop';
import type { DocumentItem } from '@/types';

/**
 * Écrit (ou déplace) le fichier d'un document dans les dossiers de
 * l'ordinateur, selon la règle décrite dans lib/library.ts.
 *
 * Sur le web, ces fonctions ne font rien : le document reste stocké
 * uniquement dans la base locale du navigateur.
 */

/** Reconstitue le contexte matière / cours / chapitre d'un document. */
export async function folderFor(document: DocumentItem): Promise<string> {
  const course = document.courseId ? await db.courses.get(document.courseId) : null;
  const subjectId = document.subjectId ?? course?.subjectId ?? null;
  const subject = subjectId ? await db.subjects.get(subjectId) : null;
  const chapterId = course?.chapterId ?? null;
  const chapter = chapterId ? await db.chapters.get(chapterId) : null;
  return documentFolder(document, { subject, course, chapter });
}

export interface FilingResult {
  path: string | null;
  folder: string;
}

/** Classe un document qui vient d'être ajouté. */
export async function fileDocument(documentId: string): Promise<FilingResult | null> {
  if (!isDesktop()) return null;
  const document = await db.documents.get(documentId);
  if (!document || !isFilable(document) || !document.blob) return null;

  const folder = await folderFor(document);
  const path = await saveToLibrary(folder, safeFileName(document.name), document.blob);
  if (path) await db.documents.update(documentId, { localPath: path });
  return { path, folder };
}

/**
 * Remet un document à sa place après un changement de matière ou de cours.
 * Déplace le fichier existant, ou l'écrit s'il n'était pas encore sur disque.
 */
export async function refileDocument(documentId: string): Promise<FilingResult | null> {
  if (!isDesktop()) return null;
  const document = await db.documents.get(documentId);
  if (!document || !isFilable(document)) return null;

  const folder = await folderFor(document);
  const fileName = safeFileName(document.name);

  // On déplace le fichier existant. S'il a disparu du disque (dossier vidé,
  // fichier supprimé ou déplacé à la main), on le réécrit depuis le contenu
  // conservé dans l'application plutôt que de laisser le document sans fichier.
  let path = document.localPath
    ? await moveInLibrary(document.localPath, folder, fileName)
    : null;
  if (!path && document.blob) path = await saveToLibrary(folder, fileName, document.blob);

  if (path) await db.documents.update(documentId, { localPath: path });
  else if (document.localPath) await db.documents.update(documentId, { localPath: null });
  return { path, folder };
}

export interface RefileSummary {
  filed: number;
  skipped: number;
}

/** Reclasse toute la bibliothèque (utile après un changement de dossier). */
export async function refileAll(): Promise<RefileSummary> {
  const documents = await db.documents.toArray();
  let filed = 0;
  let skipped = 0;
  for (const document of documents) {
    if (!isFilable(document) || (!document.blob && !document.localPath)) {
      skipped += 1;
      continue;
    }
    const result = await refileDocument(document.id);
    if (result?.path) filed += 1;
    else skipped += 1;
  }
  return { filed, skipped };
}

/** Supprime aussi le fichier du disque quand le document est supprimé. */
export async function deleteDocumentEverywhere(documentId: string): Promise<void> {
  const document = await db.documents.get(documentId);
  if (document?.localPath) await removeLocalFile(document.localPath);
  await db.documents.delete(documentId);
}

export type { LibraryConfig };
