'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookText, Plus, Trash2 } from 'lucide-react';
import { db } from '@/db/db';
import { EmptyState, PageHeader, SubjectBadge } from '@/components/ui';
import { TEMPLATE_LIST, TEMPLATES } from '@/features/legal-tools/templates';
import { useMethodDocs, useSubjectMap } from '@/hooks/data';
import { useToast } from '@/components/ui/Toast';
import { newId } from '@/lib/id';
import { nowISO, relativeDayLabel } from '@/lib/dates';
import type { MethodTemplate } from '@/types';

export default function MethodsPage() {
  const docs = useMethodDocs();
  const subjects = useSubjectMap();
  const router = useRouter();
  const { toast, toastUndo } = useToast();

  const create = async (template: MethodTemplate) => {
    const definition = TEMPLATES[template];
    const id = newId('mth');
    await db.methodDocs.put({
      id,
      template,
      title: definition.name,
      subjectId: null,
      courseId: null,
      fields: {},
      repeatable: definition.repeatable ? [{ id: newId('pb'), fields: {} }] : undefined,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    });
    toast(`${definition.name} créée`);
    router.push(`/methodes/${id}`);
  };

  return (
    <>
      <PageHeader
        title="Méthodes"
        subtitle="Des trames pour structurer tes devoirs. Aucun conseil juridique : uniquement de l’organisation."
      />

      <section className="mb-8">
        <h2 className="mb-3 text-[15px] font-semibold text-ink">Partir d’un modèle</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TEMPLATE_LIST.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => void create(template.id)}
              className="flex flex-col items-start rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-primary-line hover:bg-primary-soft"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-accent">
                <BookText size={17} />
              </span>
              <span className="mt-2.5 text-[14px] font-semibold text-ink">{template.name}</span>
              <span className="mt-1 text-[12px] leading-snug text-muted">{template.description}</span>
              <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-accent">
                <Plus size={13} />
                Créer
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[15px] font-semibold text-ink">Mes documents</h2>
        {(docs ?? []).length === 0 ? (
          <EmptyState
            icon={<BookText size={20} />}
            title="Aucun document de méthode"
            description="Choisis un modèle ci-dessus pour commencer une fiche d’arrêt ou un cas pratique."
          />
        ) : (
          <ul className="space-y-2">
            {(docs ?? []).map((doc) => {
              const subject = doc.subjectId ? subjects.get(doc.subjectId) : undefined;
              return (
                <li
                  key={doc.id}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
                >
                  <Link href={`/methodes/${doc.id}`} className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-ink">{doc.title}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                      <span>{TEMPLATES[doc.template].name}</span>
                      <span>{relativeDayLabel(doc.updatedAt.slice(0, 10))}</span>
                      {subject ? (
                        <SubjectBadge name={subject.shortName} color={subject.color} size="sm" />
                      ) : null}
                    </span>
                  </Link>
                  <button
                    type="button"
                    className="btn-ghost h-9 w-9 shrink-0 rounded-xl p-0"
                    aria-label={`Supprimer ${doc.title}`}
                    onClick={async () => {
                      const snapshot = doc;
                      await db.methodDocs.delete(doc.id);
                      toastUndo('Document supprimé', async () => {
                        await db.methodDocs.put(snapshot);
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
      </section>
    </>
  );
}
