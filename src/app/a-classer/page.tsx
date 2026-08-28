'use client';

import { useMemo, useState } from 'react';
import { Inbox, Plus, Trash2 } from 'lucide-react';
import { db } from '@/db/db';
import { EmptyState, PageHeader, Segmented, StatusBadge } from '@/components/ui';
import { FileItemModal } from '@/features/inbox/FileItemModal';
import { useInbox } from '@/hooks/data';
import { useToast } from '@/components/ui/Toast';
import { newId } from '@/lib/id';
import { nowISO, relativeDayLabel } from '@/lib/dates';
import type { InboxItem } from '@/types';

export default function InboxPage() {
  const items = useInbox();
  const { toast, toastUndo } = useToast();
  const [scope, setScope] = useState<'pending' | 'filed'>('pending');
  const [text, setText] = useState('');
  const [filing, setFiling] = useState<InboxItem | null>(null);

  const visible = useMemo(
    () => (items ?? []).filter((item) => (scope === 'pending' ? item.status === 'pending' : item.status !== 'pending')),
    [items, scope],
  );

  return (
    <>
      <PageHeader
        title="À classer"
        subtitle="Note vite maintenant, range plus tard."
        actions={
          <Segmented
            ariaLabel="Filtrer la boîte d’entrée"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'pending', label: 'À classer' },
              { value: 'filed', label: 'Classées' },
            ]}
          />
        }
      />

      <form
        className="mb-6 flex gap-2"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!text.trim()) return;
          await db.inbox.put({
            id: newId('inb'),
            text: text.trim(),
            status: 'pending',
            createdAt: nowISO(),
          });
          setText('');
          toast('Note ajoutée');
        }}
      >
        <input
          className="field"
          placeholder="Ex. Contrôle droit constitutionnel le 8 octobre"
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-label="Nouvelle note rapide"
        />
        <button type="submit" className="btn-primary shrink-0">
          <Plus size={16} />
          Noter
        </button>
      </form>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Inbox size={20} />}
          title={scope === 'pending' ? 'Rien à classer 🎉' : 'Aucune note classée'}
          description={
            scope === 'pending'
              ? 'Tout est rangé. Note ici ce qui te passe par la tête pendant les cours.'
              : 'Les notes que tu transformes en tâche, examen ou cours apparaîtront ici.'
          }
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[14px] text-ink">{item.text}</p>
                <p className="mt-0.5 text-[12px] text-muted">
                  {relativeDayLabel(item.createdAt.slice(0, 10))}
                  {item.filedAs ? ` · classée en ${item.filedAs}` : ''}
                </p>
              </div>
              {item.status === 'pending' ? (
                <button type="button" className="btn-soft text-[13px]" onClick={() => setFiling(item)}>
                  Classer
                </button>
              ) : (
                <StatusBadge tone="success">Classée</StatusBadge>
              )}
              <button
                type="button"
                className="btn-ghost h-9 w-9 rounded-xl p-0"
                aria-label="Supprimer cette note"
                onClick={async () => {
                  const snapshot = item;
                  await db.inbox.delete(item.id);
                  toastUndo('Note supprimée', async () => {
                    await db.inbox.put(snapshot);
                  });
                }}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <FileItemModal item={filing} open={Boolean(filing)} onClose={() => setFiling(null)} />
    </>
  );
}
