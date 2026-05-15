import React, { useEffect, useState } from 'react';
import { projectsApi } from '../api/client';
import { useLanguage } from '../context/LanguageContext';

function ScoreColor(value, kind) {
  if (value == null) return 'text-slate-400 dark:text-slate-500';
  if (kind === 'amb')   return value > 70 ? 'text-red-600 dark:text-red-400'     : value >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';
  if (kind === 'cob')   return value > 80 ? 'text-emerald-600 dark:text-emerald-400' : value >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
  if (kind === 'compl') return value > 60 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';
  return 'text-slate-700 dark:text-slate-300';
}

function StatCell({ label, value, valueClass = 'text-slate-900 dark:text-slate-100', suffix }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tracking-tight ${valueClass}`}>
        {value ?? '—'}
        {suffix && value != null && <span className="ml-0.5 text-xs font-normal text-slate-400 dark:text-slate-500">{suffix}</span>}
      </p>
    </div>
  );
}

export default function ProjectStats({ projectId, refreshKey }) {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    projectsApi.getStats(projectId)
      .then(data => { if (!cancelled) setStats(data); })
      .catch(() => { if (!cancelled) setStats(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId, refreshKey]);

  if (loading && !stats) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-4 text-sm text-slate-500 dark:text-slate-400 shadow-sm">
        {t('stats.loading')}
      </div>
    );
  }
  if (!stats) return null;

  const hasAnalyses = stats.total_analyses > 0;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
            <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </span>
        <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t('stats.title')}</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCell
          label={t('stats.stories', { count: stats.total_stories })}
          value={stats.total_stories}
        />
        <StatCell
          label={t('stats.analyzed')}
          value={stats.analyzed_stories}
          valueClass="text-emerald-600 dark:text-emerald-400"
        />
        <StatCell
          label={t('stats.totalAnalyses')}
          value={stats.total_analyses}
        />
        {hasAnalyses ? (
          <>
            <StatCell
              label={t('stats.avgAmb')}
              value={stats.avg_score_ambiguedad}
              valueClass={ScoreColor(stats.avg_score_ambiguedad, 'amb')}
              suffix="/100"
            />
            <StatCell
              label={t('stats.avgCob')}
              value={stats.avg_score_cobertura}
              valueClass={ScoreColor(stats.avg_score_cobertura, 'cob')}
              suffix="/100"
            />
            <StatCell
              label={t('stats.needsRefinement')}
              value={stats.needs_refinement}
              valueClass={stats.needs_refinement > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}
            />
          </>
        ) : (
          <div className="sm:col-span-3 lg:col-span-3 flex items-center text-sm text-slate-500 dark:text-slate-400 italic">
            {t('stats.noData')}
          </div>
        )}
      </div>
    </div>
  );
}
