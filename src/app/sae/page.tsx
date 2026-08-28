'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { Library, Plus, Users } from 'lucide-react';
import { db } from '@/db/db';
import { EmptyState, PageHeader, ProgressBar, StatusBadge, SubjectBadge } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { useSAEs, useSubjectMap, useSubjects, useSemesters } from '@/hooks/data';
import { useToast } from '@/components/ui/Toast';
import { newId } from '@/lib/id';
import { nowISO, relativeCountdown, fmtDayShort } from '@/lib/dates';
import { SAE_STATUS_LABEL, SAE_STATUS_TONE as STATUS_TONE } from '@/features/sae/constants';


export default function SAEPage() {
  const saes = useSAEs();
  const subjects = useSubjects();
  const subjectMap = useSubjectMap();
  const semesters = useSemesters();
  const saeTasks = useLiveQuery(() => db.saeTasks.toArray(), []);
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [subjectIds, setSubjectIds] = useState<string[]>([]);

  const progressBySae = useMemo(() => {
    const map = new Map<string, { done: number; total: number; percent: number }>();
    for (const task of saeTasks ?? []) {
      const entry = map.get(task.saeId) ?? { done: 0, total: 0, percent: 0 };
      entry.total += 1;
      if (task.status === 'done') entry.done += 1;
      map.set(task.saeId, entry);
    }
    for (const [key, value] of map) {
      value.percent = value.total ? Math.round((value.done / value.total) * 100) : 0;
      map.set(key, value);
    }
    return map;
  }, [saeTasks]);

  return (
    <>
      <PageHeader
        title="SAÉ"
        subtitle="Situations d’apprentissage et d’évaluation"
        actions={
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            <Plus size={16} />
            SAÉ
          </button>
        }
      />

      {(saes ?? []).length === 0 ? (
        <EmptyState
          icon={<Library size={20} />}
          title="Aucune SAÉ pour l’instant"
          description="Ajoute une SAÉ pour suivre son avancement, son groupe et ses échéances."
          action={
            <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
              Ajouter une SAÉ
            </button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {(saes ?? []).map((sae) => {
            const progress = progressBySae.get(sae.id) ?? { done: 0, total: 0, percent: 0 };
            return (
              <li key={sae.id}>
                <Link
                  href={`/sae/${sae.id}`}
                  className="flex h-full flex-col rounded-2xl border border-line bg-surface p-4 transition hover:border-primary-line"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[13px] font-bold tracking-tight text-accent">{sae.code}</span>
                    <StatusBadge tone={STATUS_TONE[sae.status]}>
                      {SAE_STATUS_LABEL[sae.status]}
                    </StatusBadge>
                  </div>
                  <h2 className="mt-2 text-[14px] font-semibold leading-snug text-ink">{sae.title}</h2>
                  {sae.dueDate ? (
                    <p className="mt-1.5 text-[12px] text-muted">
                      À rendre {relativeCountdown(sae.dueDate)} · {fmtDayShort(sae.dueDate)}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {sae.subjectIds.slice(0, 3).map((subjectId) => {
                      const subject = subjectMap.get(subjectId);
                      if (!subject) return null;
                      return (
                        <SubjectBadge
                          key={subjectId}
                          name={subject.shortName}
                          color={subject.color}
                          size="sm"
                        />
                      );
                    })}
                  </div>
                  {sae.members.length > 0 ? (
                    <p className="mt-2 inline-flex items-center gap-1 text-[12px] text-muted">
                      <Users size={12} />
                      {sae.members.map((member) => member.firstName).join(', ')}
                    </p>
                  ) : null}
                  <div className="mt-auto pt-3">
                    <ProgressBar value={progress.percent} size="sm" label={`Avancement ${sae.code}`} />
                    <p className="mt-1 text-[11px] text-muted">
                      {progress.done}/{progress.total} tâches terminées
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Nouvelle SAÉ"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setCreating(false)}>
              Annuler
            </button>
            <button type="submit" form="sae-form" className="btn-primary">
              Créer
            </button>
          </>
        }
      >
        <form
          id="sae-form"
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!title.trim()) return;
            await db.saes.put({
              id: newId('sae'),
              semesterId: (semesters ?? [])[0]?.id ?? '',
              code: code.trim() || 'SAÉ',
              title: title.trim(),
              startDate: null,
              dueDate: dueDate || null,
              status: 'upcoming',
              subjectIds,
              members: [],
              createdAt: nowISO(),
              updatedAt: nowISO(),
            });
            toast('SAÉ créée');
            setCreating(false);
            setCode('');
            setTitle('');
            setDueDate('');
            setSubjectIds([]);
          }}
        >
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label" htmlFor="sae-code">
                Code
              </label>
              <input
                id="sae-code"
                className="field"
                placeholder="SAÉ 1.05"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="label" htmlFor="sae-due">
                Date de rendu
              </label>
              <input
                id="sae-due"
                type="date"
                className="field"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="sae-title">
              Intitulé
            </label>
            <textarea
              id="sae-title"
              className="field min-h-[70px]"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>
          <fieldset>
            <legend className="label">Matières liées</legend>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-line p-3">
              {(subjects ?? []).map((subject) => (
                <label key={subject.id} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[color:var(--primary)]"
                    checked={subjectIds.includes(subject.id)}
                    onChange={(event) =>
                      setSubjectIds((current) =>
                        event.target.checked
                          ? [...current, subject.id]
                          : current.filter((id) => id !== subject.id),
                      )
                    }
                  />
                  {subject.name}
                </label>
              ))}
            </div>
          </fieldset>
        </form>
      </Modal>
    </>
  );
}
