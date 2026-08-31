'use client';

import { useEffect, useState } from 'react';
import { db } from '@/db/db';
import { Modal } from '@/components/ui/Modal';
import { SubjectSelect } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/Toast';
import { useCourses } from '@/hooks/data';
import { documentFolder, safeFileName } from '@/lib/library';
import { refileDocument } from './filing';
import type { DocumentItem } from '@/types';

/**
 * Change la matière et le cours d'un document, puis déplace réellement le
 * fichier dans le dossier correspondant. Le chemin est annoncé avant validation.
 */
export function FileDocumentModal({
  document,
  open,
  onClose,
}: {
  document: DocumentItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const courses = useCourses(subjectId);

  useEffect(() => {
    if (!document || !open) return;
    setSubjectId(document.subjectId ?? null);
    setCourseId(document.courseId ?? null);
  }, [document, open]);

  if (!document) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Classer ce document"
      description={document.name}
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose} disabled={busy}>
            Annuler
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await db.documents.update(document.id, { subjectId, courseId });
                const result = await refileDocument(document.id);
                toast(result?.path ? `Rangé dans ${result.folder}` : 'Document mis à jour');
                onClose();
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Déplacement…' : 'Classer'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <SubjectSelect
          value={subjectId}
          onChange={(value) => {
            setSubjectId(value);
            setCourseId(null);
          }}
        />

        {(courses ?? []).length > 0 ? (
          <div>
            <label className="label" htmlFor="fd-course">
              Cours
            </label>
            <select
              id="fd-course"
              className="field"
              value={courseId ?? ''}
              onChange={(event) => setCourseId(event.target.value || null)}
            >
              <option value="">Aucun cours</option>
              {(courses ?? []).map((course) => (
                <option key={course.id} value={course.id}>
                  {String(course.number).padStart(2, '0')} — {course.title}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">
              C’est le cours qui détermine le chapitre du dossier.
            </p>
          </div>
        ) : null}

        <FolderPreview
          document={document}
          subjectId={subjectId}
          courseId={courseId}
        />
      </div>
    </Modal>
  );
}

/** Montre le dossier de destination avant de déplacer quoi que ce soit. */
function FolderPreview({
  document,
  subjectId,
  courseId,
}: {
  document: DocumentItem;
  subjectId: string | null;
  courseId: string | null;
}) {
  const [folder, setFolder] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const course = courseId ? await db.courses.get(courseId) : null;
      const resolvedSubjectId = subjectId ?? course?.subjectId ?? null;
      const subject = resolvedSubjectId ? await db.subjects.get(resolvedSubjectId) : null;
      const chapter = course?.chapterId ? await db.chapters.get(course.chapterId) : null;
      const next = documentFolder({ ...document, subjectId, courseId }, { subject, course, chapter });
      if (!cancelled) setFolder(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [document, subjectId, courseId]);

  return (
    <div className="rounded-xl border border-line bg-surface2/60 px-3 py-2.5">
      <p className="text-[12px] font-medium text-muted">Destination sur ton ordinateur</p>
      <p className="mt-1 break-all font-mono text-[12px] text-accent">
        {folder}/{safeFileName(document.name)}
      </p>
    </div>
  );
}
