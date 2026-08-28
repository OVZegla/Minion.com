'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Plus, Star } from 'lucide-react';
import { EmptyState, PageHeader, SubjectBadge } from '@/components/ui';
import { useCourses, useSubjectMap, useSubjects } from '@/hooks/data';
import { useUi } from '@/components/layout/AppProviders';
import { MASTERY_LABEL } from '@/lib/progress';
import { fmtDayShort } from '@/lib/dates';
import { foldCase } from '@/lib/text';

export default function CoursesPage() {
  const courses = useCourses();
  const subjects = useSubjects();
  const subjectMap = useSubjectMap();
  const { openQuickAdd } = useUi();
  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const [query, setQuery] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const filtered = useMemo(() => {
    const q = foldCase(query.trim());
    return (courses ?? [])
      .filter((course) => (subjectFilter ? course.subjectId === subjectFilter : true))
      .filter((course) => (onlyFavorites ? course.favorite : true))
      .filter((course) => (q ? foldCase(course.title).includes(q) : true))
      .sort((a, b) => {
        const subjectA = subjectMap.get(a.subjectId)?.name ?? '';
        const subjectB = subjectMap.get(b.subjectId)?.name ?? '';
        if (subjectA !== subjectB) return subjectA.localeCompare(subjectB, 'fr');
        return a.number - b.number;
      });
  }, [courses, subjectFilter, query, onlyFavorites, subjectMap]);

  return (
    <>
      <PageHeader
        title="Mes cours"
        subtitle={`${filtered.length} cours`}
        actions={
          <button type="button" className="btn-primary" onClick={() => openQuickAdd('course')}>
            <Plus size={16} />
            Cours
          </button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="field max-w-xs"
            placeholder="Rechercher un cours…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Rechercher un cours"
          />
          <select
            className="field max-w-[220px]"
            value={subjectFilter}
            onChange={(event) => setSubjectFilter(event.target.value)}
            aria-label="Filtrer par matière"
          >
            <option value="">Toutes les matières</option>
            {(subjects ?? []).map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-pressed={onlyFavorites}
            onClick={() => setOnlyFavorites((value) => !value)}
            className={
              onlyFavorites
                ? 'chip border-primary-line bg-primary-soft text-accent'
                : 'chip text-muted hover:bg-surface2'
            }
          >
            <Star size={13} />
            Favoris
          </button>
        </div>
      </PageHeader>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={20} />}
          title="Aucun cours"
          description="Crée un cours pour commencer à structurer tes notes."
          action={
            <button type="button" className="btn-primary" onClick={() => openQuickAdd('course')}>
              Créer un cours
            </button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((course) => {
            const subject = subjectMap.get(course.subjectId);
            return (
              <li key={course.id}>
                <Link
                  href={`/cours/${course.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 transition hover:border-primary-line"
                >
                  <span className="w-9 shrink-0 text-[12px] font-semibold tabular-nums text-muted">
                    {String(course.number).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-medium text-ink">{course.title}</span>
                      {course.favorite ? (
                        <Star size={13} className="shrink-0 fill-primary text-primary" />
                      ) : null}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                      {subject ? (
                        <SubjectBadge name={subject.shortName} color={subject.color} size="sm" />
                      ) : null}
                      <span>{course.kind}</span>
                      {course.date ? <span>{fmtDayShort(course.date)}</span> : null}
                    </span>
                  </span>
                  <span className="chip hidden shrink-0 text-muted sm:inline-flex">
                    {MASTERY_LABEL[course.mastery]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
