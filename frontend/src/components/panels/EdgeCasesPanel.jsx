import React from 'react';
import ItemBadges from '../ItemBadges';
import { useLanguage } from '../../context/LanguageContext';

function EmptyState() {
  const { t } = useLanguage();
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-12 text-center shadow-sm">
      <svg viewBox="0 0 64 64" className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M32 12L8 52h48L32 12zm0 14v12m0 6v.02" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('panels.edges.emptyTitle')}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('panels.edges.emptyDesc')}</p>
    </div>
  );
}

export default function EdgeCasesPanel({ data }) {
  const items = data?.negativos_edge_cases || [];
  if (items.length === 0) return <EmptyState />;

  return (
    <div className="space-y-2.5">
      {items.map(item => (
        <div
          key={item.id}
          className="flex items-start gap-3 rounded-xl border border-amber-200/70 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 p-4 transition-colors hover:bg-amber-50/70 dark:hover:bg-amber-950/30"
        >
          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="rounded bg-white dark:bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400 ring-1 ring-inset ring-slate-200 dark:ring-slate-700">
                {item.id}
              </span>
              <ItemBadges origen={item.origen} />
            </div>
            <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">{item.descripcion}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
