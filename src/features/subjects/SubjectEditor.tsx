'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/db/db';
import { deleteSubjectCascade } from '@/db/repo';
import { nowISO } from '@/lib/dates';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { ColorPicker } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/Toast';
import type { Subject, SubjectColorKey } from '@/types';

export function SubjectEditor({
  subject,
  open,
  onClose,
}: {
  subject: Subject;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(subject.name);
  const [shortName, setShortName] = useState(subject.shortName);
  const [color, setColor] = useState<SubjectColorKey>(subject.color);
  const [teacher, setTeacher] = useState(subject.teacher ?? '');
  const [room, setRoom] = useState(subject.room ?? '');
  const [description, setDescription] = useState(subject.description ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(subject.name);
    setShortName(subject.shortName);
    setColor(subject.color);
    setTeacher(subject.teacher ?? '');
    setRoom(subject.room ?? '');
    setDescription(subject.description ?? '');
  }, [open, subject]);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Modifier la matière"
        footer={
          <>
            <button
              type="button"
              className="btn-danger mr-auto"
              onClick={() => setConfirmDelete(true)}
            >
              Supprimer
            </button>
            <button type="button" className="btn-outline" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" form="subject-form" className="btn-primary">
              Enregistrer
            </button>
          </>
        }
      >
        <form
          id="subject-form"
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            await db.subjects.update(subject.id, {
              name: name.trim() || subject.name,
              shortName: shortName.trim() || subject.shortName,
              color,
              teacher: teacher.trim() || undefined,
              room: room.trim() || undefined,
              description: description.trim() || undefined,
              updatedAt: nowISO(),
            });
            toast('Matière mise à jour');
            onClose();
          }}
        >
          <div>
            <label className="label" htmlFor="se-name">
              Nom
            </label>
            <input
              id="se-name"
              className="field"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="se-short">
              Nom court
            </label>
            <input
              id="se-short"
              className="field"
              value={shortName}
              onChange={(event) => setShortName(event.target.value)}
            />
          </div>
          <ColorPicker value={color} onChange={setColor} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="se-teacher">
                Enseignant
              </label>
              <input
                id="se-teacher"
                className="field"
                value={teacher}
                onChange={(event) => setTeacher(event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="se-room">
                Salle habituelle
              </label>
              <input
                id="se-room"
                className="field"
                value={room}
                onChange={(event) => setRoom(event.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="se-desc">
              Description
            </label>
            <textarea
              id="se-desc"
              className="field min-h-[80px]"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-line p-3 text-sm text-ink">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[color:var(--primary)]"
              checked={subject.isArchived}
              onChange={async (event) => {
                await db.subjects.update(subject.id, {
                  isArchived: event.target.checked,
                  updatedAt: nowISO(),
                });
                toast(event.target.checked ? 'Matière archivée' : 'Matière réactivée');
              }}
            />
            Archiver cette matière (elle reste consultable)
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Supprimer « ${subject.name} » ?`}
        message="Les chapitres, cours, fiches, examens et révisions de cette matière seront supprimés. Les tâches, documents et événements seront conservés mais détachés."
        confirmLabel="Supprimer la matière"
        onConfirm={async () => {
          await deleteSubjectCascade(subject.id);
          toast('Matière supprimée');
          onClose();
          router.push('/matieres');
        }}
      />
    </>
  );
}
