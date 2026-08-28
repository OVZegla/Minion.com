'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { nowISO } from '@/lib/dates';
import { deriveNotifications } from './derive';
import {
  useExams,
  useInbox,
  useRevisionSessions,
  useSAEs,
  useSettings,
  useSubjectMap,
  useTasks,
} from '@/hooks/data';
import { DEFAULT_NOTIFICATION_PREFS } from '@/db/defaults';

export function NotificationsButton() {
  const [open, setOpen] = useState(false);
  const tasks = useTasks();
  const exams = useExams();
  const sessions = useRevisionSessions();
  const inbox = useInbox();
  const saes = useSAEs();
  const subjects = useSubjectMap();
  const settings = useSettings();
  const read = useLiveQuery(() => db.notifications.toArray(), []);

  const readIds = useMemo(() => new Set((read ?? []).map((item) => item.id)), [read]);

  const items = useMemo(
    () =>
      deriveNotifications({
        tasks: tasks ?? [],
        exams: exams ?? [],
        sessions: sessions ?? [],
        inbox: inbox ?? [],
        saes: saes ?? [],
        subjects,
        prefs: settings?.notifications ?? DEFAULT_NOTIFICATION_PREFS,
      }),
    [tasks, exams, sessions, inbox, saes, subjects, settings],
  );

  const unread = items.filter((item) => !readIds.has(item.id));

  const markRead = async (id: string, category: string, title: string) => {
    await db.notifications.put({
      id,
      category: category as never,
      title,
      read: true,
      createdAt: nowISO(),
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="btn-ghost relative h-9 w-9 rounded-xl p-0"
        aria-label={`Notifications${unread.length ? ` (${unread.length} non lues)` : ''}`}
        aria-expanded={open}
      >
        <Bell size={19} />
        {unread.length > 0 ? (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[color:var(--danger)]" />
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Fermer"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-[320px] animate-slide-up rounded-2xl border border-line bg-surface p-2 shadow-pop">
            <div className="flex items-center justify-between px-2 py-1.5">
              <p className="text-[13px] font-semibold text-ink">Notifications</p>
              {unread.length > 0 ? (
                <button
                  type="button"
                  className="text-[12px] text-accent hover:underline"
                  onClick={() => {
                    unread.forEach((item) => void markRead(item.id, item.category, item.title));
                  }}
                >
                  Tout marquer comme lu
                </button>
              ) : null}
            </div>
            {items.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted">
                Rien à signaler. Tu peux souffler 🎉
              </p>
            ) : (
              <ul className="max-h-[60vh] space-y-0.5 overflow-y-auto">
                {items.map((item) => {
                  const isRead = readIds.has(item.id);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={() => {
                          void markRead(item.id, item.category, item.title);
                          setOpen(false);
                        }}
                        className="flex gap-2.5 rounded-xl px-2.5 py-2 transition hover:bg-surface2"
                      >
                        <span
                          aria-hidden
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                            isRead
                              ? 'bg-line'
                              : item.urgent
                                ? 'bg-[color:var(--danger)]'
                                : 'bg-[color:var(--primary)]'
                          }`}
                        />
                        <span
                          className={`text-[13px] leading-snug ${isRead ? 'text-muted' : 'text-ink'}`}
                        >
                          {item.title}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
