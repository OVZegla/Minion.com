import { z } from 'zod';
import { db, TABLE_NAMES, type TableName } from './db';
import { clearAllData } from './repo';
import { nowISO } from '@/lib/dates';

/**
 * Sauvegarde locale : export / import JSON.
 *
 * Securite :
 *  - toutes les donnees importees passent par une validation Zod ;
 *  - les chaines sont assainies (caracteres de controle retires, longueur bornee) ;
 *  - aucun HTML n'est jamais interprete : l'application n'utilise nulle part
 *    dangerouslySetInnerHTML, tout est rendu comme du texte par React ;
 *  - les fichiers binaires sont re-encodes en Blob avec un type MIME verifie.
 */

export const BACKUP_VERSION = 1;
export const APP_NAME = 'minion.com';

const MAX_STRING = 200000;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

export const ALLOWED_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const TAB = 9;
const LF = 10;
const CR = 13;
const SPACE = 32;
const DEL = 127;

/** Retire les caracteres de controle (hors tabulation et sauts de ligne). */
function stripControlChars(value: string): string {
  let out = '';
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code === TAB || code === LF || code === CR) {
      out += char;
      continue;
    }
    if (code < SPACE || code === DEL) continue;
    out += char;
  }
  return out;
}

/** Assainit une chaine importee : caracteres de controle retires, longueur bornee. */
export function sanitizeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return stripControlChars(value).slice(0, MAX_STRING);
}

function deepSanitize<T>(value: T): T {
  if (typeof value === 'string') return sanitizeText(value) as unknown as T;
  if (Array.isArray(value)) return value.map(deepSanitize) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[sanitizeText(key)] = deepSanitize(val);
    }
    return out as unknown as T;
  }
  return value;
}

/* --------------------------- Schemas ------------------------------- */

const row = z.object({ id: z.string().min(1).max(120) }).catchall(z.unknown());

const settingsRow = z
  .object({
    id: z.literal('app'),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    program: z.string().max(200).optional(),
    yearLabel: z.string().max(80).optional(),
  })
  .catchall(z.unknown());

const fileEntry = z.object({
  id: z.string().min(1).max(120),
  mimeType: z.string().max(200),
  base64: z.string().max(Math.ceil(MAX_FILE_BYTES * 1.4)),
});

export const backupSchema = z.object({
  app: z.literal(APP_NAME),
  version: z.number().int().min(1).max(BACKUP_VERSION),
  exportedAt: z.string().max(40),
  tables: z.object({ settings: z.array(settingsRow).optional() }).catchall(z.array(row)),
  files: z.array(fileEntry).optional(),
});

export type BackupFile = z.infer<typeof backupSchema>;

export interface BackupSummary {
  counts: Record<string, number>;
  files: number;
  exportedAt: string;
  version: number;
}

/* ---------------------------- Export -------------------------------- */

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const safeMime = ALLOWED_MIME.includes(mimeType) ? mimeType : 'application/octet-stream';
  return new Blob([bytes], { type: safeMime });
}

export async function exportBackup(): Promise<BackupFile> {
  const tables: Record<string, unknown[]> = {};
  const files: { id: string; mimeType: string; base64: string }[] = [];
  const instance = db as unknown as Record<TableName, { toArray: () => Promise<unknown[]> }>;

  for (const name of TABLE_NAMES) {
    const rows = await instance[name].toArray();
    if (name === 'documents') {
      tables[name] = await Promise.all(
        (rows as { id: string; blob?: Blob; mimeType?: string }[]).map(async (doc) => {
          const { blob, ...rest } = doc;
          if (blob && blob.size <= MAX_FILE_BYTES) {
            files.push({
              id: doc.id,
              mimeType: blob.type || doc.mimeType || 'application/octet-stream',
              base64: await blobToBase64(blob),
            });
          }
          return rest;
        }),
      );
    } else {
      tables[name] = rows;
    }
  }

  return {
    app: APP_NAME,
    version: BACKUP_VERSION,
    exportedAt: nowISO(),
    tables: tables as BackupFile['tables'],
    files,
  };
}

export async function downloadBackup(): Promise<void> {
  const backup = await exportBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `minion-sauvegarde-${nowISO().replace(/[:T]/g, '-')}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/* ---------------------------- Import -------------------------------- */

export interface ParsedBackup {
  data: BackupFile;
  summary: BackupSummary;
}

/** Valide un JSON de sauvegarde SANS rien ecrire en base. */
export function parseBackup(raw: string): ParsedBackup {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error('Ce fichier n’est pas un JSON valide.');
  }

  const result = backupSchema.safeParse(json);
  if (!result.success) {
    throw new Error('Ce fichier n’est pas une sauvegarde minion.com valide.');
  }

  const data = result.data;
  for (const name of Object.keys(data.tables)) {
    if (!TABLE_NAMES.includes(name as TableName)) {
      delete (data.tables as Record<string, unknown>)[name];
    }
  }

  const counts: Record<string, number> = {};
  for (const [name, rows] of Object.entries(data.tables)) {
    counts[name] = Array.isArray(rows) ? rows.length : 0;
  }

  return {
    data,
    summary: {
      counts,
      files: data.files?.length ?? 0,
      exportedAt: data.exportedAt,
      version: data.version,
    },
  };
}

/** Remplace TOUTES les donnees locales par celles de la sauvegarde. */
export async function restoreBackup(parsed: ParsedBackup): Promise<void> {
  const { data } = parsed;
  const filesById = new Map((data.files ?? []).map((file) => [file.id, file]));

  await clearAllData();

  const instance = db as unknown as Record<
    TableName,
    { bulkPut: (rows: unknown[]) => Promise<unknown> }
  >;

  for (const name of TABLE_NAMES) {
    const rows = (data.tables as Record<string, unknown[]>)[name];
    if (!Array.isArray(rows) || rows.length === 0) continue;
    const clean = rows.map((r) => deepSanitize(r));

    if (name === 'documents') {
      const withBlobs = clean.map((doc) => {
        const record = doc as Record<string, unknown> & { id: string };
        const file = filesById.get(record.id);
        if (!file) return record;
        try {
          const blob = base64ToBlob(file.base64, file.mimeType);
          return { ...record, blob, size: blob.size };
        } catch {
          return record;
        }
      });
      await instance[name].bulkPut(withBlobs);
    } else {
      await instance[name].bulkPut(clean);
    }
  }
}
