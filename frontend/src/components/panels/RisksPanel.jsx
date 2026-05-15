import React from 'react';
import ItemBadges from '../ItemBadges';
import { useLanguage } from '../../context/LanguageContext';

const SEVERITY_BORDER = {
  alta:  'border-l-red-500',
  media: 'border-l-amber-500',
  baja:  'border-l-emerald-500'
};
const SEVERITY_ICON_BG = {
  alta:  'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400',
  media: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
  baja:  'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
};

function EmptyState() {
  const { t } = useLanguage();
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-12 text-center shadow-sm">
      <svg viewBox="0 0 64 64" className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M32 8l-20 8v14c0 13 9 22 20 26 11-4 20-13 20-26V16L32 8z" strokeLinejoin="round" />
        <path d="M24 32l6 6 12-12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('panels.risks.emptyTitle')}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('panels.risks.emptyDesc')}</p>
    </div>
  );
}

export default function RisksPanel({ data }) {
  const items = data?.riesgos || [];
  if (items.length === 0) return <EmptyState />;
  return (
    <div className="space-y-3">
      {items.map(item => {
        const iconClass = SEVERITY_ICON_BG[item.severidad] || 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400';
        const borderClass = SEVERITY_BORDER[item.severidad] || 'border-l-slate-300 dark:border-l-slate-600';
        return (
          <div key={item.id} className={`rounded-xl border border-l-4 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-slate-600 ${borderClass}`}>
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M12 22c5-2 8-6 8-11V5l-8-3-8 3v6c0 5 3 9 8 11z" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-start justify-between gap-3">
                  <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400">{item.id}</span>
                  <ItemBadges severidad={item.severidad} origen={item.origen} />
                </div>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{item.descripcion}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
