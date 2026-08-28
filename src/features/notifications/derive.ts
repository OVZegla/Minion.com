import { daysUntil, fmtDayShort, relativeCountdown, todayISO } from '@/lib/dates';
import type {
  Exam,
  InboxItem,
  NotifCategory,
  NotificationPrefs,
  RevisionSession,
  SAE,
  Subject,
  Task,
} from '@/types';

export interface DerivedNotification {
  /** identifiant stable : permet de retenir qu'elle a ete lue */
  id: string;
  category: NotifCategory;
  title: string;
  href: string;
  urgent?: boolean;
}

/**
 * Les notifications sont CALCULEES a partir des donnees reelles, jamais stockees :
 * elles ne peuvent donc jamais devenir fausses. Seul l'etat « lue » est persiste.
 */
export function deriveNotifications(input: {
  tasks: Task[];
  exams: Exam[];
  sessions: RevisionSession[];
  inbox: InboxItem[];
  saes: SAE[];
  subjects: Map<string, Subject>;
  prefs: NotificationPrefs;
}): DerivedNotification[] {
  const { tasks, exams, sessions, inbox, saes, subjects, prefs } = input;
  const today = todayISO();
  const out: DerivedNotification[] = [];
  const subjectName = (id?: string | null) => (id ? subjects.get(id)?.name : undefined);

  if (prefs.tasks) {
    for (const task of tasks) {
      if (task.status === 'done' || !task.dueDate) continue;
      const days = daysUntil(task.dueDate);
      if (days < 0) {
        out.push({
          id: `task-late-${task.id}-${task.dueDate}`,
          category: 'tasks',
          title: `« ${task.title} » était à rendre ${relativeCountdown(task.dueDate)}.`,
          href: '/a-faire',
          urgent: true,
        });
      } else if (days <= 1) {
        const subject = subjectName(task.subjectId);
        out.push({
          id: `task-due-${task.id}-${task.dueDate}`,
          category: 'tasks',
          title: `${subject ? `${subject} : ` : ''}« ${task.title} » est à rendre ${relativeCountdown(task.dueDate)}.`,
          href: '/a-faire',
          urgent: days === 0,
        });
      }
    }
  }

  if (prefs.exams) {
    for (const exam of exams) {
      const days = daysUntil(exam.date);
      if (days < 0 || days > 7) continue;
      out.push({
        id: `exam-${exam.id}-${exam.date}`,
        category: 'exams',
        title:
          days === 0
            ? `${exam.title} — c’est aujourd’hui.`
            : `${exam.title} ${relativeCountdown(exam.date)}.`,
        href: '/examens',
        urgent: days <= 2,
      });
    }
  }

  if (prefs.revisions) {
    for (const session of sessions) {
      if (session.status !== 'planned' || session.date !== today) continue;
      out.push({
        id: `rev-${session.id}-${session.date}`,
        category: 'revisions',
        title: `Session de révision prévue${session.time ? ` à ${session.time}` : ''} : ${session.title}.`,
        href: '/revisions',
      });
    }
  }

  if (prefs.sae) {
    for (const sae of saes) {
      if (!sae.dueDate || sae.status === 'done') continue;
      const days = daysUntil(sae.dueDate);
      if (days < 0 || days > 3) continue;
      out.push({
        id: `sae-${sae.id}-${sae.dueDate}`,
        category: 'sae',
        title: `${sae.code} à rendre ${relativeCountdown(sae.dueDate)} (${fmtDayShort(sae.dueDate)}).`,
        href: `/sae/${sae.id}`,
        urgent: days <= 1,
      });
    }
  }

  const pending = inbox.filter((item) => item.status === 'pending').length;
  if (pending > 0) {
    out.push({
      id: `inbox-${pending}`,
      category: 'inbox',
      title: `Tu as ${pending} élément${pending > 1 ? 's' : ''} à classer.`,
      href: '/a-classer',
    });
  }

  return out.sort((a, b) => Number(Boolean(b.urgent)) - Number(Boolean(a.urgent)));
}
