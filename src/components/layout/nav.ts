import {
  BookOpen,
  BookText,
  CalendarDays,
  ChartNoAxesColumn,
  CircleCheckBig,
  FileText,
  FolderOpen,
  GraduationCap,
  Home,
  Inbox,
  Layers,
  Library,
  ListTodo,
  Scale,
  Settings,
  SpellCheck,
  Timer,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** cle d'un compteur affiche en pastille */
  badge?: 'inbox' | 'today';
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: '/', label: 'Accueil', icon: Home },
      { href: '/calendrier', label: 'Calendrier', icon: CalendarDays },
      { href: '/a-classer', label: 'À classer', icon: Inbox, badge: 'inbox' },
      { href: '/matieres', label: 'Matières', icon: Layers },
      { href: '/cours', label: 'Cours', icon: BookOpen },
      { href: '/a-faire', label: 'À faire', icon: ListTodo, badge: 'today' },
      { href: '/revisions', label: 'Révisions', icon: CircleCheckBig },
      { href: '/fiches', label: 'Fiches', icon: FileText },
      { href: '/examens', label: 'Examens', icon: GraduationCap },
      { href: '/sae', label: 'SAÉ', icon: Library },
      { href: '/documents', label: 'Documents', icon: FolderOpen },
    ],
  },
  {
    label: 'Outils juridiques',
    items: [
      { href: '/methodes', label: 'Méthodes', icon: BookText },
      { href: '/jurisprudence', label: 'Jurisprudence', icon: Scale },
      { href: '/lexique', label: 'Lexique', icon: SpellCheck },
    ],
  },
  {
    label: 'Mon suivi',
    items: [
      { href: '/focus', label: 'Focus', icon: Timer },
      { href: '/resultats', label: 'Résultats', icon: ChartNoAxesColumn },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = { href: '/parametres', label: 'Paramètres', icon: Settings };

/** Navigation basse mobile : 4 entrees + le bouton central « + ». */
export const MOBILE_NAV: NavItem[] = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/calendrier', label: 'Calendrier', icon: CalendarDays },
  { href: '/matieres', label: 'Matières', icon: Layers },
  { href: '/a-faire', label: 'À faire', icon: ListTodo, badge: 'today' },
];
