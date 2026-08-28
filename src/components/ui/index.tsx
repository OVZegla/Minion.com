'use client';

import clsx from 'clsx';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { colorTokens, colorVars } from '@/lib/colors';
import type { MasteryLevel } from '@/types';
import { MASTERY_LABEL } from '@/lib/progress';

/* ------------------------------ Card -------------------------------- */

export function Card({
  children,
  className,
  as: As = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  return <As className={clsx('card', className)}>{children}</As>;
}

/* --------------------------- SectionHeader -------------------------- */

export function SectionHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ink">
          {icon}
          {title}
        </h2>
        {subtitle ? <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ---------------------------- PageHeader ---------------------------- */

export function PageHeader({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-ink sm:text-[30px]">
            {title}
          </h1>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </header>
  );
}

/* ---------------------------- ProgressBar --------------------------- */

export function ProgressBar({
  value,
  color,
  size = 'md',
  label,
}: {
  value: number;
  color?: string;
  size?: 'sm' | 'md';
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const tokens = color ? colorTokens(color) : null;
  return (
    <div
      className="flex items-center gap-2"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `Progression ${pct} %`}
    >
      <div
        className={clsx(
          'relative w-full overflow-hidden rounded-full bg-surface2',
          size === 'sm' ? 'h-1.5' : 'h-2',
        )}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, background: tokens?.solid ?? 'var(--primary)' }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-xs font-medium tabular-nums text-muted">
        {pct} %
      </span>
    </div>
  );
}

/* --------------------------- SubjectBadge --------------------------- */

export function SubjectBadge({
  name,
  color,
  size = 'md',
  href,
}: {
  name: string;
  color?: string;
  size?: 'sm' | 'md';
  href?: string;
}) {
  const content = (
    <span
      className={clsx(
        'sc inline-flex max-w-full items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
      )}
      style={{ ...colorVars(color), background: 'var(--c-soft)', color: 'var(--c-text)' }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: 'var(--c-solid)' }}
      />
      <span className="truncate">{name}</span>
    </span>
  );
  return href ? (
    <Link href={href} className="max-w-full">
      {content}
    </Link>
  ) : (
    content
  );
}

/* ----------------------------- StatusBadge -------------------------- */

const STATUS_STYLES: Record<string, string> = {
  neutral: 'bg-surface2 text-muted',
  primary: 'bg-primary-soft text-accent',
  success: 'bg-[color:var(--success-soft)] text-[color:var(--success)]',
  danger: 'bg-[color:var(--danger-soft)] text-[color:var(--danger)]',
};

export function StatusBadge({
  children,
  tone = 'neutral',
  icon,
}: {
  children: ReactNode;
  tone?: keyof typeof STATUS_STYLES;
  icon?: ReactNode;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        STATUS_STYLES[tone],
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/* ---------------------------- MasteryPill --------------------------- */

const MASTERY_TONE: Record<MasteryLevel, string> = {
  not_started: 'bg-surface2 text-muted',
  to_learn: 'bg-[color:var(--danger-soft)] text-[color:var(--danger)]',
  to_review: 'bg-primary-soft text-accent',
  mastered: 'bg-[color:var(--success-soft)] text-[color:var(--success)]',
};

/** Le libelle est toujours present : la couleur n'est jamais la seule information. */
export function MasteryPill({ level, onClick }: { level: MasteryLevel; onClick?: () => void }) {
  const className = clsx(
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
    MASTERY_TONE[level],
    onClick && 'hover:brightness-95 active:scale-[.98]',
  );
  const dots = ['not_started', 'to_learn', 'to_review', 'mastered'].indexOf(level) + 1;
  const body = (
    <>
      <span aria-hidden className="font-mono text-[10px] tracking-tighter">
        {'●'.repeat(dots)}
        {'○'.repeat(4 - dots)}
      </span>
      {MASTERY_LABEL[level]}
    </>
  );
  if (!onClick) return <span className={className}>{body}</span>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      title="Changer l’état de maîtrise"
      aria-label={`État : ${MASTERY_LABEL[level]}. Cliquer pour changer.`}
    >
      {body}
    </button>
  );
}

/* ----------------------------- EmptyState --------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-12 text-center">
      {icon ? (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-accent">
          {icon}
        </div>
      ) : null}
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/* ------------------------------ StatCard ---------------------------- */

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-[13px]">{label}</span>
      </div>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/* ---------------------------- Segmented ----------------------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 rounded-xl border border-line bg-surface p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[13px] font-medium transition',
            value === option.value
              ? 'bg-primary text-[color:var(--primary-ink)]'
              : 'text-muted hover:bg-surface2 hover:text-ink',
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ Fields ------------------------------ */

export function Field({
  label,
  children,
  hint,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  htmlFor?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Spinner({ label = 'Chargement' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
      <span
        aria-hidden
        className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-[color:var(--primary)]"
      />
      {label}…
    </div>
  );
}
