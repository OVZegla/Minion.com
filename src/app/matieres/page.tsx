'use client';

import { useMemo, useState } from 'react';
import { Layers, Plus } from 'lucide-react';
import { EmptyState, PageHeader, Segmented } from '@/components/ui';
import { SubjectCard } from '@/features/subjects/SubjectCard';
import {
  useEvents,
  useExams,
  useProgressBySubject,
  useSubjectCounters,
  useSubjects,
} from '@/hooks/data';
import { useUi } from '@/components/layout/AppProviders';
import { nextUpcoming } from '@/features/calendar/helpers';
import { fmtDayShort, relativeCountdown } from '@/lib/dates';

export default function SubjectsPage() {
  const [scope, setScope] = useState<'active' | 'archived'>('active');
  const subjects = useSubjects(true);
  const counters = useSubjectCounters();
  const progress = useProgressBySubject();
  const events = useEvents();
  const exams = useExams();
  const { openQuickAdd } = useUi();

  const visible = useMemo(
    () => (subjects ?? []).filter((subject) => (scope === 'active' ? !subject.isArchived : subject.isArchived)),
    [subjects, scope],
  );

  const nextLineFor = (subjectId: string): string | undefined => {
    const subjectEvents = (events ?? []).filter((event) => event.subjectId === subjectId);
    const next = nextUpcoming(subjectEvents);
    const exam = (exams ?? []).find((item) => item.subjectId === subjectId);
    if (next) {
      return `Prochain cours : ${fmtDayShort(next.date)} à ${next.event.startTime}`;
    }
    if (exam) return `Examen ${relativeCountdown(exam.date)}`;
    return undefined;
  };

  return (
    <>
      <PageHeader
        title="Mes matières"
        subtitle={`${visible.length} matière${visible.length > 1 ? 's' : ''}`}
        actions={
          <>
            <Segmented
              ariaLabel="Filtrer les matières"
              value={scope}
              onChange={setScope}
              options={[
                { value: 'active', label: 'Actives' },
                { value: 'archived', label: 'Archivées' },
              ]}
            />
            <button type="button" className="btn-primary" onClick={() => openQuickAdd('subject')}>
              <Plus size={16} />
              Matière
            </button>
          </>
        }
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={<Layers size={20} />}
          title={scope === 'active' ? 'Aucune matière pour l’instant' : 'Aucune matière archivée'}
          description={
            scope === 'active'
              ? 'Crée ta première matière : tu pourras y ranger tes cours, tes fiches et tes examens.'
              : 'Les matières que tu archives apparaîtront ici sans être supprimées.'
          }
          action={
            scope === 'active' ? (
              <button type="button" className="btn-primary" onClick={() => openQuickAdd('subject')}>
                Ajouter une matière
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((subject) => {
            const counter = counters.get(subject.id);
            return (
              <SubjectCard
                key={subject.id}
                subject={subject}
                courses={counter?.courses ?? 0}
                sheets={counter?.sheets ?? 0}
                openTasks={counter?.openTasks ?? 0}
                percent={progress.get(subject.id)?.percent ?? 0}
                nextLine={nextLineFor(subject.id)}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
