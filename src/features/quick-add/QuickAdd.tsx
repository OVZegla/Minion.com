'use client';

import { useEffect, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  CircleCheckBig,
  FileText,
  FolderOpen,
  GraduationCap,
  Layers,
  ListTodo,
  Scale,
  StickyNote,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useUi } from '@/components/layout/AppProviders';
import {
  CaseLawForm,
  CourseForm,
  DocumentForm,
  EventForm,
  ExamForm,
  InboxForm,
  RevisionForm,
  SheetForm,
  SubjectForm,
  TaskForm,
} from './forms';

type Kind =
  | 'task'
  | 'course'
  | 'event'
  | 'exam'
  | 'note'
  | 'document'
  | 'sheet'
  | 'revision'
  | 'caselaw'
  | 'subject';

const OPTIONS: { kind: Kind; label: string; icon: typeof ListTodo; hint: string }[] = [
  { kind: 'task', label: 'Tâche', icon: ListTodo, hint: 'Un devoir, une lecture…' },
  { kind: 'note', label: 'Note rapide', icon: StickyNote, hint: 'À classer plus tard' },
  { kind: 'event', label: 'Événement', icon: CalendarDays, hint: 'Cours, rendez-vous…' },
  { kind: 'exam', label: 'Examen', icon: GraduationCap, hint: 'Partiel, contrôle…' },
  { kind: 'course', label: 'Cours', icon: BookOpen, hint: 'Une séance de cours' },
  { kind: 'sheet', label: 'Fiche', icon: FileText, hint: 'Fiche de révision' },
  { kind: 'revision', label: 'Révision', icon: CircleCheckBig, hint: 'Session planifiée' },
  { kind: 'document', label: 'Document', icon: FolderOpen, hint: 'Fichier ou lien' },
  { kind: 'caselaw', label: 'Jurisprudence', icon: Scale, hint: 'Décision à retenir' },
  { kind: 'subject', label: 'Matière', icon: Layers, hint: 'Nouvelle matière' },
];

const TITLES: Record<Kind, string> = {
  task: 'Nouvelle tâche',
  course: 'Nouveau cours',
  event: 'Nouvel événement',
  exam: 'Nouvel examen',
  note: 'Note rapide',
  document: 'Nouveau document',
  sheet: 'Nouvelle fiche',
  revision: 'Session de révision',
  caselaw: 'Nouvelle décision',
  subject: 'Nouvelle matière',
};

export function QuickAdd() {
  const { quickAddOpen, closeQuickAdd, quickAddKind } = useUi();
  const [kind, setKind] = useState<Kind | null>(null);

  useEffect(() => {
    if (quickAddOpen) setKind((quickAddKind as Kind | null) ?? null);
  }, [quickAddOpen, quickAddKind]);

  const close = () => {
    closeQuickAdd();
    setKind(null);
  };

  const onDone = () => close();

  return (
    <Modal
      open={quickAddOpen}
      onClose={close}
      title={kind ? TITLES[kind] : 'Que veux-tu ajouter ?'}
      description={kind ? undefined : 'Choisis un type, le formulaire reste court.'}
      size={kind === 'event' || kind === 'exam' ? 'md' : 'md'}
    >
      {!kind ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {OPTIONS.map((option) => (
            <button
              key={option.kind}
              type="button"
              onClick={() => setKind(option.kind)}
              className="flex min-h-[92px] flex-col items-start gap-1.5 rounded-2xl border border-line bg-surface p-3 text-left transition hover:border-[color:var(--primary-line)] hover:bg-primary-soft"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-soft text-accent">
                <option.icon size={17} />
              </span>
              <span className="text-sm font-semibold text-ink">{option.label}</span>
              <span className="text-[11px] leading-tight text-muted">{option.hint}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setKind(null)}
            className="btn-ghost -ml-2 text-[13px]"
          >
            ← Changer de type
          </button>
          {kind === 'task' ? <TaskForm onDone={onDone} /> : null}
          {kind === 'course' ? <CourseForm onDone={onDone} /> : null}
          {kind === 'event' ? <EventForm onDone={onDone} /> : null}
          {kind === 'exam' ? <ExamForm onDone={onDone} /> : null}
          {kind === 'note' ? <InboxForm onDone={onDone} /> : null}
          {kind === 'document' ? <DocumentForm onDone={onDone} /> : null}
          {kind === 'sheet' ? <SheetForm onDone={onDone} /> : null}
          {kind === 'revision' ? <RevisionForm onDone={onDone} /> : null}
          {kind === 'caselaw' ? <CaseLawForm onDone={onDone} /> : null}
          {kind === 'subject' ? <SubjectForm onDone={onDone} /> : null}
        </div>
      )}
    </Modal>
  );
}
