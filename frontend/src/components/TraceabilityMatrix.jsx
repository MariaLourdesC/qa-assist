import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { analysesApi } from '../api/client';

export default function TraceabilityMatrix({ analysis, onClose }) {
  const { t } = useLanguage();
  const { addToast } = useToast();

  const criteria  = analysis?.resultado?.criterios_aceptacion  || [];
  const testCases = analysis?.resultado?.test_cases             || [];
  const edgeCases = analysis?.resultado?.negativos_edge_cases   || [];
  const allTcs    = [
    ...testCases.map(tc => ({ ...tc, _type: 'tc' })),
    ...edgeCases.map(ec => ({ id: ec.id, titulo: ec.descripcion || ec.id, _type: 'ec' }))
  ];

  // links: { [caId]: Set<tcId> }
  const [links, setLinks]   = useState(() => {
    const init = {};
    criteria.forEach(ca => {
      init[ca.id] = new Set(analysis?.traceability?.[ca.id] || []);
    });
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty]   = useState(false);

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

  const toggle = (caId, tcId) => {
    setLinks(prev => {
      const next = { ...prev, [caId]: new Set(prev[caId]) };
      next[caId].has(tcId) ? next[caId].delete(tcId) : next[caId].add(tcId);
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {};
      Object.entries(links).forEach(([caId, set]) => { payload[caId] = [...set]; });
      await analysesApi.saveTraceability(analysis.id, payload);
      setDirty(false);
      addToast(t('traceability.saved'), 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Summary: uncovered CAs
  const uncovered = criteria.filter(ca => links[ca.id]?.size === 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="traceability-title"
        className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                <path d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75.125v-2.25M6 18.375V9a.375.375 0 00-.375-.375H4.5m13.5 9.375h1.5c.621 0 1.125-.504 1.125-1.125M19.5 19.5v-2.25M19.5 9H4.5m15 0a.375.375 0 01.375.375v6.75M4.5 9V6.75m0 0h15M4.5 6.75a.375.375 0 01.375-.375h14.25a.375.375 0 01.375.375V9" />
              </svg>
            </span>
            <div>
              <h2 id="traceability-title" className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {t('traceability.title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('traceability.subtitle', { cas: criteria.length, tcs: allTcs.length })}
                {uncovered.length > 0 && (
                  <span className="ml-2 text-amber-600 dark:text-amber-400">
                    · {t('traceability.uncovered', { count: uncovered.length })}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Matrix */}
        <div className="flex-1 overflow-auto">
          {criteria.length === 0 || allTcs.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('traceability.empty')}</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900">
                <tr>
                  {/* Empty top-left corner */}
                  <th className="min-w-[260px] border-b border-r border-slate-200 dark:border-slate-700 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('traceability.criteria')}
                  </th>
                  {allTcs.map(tc => (
                    <th key={tc.id} className="min-w-[80px] border-b border-r border-slate-200 dark:border-slate-700 px-2 py-3 text-center">
                      <span className={`inline-block rounded px-1.5 py-0.5 font-mono text-[11px] font-medium ${
                        tc._type === 'ec'
                          ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {tc.id}
                      </span>
                    </th>
                  ))}
                  <th className="border-b border-slate-200 dark:border-slate-700 px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('traceability.coverage')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {criteria.map((ca, i) => {
                  const coveredBy = links[ca.id] || new Set();
                  const isCovered = coveredBy.size > 0;
                  return (
                    <tr key={ca.id} className={`${i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/20'} hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-colors`}>
                      <td className="border-b border-r border-slate-100 dark:border-slate-800 px-4 py-3">
                        <div className="flex items-start gap-2">
                          <span className={`mt-0.5 shrink-0 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] font-medium ${
                            isCovered ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                          }`}>
                            {ca.id}
                          </span>
                          <span className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 line-clamp-2">
                            {ca.criterio}
                          </span>
                        </div>
                      </td>
                      {allTcs.map(tc => {
                        const checked = coveredBy.has(tc.id);
                        return (
                          <td key={tc.id} className="border-b border-r border-slate-100 dark:border-slate-800 px-2 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggle(ca.id, tc.id)}
                              aria-label={`${ca.id} ↔ ${tc.id}`}
                              aria-pressed={checked}
                              className={`inline-flex h-6 w-6 items-center justify-center rounded transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                                checked
                                  ? 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-600'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              {checked && (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                                  <path d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              )}
                            </button>
                          </td>
                        );
                      })}
                      <td className="border-b border-slate-100 dark:border-slate-800 px-3 py-3 text-center">
                        {isCovered ? (
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            {coveredBy.size} TC
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-amber-500 dark:text-amber-400">
                            {t('traceability.noCoverage')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 px-6 py-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {uncovered.length > 0
              ? <span className="text-amber-600 dark:text-amber-400">⚠ {t('traceability.uncoveredHint', { count: uncovered.length })}</span>
              : <span className="text-emerald-600 dark:text-emerald-400">✓ {t('traceability.allCovered')}</span>
            }
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose}
              className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              {t('common.cancel')}
            </button>
            <button type="button" onClick={save} disabled={!dirty || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              {saving ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="3"/><path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M4.5 12.75l6 6 9-13.5" /></svg>
              )}
              {saving ? t('common.saving') : t('traceability.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
