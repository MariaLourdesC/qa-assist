import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { stepLibraryApi } from '../api/client';

const CAT_COLORS = {
  setup:        'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
  precondition: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
  verification: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
  teardown:     'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  util:         'bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300'
};

export default function StepLibraryPicker({ projectId, onInsert, onClose }) {
  const { t } = useLanguage();
  const [steps, setSteps]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery]   = useState('');
  const [catFilter, setCat] = useState('all');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    if (!projectId) return;
    stepLibraryApi.getAll(projectId)
      .then(data => setSteps(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  const filtered = steps.filter(s => {
    const matchCat = catFilter === 'all' || s.category === catFilter;
    const matchQ   = !query || s.title.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  });

  const cats = ['all', ...new Set(steps.map(s => s.category))];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" className="relative flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t('stepLibrary.pickerTitle')}
          </h2>
          <button type="button" onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Filters */}
        <div className="border-b border-slate-100 dark:border-slate-800 px-4 py-3 space-y-2">
          <input type="search" value={query} onChange={e => setQuery(e.target.value)}
            placeholder={t('stepLibrary.searchPlaceholder')}
            className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" />
          <div className="flex flex-wrap gap-1">
            {cats.map(c => (
              <button key={c} type="button" onClick={() => setCat(c)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors focus-visible:outline-none ${
                  catFilter === c
                    ? 'bg-emerald-600 text-white'
                    : c === 'all'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      : CAT_COLORS[c] || 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                {c === 'all' ? t('history.filter.all') : t(`stepLibrary.categories.${c}`, c)}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <svg className="h-5 w-5 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="3"/>
                <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
              {steps.length === 0 ? t('stepLibrary.pickerEmpty') : t('stepLibrary.pickerNoMatch')}
            </p>
          )}
          {!loading && filtered.map(step => (
            <button key={step.id} type="button" onClick={() => { onInsert(step); onClose(); }}
              className="flex w-full items-start gap-3 border-b border-slate-100 dark:border-slate-800 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 focus-visible:outline-none focus-visible:bg-slate-50">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{step.title}</p>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${CAT_COLORS[step.category] || ''}`}>
                    {t(`stepLibrary.categories.${step.category}`, step.category)}
                  </span>
                </div>
                {step.pasos?.length > 0 && (
                  <ol className="space-y-0.5 pl-3">
                    {step.pasos.slice(0, 3).map((p, i) => (
                      <li key={i} className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {i + 1}. {p}
                      </li>
                    ))}
                    {step.pasos.length > 3 && (
                      <li className="text-[11px] text-slate-400 dark:text-slate-500">+{step.pasos.length - 3} pasos más…</li>
                    )}
                  </ol>
                )}
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
                className="h-4 w-4 shrink-0 mt-1 text-slate-300 dark:text-slate-600" aria-hidden="true">
                <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
