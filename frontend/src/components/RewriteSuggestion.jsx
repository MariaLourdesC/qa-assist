import React, { useEffect, useState } from 'react';
import { analysesApi } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function RewriteSuggestion({ analysisId, onApply, onClose }) {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

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
    setLoading(true);
    setError(null);
    analysesApi.suggestRewrite(analysisId)
      .then(data => setResult(data))
      .catch(err => setError(err.message || 'Error'))
      .finally(() => setLoading(false));
  }, [analysisId]);

  const handleUse = () => {
    if (result?.historia_mejorada) {
      onApply(result.historia_mejorada);
      addToast(t('rewrite.applied'), 'success');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
            </span>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t('rewrite.title')}</h2>
              {result?.cambios?.length > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('rewrite.changesCount', { count: result.cambios.length })}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('rewrite.close')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Spinner />
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('rewrite.generating')}</p>
            </div>
          )}

          {error && !loading && (
            <div className="px-6 py-8">
              <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-5">
                <p className="text-sm font-semibold text-red-900 dark:text-red-100">{t('rewrite.errorTitle')}</p>
                <p className="mt-1 text-xs text-red-700 dark:text-red-300 font-mono">{error}</p>
                {error.toLowerCase().includes('api') && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">{t('rewrite.noApiKey')}</p>
                )}
              </div>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-0">
              {/* Comparison: original vs improved */}
              <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-700">
                <div className="p-6">
                  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('rewrite.original')}
                  </h3>
                  <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-sans">
                    {result.historia_original}
                  </pre>
                </div>
                <div className="p-6">
                  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {t('rewrite.improved')}
                  </h3>
                  <pre className="whitespace-pre-wrap rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 p-4 text-sm leading-relaxed text-slate-900 dark:text-slate-100 font-sans">
                    {result.historia_mejorada}
                  </pre>
                </div>
              </div>

              {/* Changes list */}
              {result.cambios?.length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-5">
                  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('rewrite.changes')}
                  </h3>
                  <ul className="space-y-2">
                    {result.cambios.map((c, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {result && !loading && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              {t('rewrite.close')}
            </button>
            <button
              type="button"
              onClick={handleUse}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 active:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {t('rewrite.useVersion')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
