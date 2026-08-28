'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  CalendarDays,
  CornerDownLeft,
  FileText,
  FolderOpen,
  GraduationCap,
  Layers,
  Library,
  ListTodo,
  Plus,
  Scale,
  Search,
  SpellCheck,
  Timer,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useUi } from '@/components/layout/AppProviders';
import {
  useCaseLaws,
  useCourses,
  useDocuments,
  useExams,
  useLegalTerms,
  useSAEs,
  useStudySheets,
  useSubjectMap,
  useSubjects,
  useTasks,
} from '@/hooks/data';
import { foldCase } from '@/lib/text';

interface Result {
  id: string;
  group: string;
  title: string;
  subtitle?: string;
  href?: string;
  action?: () => void;
  icon: typeof Search;
}

const normalize = foldCase;

export function SearchCommand() {
  const router = useRouter();
  const { searchOpen, closeSearch, openQuickAdd } = useUi();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const subjects = useSubjects();
  const subjectMap = useSubjectMap();
  const courses = useCourses();
  const tasks = useTasks();
  const exams = useExams();
  const sheets = useStudySheets();
  const documents = useDocuments();
  const saes = useSAEs();
  const caseLaws = useCaseLaws();
  const terms = useLegalTerms();

  useEffect(() => {
    if (searchOpen) {
      setQuery('');
      setCursor(0);
    }
  }, [searchOpen]);

  const actions = useMemo<Result[]>(
    () => [
      { id: 'a-task', group: 'Actions', title: 'Créer une tâche', icon: Plus, action: () => openQuickAdd('task') },
      { id: 'a-course', group: 'Actions', title: 'Créer un cours', icon: Plus, action: () => openQuickAdd('course') },
      { id: 'a-exam', group: 'Actions', title: 'Ajouter un examen', icon: Plus, action: () => openQuickAdd('exam') },
      { id: 'a-subject', group: 'Actions', title: 'Ajouter une matière', icon: Plus, action: () => openQuickAdd('subject') },
      { id: 'a-rev', group: 'Actions', title: 'Planifier une révision', icon: Plus, action: () => openQuickAdd('revision') },
      { id: 'a-cal', group: 'Actions', title: 'Aller au calendrier', icon: CalendarDays, href: '/calendrier' },
      { id: 'a-focus', group: 'Actions', title: 'Démarrer une session de focus', icon: Timer, href: '/focus' },
      { id: 'a-todo', group: 'Actions', title: 'Voir mes tâches', icon: ListTodo, href: '/a-faire' },
    ],
    [openQuickAdd],
  );

  const results = useMemo<Result[]>(() => {
    const q = normalize(query.trim());
    if (!q) return actions.slice(0, 6);

    const match = (...values: (string | undefined | null)[]) =>
      values.some((value) => value && normalize(value).includes(q));

    const out: Result[] = [];
    const subjectName = (id?: string | null) => (id ? subjectMap.get(id)?.name : undefined);

    for (const subject of subjects ?? []) {
      if (match(subject.name, subject.shortName, subject.description)) {
        out.push({
          id: subject.id,
          group: 'Matières',
          title: subject.name,
          subtitle: subject.teacher,
          href: `/matieres/${subject.id}`,
          icon: Layers,
        });
      }
    }
    for (const course of courses ?? []) {
      if (match(course.title, ...course.keywords)) {
        out.push({
          id: course.id,
          group: 'Cours',
          title: course.title,
          subtitle: subjectName(course.subjectId),
          href: `/cours/${course.id}`,
          icon: BookOpen,
        });
      }
    }
    for (const sheet of sheets ?? []) {
      if (match(sheet.title, ...sheet.sections.map((section) => section.content))) {
        out.push({
          id: sheet.id,
          group: 'Fiches',
          title: sheet.title,
          subtitle: subjectName(sheet.subjectId),
          href: `/fiches/${sheet.id}`,
          icon: FileText,
        });
      }
    }
    for (const task of tasks ?? []) {
      if (match(task.title, task.description)) {
        out.push({
          id: task.id,
          group: 'Tâches',
          title: task.title,
          subtitle: subjectName(task.subjectId),
          href: '/a-faire',
          icon: ListTodo,
        });
      }
    }
    for (const exam of exams ?? []) {
      if (match(exam.title, exam.notes)) {
        out.push({
          id: exam.id,
          group: 'Examens',
          title: exam.title,
          subtitle: subjectName(exam.subjectId),
          href: '/examens',
          icon: GraduationCap,
        });
      }
    }
    for (const sae of saes ?? []) {
      if (match(sae.code, sae.title, sae.description)) {
        out.push({
          id: sae.id,
          group: 'SAÉ',
          title: `${sae.code} — ${sae.title}`,
          href: `/sae/${sae.id}`,
          icon: Library,
        });
      }
    }
    for (const caseLaw of caseLaws ?? []) {
      if (match(caseLaw.court, caseLaw.theme, caseLaw.chamber, caseLaw.principle, ...caseLaw.tags)) {
        out.push({
          id: caseLaw.id,
          group: 'Jurisprudence',
          title: `${caseLaw.court}${caseLaw.dateLabel ? ` — ${caseLaw.dateLabel}` : ''}`,
          subtitle: caseLaw.theme,
          href: '/jurisprudence',
          icon: Scale,
        });
      }
    }
    for (const term of terms ?? []) {
      if (match(term.term, term.definition)) {
        out.push({
          id: term.id,
          group: 'Lexique',
          title: term.term,
          subtitle: term.definition.slice(0, 70),
          href: '/lexique',
          icon: SpellCheck,
        });
      }
    }
    for (const doc of documents ?? []) {
      if (match(doc.name)) {
        out.push({
          id: doc.id,
          group: 'Documents',
          title: doc.name,
          subtitle: subjectName(doc.subjectId),
          href: '/documents',
          icon: FolderOpen,
        });
      }
    }
    for (const action of actions) {
      if (match(action.title)) out.push(action);
    }

    return out.slice(0, 40);
  }, [query, actions, subjects, courses, sheets, tasks, exams, saes, caseLaws, terms, documents, subjectMap]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  const run = (result: Result) => {
    closeSearch();
    if (result.action) {
      result.action();
    } else if (result.href) {
      router.push(result.href);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, Result[]>();
    results.forEach((result) => {
      const list = map.get(result.group) ?? [];
      list.push(result);
      map.set(result.group, list);
    });
    return map;
  }, [results]);

  return (
    <Modal open={searchOpen} onClose={closeSearch} title="Recherche" size="lg">
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface2/60 px-3">
          <Search size={17} className="shrink-0 text-muted" />
          <input
            className="w-full bg-transparent py-2.5 text-[15px] text-ink outline-none placeholder:text-muted/70"
            placeholder="Rechercher un cours, une fiche, une matière…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setCursor((value) => Math.min(value + 1, results.length - 1));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setCursor((value) => Math.max(value - 1, 0));
              } else if (event.key === 'Enter') {
                event.preventDefault();
                const result = results[cursor];
                if (result) run(result);
              }
            }}
            aria-label="Recherche globale"
            autoComplete="off"
          />
        </div>

        {results.length === 0 ? (
          <p className="px-1 py-8 text-center text-sm text-muted">
            Aucun résultat pour « {query} ».
          </p>
        ) : (
          <ul ref={listRef} className="max-h-[52vh] space-y-3 overflow-y-auto">
            {Array.from(grouped.entries()).map(([group, items]) => (
              <li key={group}>
                <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted/80">
                  {group}
                </p>
                <ul className="space-y-0.5">
                  {items.map((result) => {
                    const index = results.indexOf(result);
                    const active = index === cursor;
                    return (
                      <li key={`${group}-${result.id}`}>
                        <button
                          type="button"
                          onMouseEnter={() => setCursor(index)}
                          onClick={() => run(result)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                            active ? 'bg-primary-soft text-accent' : 'hover:bg-surface2'
                          }`}
                        >
                          <result.icon size={16} className="shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink">
                              {result.title}
                            </span>
                            {result.subtitle ? (
                              <span className="block truncate text-xs text-muted">{result.subtitle}</span>
                            ) : null}
                          </span>
                          {active ? <CornerDownLeft size={14} className="shrink-0 text-muted" /> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
