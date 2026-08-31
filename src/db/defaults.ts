import { newId } from '@/lib/id';
import { nowISO } from '@/lib/dates';
import type { NotificationPrefs, UserSettings } from '@/types';

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  courses: true,
  tasks: true,
  exams: true,
  revisions: true,
  sae: true,
};

export function defaultSettings(overrides: Partial<UserSettings> = {}): UserSettings {
  const ts = nowISO();
  return {
    id: 'app',
    displayName: '',
    program: 'BUT Carrières Juridiques',
    yearLabel: 'BUT 1',
    track: undefined,
    currentAcademicYearId: null,
    currentSemesterId: null,
    theme: 'system',
    weekStartsOnMonday: true,
    dayStartHour: 8,
    dayEndHour: 19,
    onboardingDone: false,
    demoDataLoaded: false,
    showAppName: true,
    notifications: { ...DEFAULT_NOTIFICATION_PREFS },
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

export { newId };
