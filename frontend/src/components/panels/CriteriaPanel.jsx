import React from 'react';
import ItemBadges from '../ItemBadges';
import { useLanguage } from '../../context/LanguageContext';

function EmptyState() {
  const { t } = useLanguage();
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-12 text-center shadow-sm">
      <svg viewBox="0 0 64 64" className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="14" y="12" width="36" height="40" rx="4" />
        <path d="M22 28h20M22 36h20M22 44h12" strokeLinecap="round" />
      </svg>
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('panels.criteria.emptyTitle')}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('panels.criteria.emptyDesc')}</p>
    </div>
  );
}

export default function CriteriaPanel({ data }) {
  const items = data?.criterios_aceptacion || [];
  if (items.length === 0) return <EmptyState />;

  return (
    <div className="space-y-3">
      {items.map(item => (
        <div
          key={item.id}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-slate-600"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {item.id}
                </span>
                <ItemBadges origen={item.origen} />
              </div>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{item.criterio}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
