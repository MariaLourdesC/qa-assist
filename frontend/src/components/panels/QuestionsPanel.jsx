import React from 'react';
import ItemBadges from '../ItemBadges';
import { useLanguage } from '../../context/LanguageContext';

function EmptyState() {
  const { t } = useLanguage();
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-12 text-center shadow-sm">
      <svg viewBox="0 0 64 64" className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="32" cy="32" r="22" />
        <path d="M28 26a4 4 0 118 0c0 3-4 4-4 6m0 4v.02" strokeLinecap="round" />
      </svg>
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('panels.questions.emptyTitle')}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('panels.questions.emptyDesc')}</p>
    </div>
  );
}

export default function QuestionsPanel({ data }) {
  const items = data?.preguntas_refinamiento || [];
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {item.id}
                </span>
                <ItemBadges origen={item.origen} />
              </div>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{item.pregunta}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
