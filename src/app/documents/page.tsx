'use client';

import { useMemo, useState } from 'react';
import {
  File,
  FileText,
  FolderInput,
  FolderOpen,
  Image as ImageIcon,
  Link2,
  Presentation,
  Star,
  Trash2,
} from 'lucide-react';
import { db } from '@/db/db';
import { EmptyState, PageHeader, Segmented, SubjectBadge } from '@/components/ui';
import { DropZone } from '@/features/documents/DropZone';
import { FileDocumentModal } from '@/features/documents/FileDocumentModal';
import { deleteDocumentEverywhere, refileDocument } from '@/features/documents/filing';
import { isDesktop, revealLocalFile } from '@/lib/desktop';
import { useDocuments, useSubjectMap, useSubjects } from '@/hooks/data';
import { useToast } from '@/components/ui/Toast';
import { formatBytes, foldCase } from '@/lib/text';
import { fmtDayShort } from '@/lib/dates';
import type { DocKind, DocumentItem } from '@/types';

const KIND_ICON: Record<DocKind, typeof File> = {
  pdf: FileText,
  word: FileText,
  ppt: Presentation,
  image: ImageIcon,
  link: Link2,
  autre: File,
};

const KIND_LABEL: Record<DocKind, string> = {
  pdf: 'PDF',
  word: 'Word',
  ppt: 'PowerPoint',
  image: 'Image',
  link: 'Lien',
  autre: 'Autre',
};

type View = 'tous' | 'recents' | 'favoris' | 'matiere';

export default function DocumentsPage() {
  const documents = useDocuments();
  const subjects = useSubjects();
  const subjectMap = useSubjectMap();
  const { toast, toastUndo } = useToast();
  const [view, setView] = useState<View>('tous');
  const [query, setQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [filing, setFiling] = useState<DocumentItem | null>(null);
  const desktop = isDesktop();

  const filtered = useMemo(() => {
    const q = foldCase(query.trim());
    let list = documents ?? [];
    if (view === 'favoris') list = list.filter((doc) => doc.favorite);
    if (view === 'recents') list = list.slice(0, 12);
    if (view === 'matiere' && subjectFilter) list = list.filter((doc) => doc.subjectId === subjectFilter);
    if (q) list = list.filter((doc) => foldCase(doc.name).includes(q));
    return list;
  }, [documents, view, query, subjectFilter]);

  const open = (doc: DocumentItem) => {
    if (doc.kind === 'link' && doc.url) {
      window.open(doc.url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!doc.blob) {
      toast('Ce document n’a pas de fichier associé');
      return;
    }
    const url = URL.createObjectURL(doc.blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <>
      <PageHeader title="Documents" subtitle={`${(documents ?? []).length} documents`}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <Segmented
              ariaLabel="Filtrer les documents"
              value={view}
              onChange={setView}
              options={[
                { value: 'tous', label: 'Tous' },
                { value: 'recents', label: 'Récents' },
                { value: 'favoris', label: 'Favoris' },
                { value: 'matiere', label: 'Par matière' },
              ]}
            />
          </div>
          <input
            className="field max-w-xs"
            placeholder="Rechercher un document…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Rechercher un document"
          />
          {view === 'matiere' ? (
            <select
              className="field max-w-[220px]"
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
              aria-label="Choisir une matière"
            >
              <option value="">Toutes les matières</option>
              {(subjects ?? []).map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </PageHeader>

      <div className="mb-6">
        <DropZone subjectId={view === 'matiere' ? subjectFilter || null : null} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={20} />}
          title="Aucun document"
          description="Dépose un PDF, une image ou ajoute un lien : tu le retrouveras depuis la matière concernée."
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((doc) => {
            const Icon = KIND_ICON[doc.kind];
            const subject = doc.subjectId ? subjectMap.get(doc.subjectId) : undefined;
            return (
              <li
                key={doc.id}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface2 text-muted">
                  <Icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <DocumentName document={doc} />
                  <button
                    type="button"
                    onClick={() => open(doc)}
                    className="block w-full text-left"
                  >
                  <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                    <span>{KIND_LABEL[doc.kind]}</span>
                    {doc.kind !== 'link' ? <span>{formatBytes(doc.size)}</span> : null}
                    <span>{fmtDayShort(doc.createdAt.slice(0, 10))}</span>
                    {subject ? (
                      <SubjectBadge name={subject.shortName} color={subject.color} size="sm" />
                    ) : null}
                  </span>
                  {doc.localPath ? (
                    <span className="mt-1 block truncate text-[11px] text-accent" title={doc.localPath}>
                      {doc.localPath}
                    </span>
                  ) : null}
                  </button>
                </div>
                {doc.kind !== 'link' ? (
                  <>
                    <button
                      type="button"
                      className="btn-ghost h-9 w-9 shrink-0 rounded-xl p-0"
                      aria-label={`Classer ${doc.name}`}
                      title="Classer dans une matière / un cours"
                      onClick={() => setFiling(doc)}
                    >
                      <FolderInput size={16} />
                    </button>
                    {desktop && doc.localPath ? (
                      <button
                        type="button"
                        className="btn-ghost h-9 w-9 shrink-0 rounded-xl p-0"
                        aria-label={`Ouvrir l’emplacement de ${doc.name}`}
                        title="Ouvrir l’emplacement du fichier"
                        onClick={async () => {
                          const ok = await revealLocalFile(doc.localPath!);
                          if (!ok) toast('Fichier introuvable sur le disque');
                        }}
                      >
                        <FolderOpen size={16} />
                      </button>
                    ) : null}
                  </>
                ) : null}
                <button
                  type="button"
                  className="btn-ghost h-9 w-9 shrink-0 rounded-xl p-0"
                  aria-label={doc.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  onClick={async () => {
                    await db.documents.update(doc.id, { favorite: !doc.favorite });
                  }}
                >
                  <Star size={16} className={doc.favorite ? 'fill-primary text-primary' : ''} />
                </button>
                <button
                  type="button"
                  className="btn-ghost h-9 w-9 shrink-0 rounded-xl p-0"
                  aria-label={`Supprimer ${doc.name}`}
                  onClick={async () => {
                    const snapshot = doc;
                    await deleteDocumentEverywhere(doc.id);
                    toastUndo('Document supprimé', async () => {
                      // Le fichier est réécrit sur le disque à l'annulation.
                      await db.documents.put({ ...snapshot, localPath: null });
                      await refileDocument(snapshot.id);
                    });
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <FileDocumentModal
        document={filing}
        open={Boolean(filing)}
        onClose={() => setFiling(null)}
      />
    </>
  );
}

/**
 * Nom du document, modifiable sur place.
 *
 * Le nom sert aussi de nom de fichier sur le disque : on ne renomme donc
 * qu'une fois la saisie terminée, et on demande au classement de déplacer
 * le fichier existant vers son nouveau nom.
 */
function DocumentName({ document }: { document: DocumentItem }) {
  const [name, setName] = useState(document.name);
  const [editingId, setEditingId] = useState(document.id);

  if (editingId !== document.id) {
    setEditingId(document.id);
    setName(document.name);
  }

  const commit = async () => {
    const next = name.trim();
    if (!next || next === document.name) {
      setName(document.name);
      return;
    }
    await db.documents.update(document.id, { name: next });
    await refileDocument(document.id);
  };

  return (
    <input
      className="w-full truncate bg-transparent text-[14px] font-medium text-ink outline-none"
      value={name}
      aria-label={`Nom du document : ${document.name}`}
      onChange={(event) => setName(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
          setName(document.name);
          event.currentTarget.blur();
        }
      }}
    />
  );
}
