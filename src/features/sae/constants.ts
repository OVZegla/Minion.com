import type { SAEStatus } from '@/types';

export const SAE_STATUS_LABEL: Record<SAEStatus, string> = {
  upcoming: 'À venir',
  in_progress: 'En cours',
  to_deliver: 'À rendre',
  done: 'Terminée',
};

export const SAE_STATUS_TONE: Record<SAEStatus, 'neutral' | 'primary' | 'danger' | 'success'> = {
  upcoming: 'neutral',
  in_progress: 'primary',
  to_deliver: 'danger',
  done: 'success',
};
