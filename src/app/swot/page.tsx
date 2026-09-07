'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, Grid2x2, Plus, Trash2 } from 'lucide-react';
import { db } from '@/db/db';
import { createSwot, duplicateSwot } from '@/db/repo';
import { useSubjectMap, useSwots } from '@/hooks/data';
import { completion, summarize } from '@/features/swot/matrix';
import { EmptyState, PageHeader, ProgressBar, SubjectBadge } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { SubjectSelect } from '@/components/ui/inputs';
import { fmtDayShort } from '@/lib/dates';

/**
 * Diagnostics d'entreprise : analyse PESTEL de l'environnement, diagnostic
 * interne, et matrice SWOT qui synthétise les deux.
 */
export default function SwotListPage() {
  const router = useRouter();
  const { toast } = useToast();
  const analyses = useSwots();
  const subjectMap = useSubjectMap();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        title="Diagnostics d’entreprise"
        subtitle="PESTEL pour l’environnement, diagnostic interne pour l’entreprise, et la matrice SWOT qui relie les deux."
        actions={
          <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={16} />
            Nouveau diagnostic
          </button>
        }
      />

      {analyses === undefined ? null : analyses.length === 0 ? (
        <EmptyState
          title="Aucun diagnostic pour l’instant"
          description="Un diagnostic part de l’environnement de l’entreprise (PESTEL) et de ce qu’elle a en interne. La matrice SWOT se remplit toute seule à partir de tes constats."
          action={
            <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
              <Plus size={16} />
              Nouveau diagnostic
            </button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {analyses.map((analysis) => {
            const bilan = summarize(analysis.items);
            const subject = analysis.subjectId ? subjectMap.get(analysis.subjectId) : undefined;
            return (
              <li key={analysis.id} className="rounded-2xl border border-line bg-surface p-4">
                <div className="mb-2 flex items-start gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-accent">
                    <Grid2x2 size={17} />
                  </span>
                  <Link href={`/swot/${analysis.id}`} className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-ink">
                      {analysis.title}
                    </span>
                    <span className="block truncate text-[12px] text-muted">
                      {analysis.company || 'Entreprise à préciser'} ·{' '}
                      {fmtDayShort(analysis.updatedAt.slice(0, 10))}
                    </span>
                  </Link>
                  <button
                    type="button"
                    className="btn-ghost h-8 w-8 shrink-0 rounded-lg p-0"
                    aria-label={`Dupliquer ${analysis.title}`}
                    onClick={async () => {
                      const copy = await duplicateSwot(analysis.id);
                      if (copy) {
                        toast('Diagnostic dupliqué');
                        router.push(`/swot/${copy}`);
                      }
                    }}
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    type="button"
                    className="btn-ghost h-8 w-8 shrink-0 rounded-lg p-0"
                    aria-label={`Supprimer ${analysis.title}`}
                    onClick={async () => {
                      await db.swots.delete(analysis.id);
                      toast('Diagnostic supprimé');
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {subject ? (
                    <SubjectBadge name={subject.shortName} color={subject.color} size="sm" />
                  ) : null}
                  <span className="chip text-muted">{bilan.forces} force{bilan.forces > 1 ? 's' : ''}</span>
                  <span className="chip text-muted">
                    {bilan.faiblesses} faiblesse{bilan.faiblesses > 1 ? 's' : ''}
                  </span>
                  <span className="chip text-muted">
                    {bilan.opportunites} opportunité{bilan.opportunites > 1 ? 's' : ''}
                  </span>
                  <span className="chip text-muted">{bilan.menaces} menace{bilan.menaces > 1 ? 's' : ''}</span>
                </div>

                <ProgressBar
                  value={completion(analysis.items)}
                  label={`Avancement de ${analysis.title}`}
                />
                <p className="mt-1 text-[11px] text-muted">
                  {completion(analysis.items)} % des douze cases explorées
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nouveau diagnostic"
        description="Tu pourras tout modifier ensuite."
        footer={
          <button
            type="button"
            className="btn-primary"
            disabled={!company.trim()}
            onClick={async () => {
              const id = await createSwot({
                title: title.trim() || `Diagnostic de ${company.trim()}`,
                company,
                subjectId,
              });
              setOpen(false);
              setTitle('');
              setCompany('');
              toast('Diagnostic créé');
              router.push(`/swot/${id}`);
            }}
          >
            Créer
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="swot-company">
              Entreprise analysée
            </label>
            <input
              id="swot-company"
              className="field"
              value={company}
              placeholder="Ex. la SARL Dubois"
              onChange={(event) => setCompany(event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="swot-title">
              Intitulé du travail (facultatif)
            </label>
            <input
              id="swot-title"
              className="field"
              value={title}
              placeholder="Diagnostic stratégique — devoir du 12 mars"
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <SubjectSelect value={subjectId} onChange={setSubjectId} />
        </div>
      </Modal>
    </>
  );
}
