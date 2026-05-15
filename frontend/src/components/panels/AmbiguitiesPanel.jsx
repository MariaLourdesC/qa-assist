import React from 'react';
import ItemBadges from '../ItemBadges';
import { useLanguage } from '../../context/LanguageContext';

const SEVERITY_BORDER = {
  alta:  'border-l-red-500',
  media: 'border-l-amber-500',
  baja:  'border-l-emerald-500'
};

function EmptyState() {
  const { t } = useLanguage();
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-12 text-center shadow-sm">
      <svg viewBox="0 0 64 64" className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="32" cy="32" r="22" />
        <path d="M22 38c2 3 6 5 10 5s8-2 10-5M24 26h.02M40 26h.02" strokeLinecap="round" />
      </svg>
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('panels.ambiguities.emptyTitle')}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('panels.ambiguities.emptyDesc')}</p>
    </div>
  );
}

export default function AmbiguitiesPanel({ data }) {
  const items = data?.ambiguedades || [];
  if (items.length === 0) return <EmptyState />;

  return (
    <div className="space-y-3">
      {items.map(item => (
        <div
          key={item.id}
          className={`rounded-xl border border-l-4 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-slate-600 ${SEVERITY_BORDER[item.severidad] || 'border-l-slate-300 dark:border-l-slate-600'}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {item.id}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{item.descripcion}</p>
            </div>
            <div className="shrink-0">
              <ItemBadges severidad={item.severidad} origen={item.origen} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
