'use client';

import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { db } from '@/db/db';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { DateField, PrioritySelect, SubjectSelect, TimeField } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/Toast';
import { newId } from '@/lib/id';
import { nowISO } from '@/lib/dates';
import { TASK_TYPE_LABEL } from './TaskCard';
import type { Priority, Task, TaskType } from '@/types';

export function TaskDetail({
  task,
  open,
  onClose,
}: {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast, toastUndo } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [dueTime, setDueTime] = useState<string | null>(null);
  const [priority, setPriority] = useState<Priority>('normal');
  const [type, setType] = useState<TaskType>('devoir');
  const [estimated, setEstimated] = useState('');
  const [subtasks, setSubtasks] = useState<Task['subtasks']>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!task || !open) return;
    setTitle(task.title);
    setDescription(task.description ?? '');
    setSubjectId(task.subjectId ?? null);
    setDueDate(task.dueDate ?? null);
    setDueTime(task.dueTime ?? null);
    setPriority(task.priority);
    setType(task.type);
    setEstimated(task.estimatedMinutes ? String(task.estimatedMinutes) : '');
    setSubtasks(task.subtasks);
    setNewSubtask('');
  }, [task, open]);

  if (!task) return null;

  const save = async () => {
    await db.tasks.update(task.id, {
      title: title.trim() || task.title,
      description: description.trim() || undefined,
      subjectId,
      dueDate,
      dueTime,
      priority,
      type,
      estimatedMinutes: estimated ? Number(estimated) : null,
      subtasks,
      updatedAt: nowISO(),
    });
    toast('Tâche mise à jour');
    onClose();
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Modifier la tâche"
        footer={
          <>
            <button type="button" className="btn-danger mr-auto" onClick={() => setConfirm(true)}>
              Supprimer
            </button>
            <button type="button" className="btn-outline" onClick={onClose}>
              Annuler
            </button>
            <button type="button" className="btn-primary" onClick={save}>
              Enregistrer
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="td-title">
              Titre
            </label>
            <input
              id="td-title"
              className="field"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <SubjectSelect value={subjectId} onChange={setSubjectId} />
          <div className="grid grid-cols-2 gap-3">
            <DateField value={dueDate} onChange={setDueDate} label="Date limite" withQuickChips={false} />
            <TimeField value={dueTime} onChange={setDueTime} label="Heure" />
          </div>
          <PrioritySelect value={priority} onChange={setPriority} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="td-type">
                Type
              </label>
              <select
                id="td-type"
                className="field"
                value={type}
                onChange={(event) => setType(event.target.value as TaskType)}
              >
                {(Object.keys(TASK_TYPE_LABEL) as TaskType[]).map((key) => (
                  <option key={key} value={key}>
                    {TASK_TYPE_LABEL[key]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="td-est">
                Temps estimé (min)
              </label>
              <input
                id="td-est"
                type="number"
                min={0}
                step={5}
                className="field"
                value={estimated}
                onChange={(event) => setEstimated(event.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="td-desc">
              Description
            </label>
            <textarea
              id="td-desc"
              className="field min-h-[80px]"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div>
            <span className="label">Sous-tâches</span>
            <ul className="space-y-1.5">
              {subtasks.map((item, index) => (
                <li key={item.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[color:var(--primary)]"
                    checked={item.done}
                    aria-label={`Terminé : ${item.text}`}
                    onChange={(event) => {
                      const copy = [...subtasks];
                      copy[index] = { ...item, done: event.target.checked };
                      setSubtasks(copy);
                    }}
                  />
                  <input
                    className="field flex-1 py-1.5"
                    value={item.text}
                    aria-label={`Sous-tâche ${index + 1}`}
                    onChange={(event) => {
                      const copy = [...subtasks];
                      copy[index] = { ...item, text: event.target.value };
                      setSubtasks(copy);
                    }}
                  />
                  <button
                    type="button"
                    className="btn-ghost h-8 w-8 rounded-lg p-0"
                    aria-label="Retirer la sous-tâche"
                    onClick={() => setSubtasks(subtasks.filter((sub) => sub.id !== item.id))}
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <input
                className="field flex-1 py-1.5"
                placeholder="Ajouter une sous-tâche"
                value={newSubtask}
                aria-label="Nouvelle sous-tâche"
                onChange={(event) => setNewSubtask(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && newSubtask.trim()) {
                    event.preventDefault();
                    setSubtasks([...subtasks, { id: newId('sub'), text: newSubtask.trim(), done: false }]);
                    setNewSubtask('');
                  }
                }}
              />
              <button
                type="button"
                className="btn-soft shrink-0"
                onClick={() => {
                  if (!newSubtask.trim()) return;
                  setSubtasks([...subtasks, { id: newId('sub'), text: newSubtask.trim(), done: false }]);
                  setNewSubtask('');
                }}
              >
                <Plus size={15} />
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Supprimer cette tâche ?"
        message="Tu pourras annuler juste après."
        onConfirm={async () => {
          const snapshot = task;
          await db.tasks.delete(task.id);
          onClose();
          toastUndo('Tâche supprimée', async () => {
            await db.tasks.put(snapshot);
          });
        }}
      />
    </>
  );
}
