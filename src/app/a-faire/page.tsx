'use client';

import { useMemo, useState } from 'react';
import { ListTodo, Plus } from 'lucide-react';
import { EmptyState, PageHeader, Segmented } from '@/components/ui';
import { TaskCard } from '@/features/tasks/TaskCard';
import { TaskDetail } from '@/features/tasks/TaskDetail';
import { useSubjectMap, useSubjects, useTasks } from '@/hooks/data';
import { toggleTask } from '@/db/repo';
import { useUi } from '@/components/layout/AppProviders';
import { daysUntil, relativeDayLabel, todayISO, weekEnd } from '@/lib/dates';
import type { Task } from '@/types';

type Filter = 'today' | 'week' | 'upcoming' | 'late' | 'done';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: 'Cette semaine' },
  { value: 'upcoming', label: 'À venir' },
  { value: 'late', label: 'En retard' },
  { value: 'done', label: 'Terminées' },
];

export default function TasksPage() {
  const tasks = useTasks();
  const subjects = useSubjects();
  const subjectMap = useSubjectMap();
  const { openQuickAdd } = useUi();
  const [filter, setFilter] = useState<Filter>('today');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [editing, setEditing] = useState<Task | null>(null);

  const today = todayISO();
  const endOfWeek = weekEnd(new Date());

  const filtered = useMemo(() => {
    const list = (tasks ?? []).filter((task) =>
      subjectFilter ? task.subjectId === subjectFilter : true,
    );
    switch (filter) {
      case 'done':
        return list.filter((task) => task.status === 'done');
      case 'late':
        return list.filter(
          (task) => task.status !== 'done' && task.dueDate && daysUntil(task.dueDate) < 0,
        );
      case 'today':
        return list.filter(
          (task) => task.status !== 'done' && task.dueDate && task.dueDate <= today,
        );
      case 'week':
        return list.filter(
          (task) =>
            task.status !== 'done' &&
            task.dueDate &&
            new Date(`${task.dueDate}T12:00`) <= endOfWeek,
        );
      case 'upcoming':
      default:
        return list.filter((task) => task.status !== 'done');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, filter, subjectFilter, today]);

  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of filtered) {
      const key = task.dueDate ? relativeDayLabel(task.dueDate) : 'Sans date';
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    return map;
  }, [filtered]);

  const counts = useMemo(() => {
    const open = (tasks ?? []).filter((task) => task.status !== 'done');
    return {
      late: open.filter((task) => task.dueDate && daysUntil(task.dueDate) < 0).length,
      today: open.filter((task) => task.dueDate && task.dueDate === today).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, today]);

  return (
    <>
      <PageHeader
        title="À faire"
        subtitle={
          counts.late > 0
            ? `${counts.late} tâche${counts.late > 1 ? 's' : ''} en retard`
            : counts.today > 0
              ? `${counts.today} tâche${counts.today > 1 ? 's' : ''} pour aujourd’hui`
              : 'Tu peux souffler, rien d’urgent.'
        }
        actions={
          <button type="button" className="btn-primary" onClick={() => openQuickAdd('task')}>
            <Plus size={16} />
            Tâche
          </button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <Segmented ariaLabel="Filtrer les tâches" value={filter} onChange={setFilter} options={FILTERS} />
          </div>
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
          icon={<ListTodo size={20} />}
          title={filter === 'done' ? 'Aucune tâche terminée' : 'Tout est terminé pour aujourd’hui 🎉'}
          description={
            filter === 'done'
              ? 'Les tâches que tu coches apparaîtront ici.'
              : 'Rien à faire dans ce filtre. Profites-en pour avancer tes révisions.'
          }
          action={
            <button type="button" className="btn-primary" onClick={() => openQuickAdd('task')}>
              Ajouter une tâche
            </button>
          }
        />
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([label, list]) => (
            <section key={label}>
              <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">
                {label}
              </h2>
              <ul className="space-y-2">
                {list.map((task) => (
                  <li key={task.id}>
                    <TaskCard
                      task={task}
                      subject={task.subjectId ? subjectMap.get(task.subjectId) : undefined}
                      onToggle={() => void toggleTask(task.id)}
                      onOpen={() => setEditing(task)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <TaskDetail task={editing} open={Boolean(editing)} onClose={() => setEditing(null)} />
    </>
  );
}
