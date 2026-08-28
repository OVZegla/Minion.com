'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Printer, Trash2, X } from 'lucide-react';
import { db } from '@/db/db';
import { useMethodDoc, useSubjects } from '@/hooks/data';
import { TEMPLATES, type TemplateField } from '@/features/legal-tools/templates';
import { EmptyState } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { SaveIndicatorLabel, useAutosave } from '@/hooks/useAutosave';
import { newId } from '@/lib/id';
import { nowISO } from '@/lib/dates';

export default function MethodDocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const doc = useMethodDoc(id);
  const subjects = useSubjects();

  const [title, setTitle] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [repeatable, setRepeatable] = useState<{ id: string; fields: Record<string, string> }[]>([]);
  const [ready, setReady] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!doc || ready) return;
    setTitle(doc.title);
    setFields(doc.fields ?? {});
    setRepeatable(doc.repeatable ?? []);
    setReady(true);
  }, [doc, ready]);

  const payload = useMemo(() => ({ title, fields, repeatable }), [title, fields, repeatable]);
  const saveState = useAutosave(
    payload,
    async (value) => {
      await db.methodDocs.update(id, {
        title: value.title.trim() || 'Sans titre',
        fields: value.fields,
        repeatable: value.repeatable,
        updatedAt: nowISO(),
      });
    },
    { enabled: ready },
  );

  if (doc === undefined) return null;
  if (!doc) {
    return (
      <EmptyState
        title="Document introuvable"
        action={
          <Link href="/methodes" className="btn-primary">
            Retour aux méthodes
          </Link>
        }
      />
    );
  }

  const template = TEMPLATES[doc.template];
  const saveLabel = SaveIndicatorLabel(saveState);

  const renderField = (
    field: TemplateField,
    value: string,
    onChange: (value: string) => void,
    keyPrefix: string,
  ) => (
    <div key={`${keyPrefix}-${field.key}`}>
      <label className="label" htmlFor={`${keyPrefix}-${field.key}`}>
        {field.label}
      </label>
      {field.multiline ? (
        <textarea
          id={`${keyPrefix}-${field.key}`}
          className="field min-h-[80px]"
          value={value}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={`${keyPrefix}-${field.key}`}
          className="field"
          value={value}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );

  return (
    <>
      <div className="no-print mb-4 flex items-center justify-between gap-2">
        <Link href="/methodes" className="btn-ghost -ml-2 text-[13px]">
          <ArrowLeft size={15} />
          Méthodes
        </Link>
        <div className="flex items-center gap-1">
          {saveLabel ? <span className="mr-1 text-[12px] text-muted">{saveLabel}</span> : null}
          <button
            type="button"
            className="btn-ghost h-9 w-9 rounded-xl p-0"
            aria-label="Imprimer"
            onClick={() => window.print()}
          >
            <Printer size={17} />
          </button>
          <button
            type="button"
            className="btn-ghost h-9 w-9 rounded-xl p-0"
            aria-label="Supprimer"
            onClick={() => setConfirm(true)}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      <header className="mb-6">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-accent">
          {template.name}
        </p>
        <input
          className="mt-1 w-full bg-transparent text-[26px] font-semibold tracking-tight text-ink outline-none sm:text-[30px]"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-label="Titre du document"
        />
        <p className="mt-1 text-[13px] text-muted">{template.description}</p>
        <select
          className="no-print mt-3 field max-w-sm"
          value={doc.subjectId ?? ''}
          aria-label="Matière liée"
          onChange={async (event) => {
            await db.methodDocs.update(id, {
              subjectId: event.target.value || null,
              updatedAt: nowISO(),
            });
          }}
        >
          <option value="">Aucune matière</option>
          {(subjects ?? []).map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </header>

      <div className="space-y-5">
        {template.header.length > 0 ? (
          <section className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2">
            {template.header.map((field) =>
              renderField(
                field,
                fields[field.key] ?? '',
                (value) => setFields((current) => ({ ...current, [field.key]: value })),
                'h',
              ),
            )}
          </section>
        ) : null}

        <section className="space-y-4 rounded-2xl border border-line bg-surface p-4">
          {template.body.map((field) =>
            renderField(
              field,
              fields[field.key] ?? '',
              (value) => setFields((current) => ({ ...current, [field.key]: value })),
              'b',
            ),
          )}
        </section>

        {template.repeatable ? (
          <section className="space-y-4">
            {repeatable.map((entry, index) => (
              <div key={entry.id} className="rounded-2xl border border-line bg-surface p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[14px] font-semibold text-ink">
                    {template.repeatable!.label} n° {index + 1}
                  </h2>
                  <button
                    type="button"
                    className="no-print btn-ghost h-8 w-8 rounded-lg p-0"
                    aria-label={`Supprimer le ${template.repeatable!.label.toLowerCase()} ${index + 1}`}
                    onClick={() => setRepeatable(repeatable.filter((item) => item.id !== entry.id))}
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="space-y-4">
                  {template.repeatable!.fields.map((field) =>
                    renderField(
                      field,
                      entry.fields[field.key] ?? '',
                      (value) =>
                        setRepeatable((current) =>
                          current.map((item) =>
                            item.id === entry.id
                              ? { ...item, fields: { ...item.fields, [field.key]: value } }
                              : item,
                          ),
                        ),
                      `r${index}`,
                    ),
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              className="no-print btn-soft w-full justify-center"
              onClick={() => setRepeatable([...repeatable, { id: newId('pb'), fields: {} }])}
            >
              <Plus size={16} />
              Ajouter un {template.repeatable.label.toLowerCase()}
            </button>
          </section>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Supprimer ce document ?"
        message="Cette action supprime la trame et son contenu."
        onConfirm={async () => {
          await db.methodDocs.delete(id);
          toast('Document supprimé');
          router.push('/methodes');
        }}
      />
    </>
  );
}
