'use client';

import { Suspense, useMemo } from 'react';
import { FocusHeader, FocusRecent, FocusTimer } from '@/features/focus/FocusTimer';
import { useFocusSessions, useSubjectMap } from '@/hooks/data';
import { Spinner } from '@/components/ui';
import { relativeDayLabel } from '@/lib/dates';

export default function FocusPage() {
  const sessions = useFocusSessions();
  const subjects = useSubjectMap();

  const recent = useMemo(
    () =>
      [...(sessions ?? [])]
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .slice(0, 5)
        .map((session) => ({
          id: session.id,
          label: `${
            session.subjectId ? subjects.get(session.subjectId)?.shortName ?? 'Session' : 'Session'
          } · ${relativeDayLabel(session.startedAt.slice(0, 10))}`,
          minutes: Math.round(session.seconds / 60),
        })),
    [sessions, subjects],
  );

  return (
    <>
      <FocusHeader />
      <Suspense fallback={<Spinner />}>
        <FocusTimer />
      </Suspense>
      <FocusRecent items={recent} />
    </>
  );
}
