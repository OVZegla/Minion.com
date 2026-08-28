'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FileText, Plus, Star } from 'lucide-react';
import { EmptyState, MasteryPill, PageHeader, SubjectBadge } from '@/components/ui';
import { useStudySheets, useSubjectMap, useSubjects } from '@/hooks/data';
import { useUi } from '@/components/layout/AppProviders';
import { foldCase } from '@/lib/text';

export default function SheetsPage() {
  const sheets = useStudySheets();
  const subjects = useSubjects();
  const subjectMap = useSubjectMap();
  const { openQuickAdd } = useUi();
  const [query, setQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  const filtered = useMemo(() => {
    const q = foldCase(query.trim());
    return (sheets ?? [])
      .filter((sheet) => (subjectFilter ? sheet.subjectId === subjectFilter : true))
      .filter((sheet) => (q ? foldCase(sheet.title).includes(q) : true));
  }, [sheets, query, subjectFilter]);

  return (
    <>
      <PageHeader
        title="Mes fiches"
        subtitle={`${filtered.length} fiche${filtered.length > 1 ? 's' : ''}`}
        actions={
          <button type="button" className="btn-primary" onClick={() => openQuickAdd('sheet')}>
            <Plus size={16} />
            Fiche
          </button>
        }
      >
        <div className="flex flex-wrap gap-2">
          <input
            className="field max-w-xs"
            placeholder="Rechercher une fiche…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Rechercher une fiche"
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
        </div>
      </PageHeader>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText size={20} />}
          title="Aucune fiche"
          description="Crée ta première fiche de révision : définitions, principes, articles, exemples."
          action={
            <button type="button" className="btn-primary" onClick={() => openQuickAdd('sheet')}>
              Créer une fiche
            </button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((sheet) => {
            const subject = subjectMap.get(sheet.subjectId);
            const filled = sheet.sections.filter((section) => section.content.trim()).length;
            return (
              <li key={sheet.id}>
                <Link
                  href={`/fiches/${sheet.id}`}
                  className="flex h-full flex-col rounded-2xl border border-line bg-surface p-4 transition hover:border-primary-line"
                >
                  <div className="flex items-start gap-2">
                    <h2 className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-ink">
                      {sheet.title}
                    </h2>
                    {sheet.favorite ? (
                      <Star size={15} className="shrink-0 fill-primary text-primary" />
                    ) : null}
                  </div>
                  {subject ? (
                    <div className="mt-2">
                      <SubjectBadge name={subject.shortName} color={subject.color} size="sm" />
                    </div>
                  ) : null}
                  <p className="mt-2 text-[12px] text-muted">
                    {filled}/{sheet.sections.length} sections remplies
                  </p>
                  <div className="mt-auto pt-3">
                    <MasteryPill level={sheet.mastery} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
