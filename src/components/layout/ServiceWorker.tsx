'use client';

import { useEffect } from 'react';

/**
 * Enregistre le service worker (PWA) en production sur le web uniquement.
 * Dans l'application de bureau, tout est déjà local : le service worker
 * n'apporte rien et son absence provoquerait une erreur inutile.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window !== 'undefined' && window.minionDesktop?.isDesktop) return;
    if (!('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);
  return null;
}
