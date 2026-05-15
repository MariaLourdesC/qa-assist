import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { executionsApi } from '../api/client';
import ExecutionSummary from './ExecutionSummary';

function formatDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso.replace(' ', 'T')).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }); }
  catch { return iso; }
}

function StatBadge({ value, colorClass, label }) {
  if (!value) return null;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${colorClass}`} title={label}>
      {value}
    </span>
  );
}

export default function ExecutionHistoryPanel({ analysisRunId }) {
  const { t } = useLanguage();
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [open, setOpen]             = useState(false);
  const [selected, setSelected]     = useState(null); // full execution for summary view
  const [loadingDetail, setLoadingDetail] = useState(false);
  const autoOpened = useRef(false);

  useEffect(() => {
    if (!analysisRunId) return;
    setLoading(true);
    executionsApi.getAll(analysisRunId)
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setExecutions(list);
        if (list.length > 0 && !autoOpened.current) {
          autoOpened.current = true;
          setOpen(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [analysisRunId]);

  const loadDetail = async (exec) => {
    setLoadingDetail(true);
    try {
      const detail = await executionsApi.getById(exec.id);
      setSelected(detail);
    } catch {}
    finally { setLoadingDetail(false); }
  };

  if (!analysisRunId || (executions.length === 0 && !loading)) return null;

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {t('execution.history.title')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {loading
                ? t('common.loading')
                : t('execution.history.count', { count: executions.length })}
            </p>
          </div>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
          className={`h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true">
          <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Collapsible body */}
      <div className="grid transition-all duration-300 ease-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4">
            {selected ? (
              /* ── Detail / summary view ───────────────────────────────── */
              <div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 focus-visible:outline-none"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                    <path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  {t('execution.history.backToList')}
                </button>
                <ExecutionSummary
                  execution={selected}
                  storyTitle={selected?.story_titulo}
                  onClose={() => setSelected(null)}
                  onNewRun={() => setSelected(null)}
                />
              </div>
            ) : (
              /* ── List view ───────────────────────────────────────────── */
              <ul className="space-y-2">
                {executions.map(exec => {
                  const s = exec.stats || {};
                  const isComplete = !!exec.completed_at;
                  return (
                    <li key={exec.id}>
                      <button
                        type="button"
                        onClick={() => loadDetail(exec)}
                        disabled={loadingDetail}
                        className="group flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-left transition-colors hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-60"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`inline-flex h-2 w-2 rounded-full ${isComplete ? 'bg-emerald-500' : 'bg-amber-400'}`} aria-hidden="true" />
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                              {exec.environment || t('execution.history.noEnvironment')}
                            </p>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatDate(exec.created_at)}
                            {exec.total ? ` · ${exec.total} ${t('execution.history.cases')}` : ''}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          <StatBadge value={s.pass}    label={t('execution.status.pass')}    colorClass="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" />
                          <StatBadge value={s.fail}    label={t('execution.status.fail')}    colorClass="bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300" />
                          <StatBadge value={s.blocked} label={t('execution.status.blocked')} colorClass="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300" />
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
                            className="ml-1 h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-500 transition-colors" aria-hidden="true">
                            <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
