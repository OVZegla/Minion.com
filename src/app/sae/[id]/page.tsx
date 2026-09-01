'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react';
import { db } from '@/db/db';
import { deleteSAECascade } from '@/db/repo';
import { useSAE, useSAETasks, useSubjectMap, useSubjects, useTasks } from '@/hooks/data';
import { EmptyState, PageHeader, ProgressBar, StatusBadge, SubjectBadge } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useAutosave } from '@/hooks/useAutosave';
import { SaveButton } from '@/components/ui/SaveButton';
import { newId } from '@/lib/id';
import { fmtDayFull, nowISO, relativeCountdown } from '@/lib/dates';
import { SAE_STATUS_LABEL } from '@/features/sae/constants';
import type { SAEStatus, SAETaskStatus } from '@/types';

const TASK_STATUS_LABEL: Record<SAETaskStatus, string> = {
  todo: 'À faire',
  doing: 'En cours',
  done: 'Terminée',
};

export default function SAEDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const sae = useSAE(id);
  const tasks = useSAETasks(id);
  const subjects = useSubjects();
  const subjectMap = useSubjectMap();
  const linkedTasks = useTasks();

  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [ready, setReady] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('');
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!sae || ready) return;
    setDescription(sae.description ?? '');
    setNotes(sae.notes ?? '');
    setReady(true);
  }, [sae, ready]);

  const payload = useMemo(() => ({ description, notes }), [description, notes]);
  const autosave = useAutosave(
    payload,
    async (value) => {
      await db.saes.update(id, {
        description: value.description,
        notes: value.notes,
        updatedAt: nowISO(),
      });
    },
    { enabled: ready },
  );

  if (sae === undefined) return null;
  if (!sae) {
    return (
      <EmptyState
        title="SAÉ introuvable"
        action={
          <Link href="/sae" className="btn-primary">
            Retour aux SAÉ
          </Link>
        }
      />
    );
  }

  const done = (tasks ?? []).filter((task) => task.status === 'done').length;
  const total = (tasks ?? []).length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const related = (linkedTasks ?? []).filter((task) => task.saeId === id);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href="/sae" className="btn-ghost -ml-2 text-[13px]">
          <ArrowLeft size={15} />
          SAÉ
        </Link>
        <div className="flex items-center gap-2">
          <SaveButton autosave={autosave} />
          <button
            type="button"
            className="btn-ghost h-9 w-9 rounded-xl p-0"
            aria-label="Supprimer la SAÉ"
            onClick={() => setConfirm(true)}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      <PageHeader title={sae.title} subtitle={sae.code}>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="field w-auto"
            value={sae.status}
            aria-label="Statut de la SAÉ"
            onChange={async (event) => {
              await db.saes.update(id, {
                status: event.target.value as SAEStatus,
                updatedAt: nowISO(),
              });
            }}
          >
            {(Object.keys(SAE_STATUS_LABEL) as SAEStatus[]).map((status) => (
              <option key={status} value={status}>
                {SAE_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
          <div>
            <label className="sr-only" htmlFor="sae-due-date">
              Date de rendu
            </label>
            <input
              id="sae-due-date"
              type="date"
              className="field w-auto"
              value={sae.dueDate ?? ''}
              onChange={async (event) => {
                await db.saes.update(id, {
                  dueDate: event.target.value || null,
                  updatedAt: nowISO(),
                });
              }}
            />
          </div>
          {sae.dueDate ? (
            <StatusBadge tone="primary">À rendre {relativeCountdown(sae.dueDate)}</StatusBadge>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sae.subjectIds.map((subjectId) => {
            const subject = subjectMap.get(subjectId);
            if (!subject) return null;
            return (
              <SubjectBadge
                key={subjectId}
                name={subject.shortName}
                color={subject.color}
                size="sm"
                href={`/matieres/${subject.id}`}
              />
            );
          })}
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-[15px] font-semibold text-ink">Ma description</h2>
            <textarea
              className="field min-h-[90px]"
              value={description}
              placeholder="Ce que tu dois produire, les consignes clés…"
              onChange={(event) => setDescription(event.target.value)}
              aria-label="Description de la SAÉ"
            />
          </section>

          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold text-ink">Tâches du projet</h2>
              <span className="text-[12px] text-muted">
                {done}/{total} terminées
              </span>
            </div>
            <div className="mb-3">
              <ProgressBar value={percent} label="Avancement du projet" />
            </div>
            <ul className="space-y-2">
              {(tasks ?? []).map((task) => (
                <li
                  key={task.id}
                  className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-2.5"
                >
                  <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{task.title}</span>
                  {task.assignee ? (
                    <span className="chip text-muted">{task.assignee}</span>
                  ) : null}
                  <select
                    className="field w-auto py-1 text-[13px]"
                    value={task.status}
                    aria-label={`Statut de ${task.title}`}
                    onChange={async (event) => {
                      await db.saeTasks.update(task.id, {
                        status: event.target.value as SAETaskStatus,
                      });
                    }}
                  >
                    {(Object.keys(TASK_STATUS_LABEL) as SAETaskStatus[]).map((status) => (
                      <option key={status} value={status}>
                        {TASK_STATUS_LABEL[status]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-ghost h-8 w-8 rounded-lg p-0"
                    aria-label={`Supprimer ${task.title}`}
                    onClick={async () => {
                      await db.saeTasks.delete(task.id);
                    }}
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="mt-2 flex gap-2"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!newTask.trim()) return;
                await db.saeTasks.put({
                  id: newId('sat'),
                  saeId: id,
                  title: newTask.trim(),
                  status: 'todo',
                  dueDate: null,
                  order: total,
                });
                setNewTask('');
              }}
            >
              <input
                className="field"
                placeholder="Ajouter une tâche de projet"
                value={newTask}
                onChange={(event) => setNewTask(event.target.value)}
                aria-label="Nouvelle tâche de projet"
              />
              <button type="submit" className="btn-soft shrink-0">
                <Plus size={16} />
              </button>
            </form>
          </section>

          <section>
            <h2 className="mb-2 text-[15px] font-semibold text-ink">Notes</h2>
            <textarea
              className="field min-h-[90px]"
              value={notes}
              placeholder="Comptes rendus de réunion, idées…"
              onChange={(event) => setNotes(event.target.value)}
              aria-label="Notes de la SAÉ"
            />
          </section>
        </div>

        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-[15px] font-semibold text-ink">Membres du groupe</h2>
            <ul className="space-y-2">
              {sae.members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-2.5"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-semibold text-accent">
                    {member.firstName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-ink">{member.firstName}</span>
                    {member.role ? (
                      <span className="block truncate text-[12px] text-muted">{member.role}</span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    className="btn-ghost h-8 w-8 rounded-lg p-0"
                    aria-label={`Retirer ${member.firstName}`}
                    onClick={async () => {
                      await db.saes.update(id, {
                        members: sae.members.filter((item) => item.id !== member.id),
                        updatedAt: nowISO(),
                      });
                    }}
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="mt-2 space-y-2"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!memberName.trim()) return;
                await db.saes.update(id, {
                  members: [
                    ...sae.members,
                    {
                      id: newId('mbr'),
                      firstName: memberName.trim(),
                      role: memberRole.trim() || undefined,
                    },
                  ],
                  updatedAt: nowISO(),
                });
                setMemberName('');
                setMemberRole('');
              }}
            >
              <div className="flex gap-2">
                <input
                  className="field"
                  placeholder="Prénom"
                  value={memberName}
                  onChange={(event) => setMemberName(event.target.value)}
                  aria-label="Prénom du membre"
                />
                <input
                  className="field"
                  placeholder="Rôle"
                  value={memberRole}
                  onChange={(event) => setMemberRole(event.target.value)}
                  aria-label="Rôle du membre"
                />
                <button type="submit" className="btn-soft shrink-0">
                  <Plus size={16} />
                </button>
              </div>
            </form>
          </section>

          {related.length > 0 ? (
            <section>
              <h2 className="mb-2 text-[15px] font-semibold text-ink">Tâches personnelles liées</h2>
              <ul className="space-y-1.5">
                {related.map((task) => (
                  <li key={task.id} className="text-[13px] text-ink">
                    {task.title}
                    {task.status === 'done' ? <span className="text-muted"> · terminée</span> : null}
                  </li>
                ))}
              </ul>
              <Link href="/a-faire" className="btn-ghost mt-1 -ml-2 text-[13px]">
                Ouvrir mes tâches
              </Link>
            </section>
          ) : null}

          {sae.startDate || sae.dueDate ? (
            <section className="rounded-2xl border border-line bg-surface p-4">
              <h2 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-muted">
                Échéances
              </h2>
              {sae.startDate ? (
                <p className="text-[13px] text-ink">Début : {fmtDayFull(sae.startDate)}</p>
              ) : null}
              {sae.dueDate ? (
                <p className="text-[13px] text-ink">Rendu : {fmtDayFull(sae.dueDate)}</p>
              ) : null}
            </section>
          ) : null}

          <p className="text-[12px] text-muted">
            Matières disponibles : {(subjects ?? []).length}. Tu peux modifier les matières liées
            depuis la fiche de chaque matière.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Supprimer cette SAÉ ?"
        message="Ses tâches de projet seront supprimées. Les documents et tâches personnelles seront conservés."
        onConfirm={async () => {
          await deleteSAECascade(id);
          toast('SAÉ supprimée');
          router.push('/sae');
        }}
      />
    </>
  );
}
