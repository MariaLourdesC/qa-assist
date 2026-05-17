import React, { useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { executionsApi } from '../api/client';
import BugReportForm from './BugReportForm';
import ExecutionSummary from './ExecutionSummary';

const STATUS_BTN = {
  pass:    { label: '✅', title: 'execution.status.pass',    active: 'bg-emerald-600 text-white ring-emerald-600',    base: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300' },
  fail:    { label: '❌', title: 'execution.status.fail',    active: 'bg-red-600 text-white ring-red-600',            base: 'hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-300' },
  blocked: { label: '⏸', title: 'execution.status.blocked', active: 'bg-amber-500 text-white ring-amber-500',        base: 'hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300' },
  skip:    { label: '⏭', title: 'execution.status.skip',    active: 'bg-slate-500 text-white ring-slate-500',        base: 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300' }
};

const TAG_FILTER_LABELS = { all: null, smoke: 'smoke', regression: 'regression', funcional: 'funcional', exploratorio: 'exploratorio' };

export default function ExecutionMode({ testCases, edgeCases = [], tcTags = {}, analysisRunId, projectId, onExit, onRetest }) {
  const { t } = useLanguage();
  const { addToast } = useToast();

  // Normalize edge cases to share the same shape as test cases
  const normalizedEdgeCases = edgeCases.map(ec => ({
    ...ec,
    titulo: ec.descripcion || ec.id,
    _type: 'ec'
  }));
  const normalizedTestCases = testCases.map(tc => ({ ...tc, _type: 'tc' }));
  const allItems = [...normalizedTestCases, ...normalizedEdgeCases]
    .filter(tc => tagFilter === 'all' || tcTags[tc.id] === tagFilter);

  // results: { [id]: { status, bug_titulo, bug_pasos_reales, bug_severidad, bug_ambiente, bug_screenshot_url } }
  const [results, setResults]     = useState({});
  const [saving, setSaving]       = useState({});
  const [execution, setExecution] = useState(null);
  const [starting, setStarting]   = useState(false);
  const [execId, setExecId]       = useState(null);
  const [environment, setEnvironment] = useState('');
  const [tagFilter, setTagFilter]   = useState('all');
  const [phase, setPhase]         = useState('setup');

  const doneCount = allItems.filter(tc => results[tc.id]?.status && results[tc.id].status !== 'pending').length;
  const bugCount  = allItems.filter(tc => ['fail','blocked'].includes(results[tc.id]?.status)).length;
  const progress  = allItems.length ? Math.round((doneCount / allItems.length) * 100) : 0;

  const startExecution = async () => {
    setStarting(true);
    try {
      const data = await executionsApi.create({
        analysis_run_id: analysisRunId,
        test_cases: allItems.map(tc => ({ id: tc.id, titulo: tc.titulo })),
        environment: environment || null
      });
      setExecId(data.id);
      setPhase('running');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setStarting(false);
    }
  };

  const setStatus = useCallback(async (tc, status) => {
    const prev = results[tc.id] || {};
    const updated = { ...prev, status };

    // Clear bug fields when switching to non-failure status
    if (status !== 'fail' && status !== 'blocked') {
      updated.bug_titulo = '';
      updated.bug_pasos_reales = '';
      updated.bug_severidad = 'media';
      updated.bug_ambiente = '';
      updated.bug_screenshot_url = '';
    } else if (!updated.bug_severidad) {
      updated.bug_severidad = 'media';
    }

    setResults(prev => ({ ...prev, [tc.id]: updated }));

    setSaving(prev => ({ ...prev, [tc.id]: true }));
    try {
      await executionsApi.updateResult(execId, { tc_id: tc.id, ...updated });
    } catch {
      // silent — local state is the source of truth during execution
    } finally {
      setSaving(prev => ({ ...prev, [tc.id]: false }));
    }
  }, [results, execId]);

  const updateBug = useCallback(async (tcId, bugData) => {
    setResults(prev => ({ ...prev, [tcId]: { ...prev[tcId], ...bugData } }));
    if (!execId) return;
    setSaving(prev => ({ ...prev, [tcId]: true }));
    try {
      await executionsApi.updateResult(execId, { tc_id: tcId, ...results[tcId], ...bugData });
    } catch {}
    finally { setSaving(prev => ({ ...prev, [tcId]: false })); }
  }, [results, execId]);

  const finalize = async () => {
    if (!execId) return;
    try {
      await executionsApi.complete(execId, { notes: null });
      const data = await executionsApi.getById(execId);
      setExecution(data);
      setPhase('summary');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // ── Setup phase ─────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t('execution.title')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('execution.subtitle', { count: allItems.length })}
              {normalizedEdgeCases.length > 0 && ` (${testCases.length} TC + ${normalizedEdgeCases.length} EC)`}
            </p>
          </div>
          <button type="button" onClick={onExit} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
            {t('execution.cancel')}
          </button>
        </div>
        <div>
          <label htmlFor="exec-env" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('execution.environment')} <span className="text-xs font-normal text-slate-400">{t('common.optional')}</span>
          </label>
          <input id="exec-env" type="text" value={environment} onChange={e => setEnvironment(e.target.value)}
            placeholder={t('execution.environmentPlaceholder')}
            className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1" />
        </div>
        {Object.keys(tcTags).length > 0 && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('tcTags.filterLabel')}</label>
            <div className="flex flex-wrap gap-1.5">
              {['all', 'smoke', 'regression', 'funcional', 'exploratorio'].map(f => (
                <button key={f} type="button" onClick={() => setTagFilter(f)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    tagFilter === f ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}>
                  {f === 'all' ? t('history.filter.all') : t(`tcTags.${f}`, f)}
                </button>
              ))}
            </div>
          </div>
        )}

        <button type="button" onClick={startExecution} disabled={starting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
          {starting ? (
            <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="3"/><path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>{t('common.loading')}</>
          ) : (
            <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"/></svg>{t('execution.start')}</>
          )}
        </button>
      </div>
    );
  }

  // ── Summary phase ────────────────────────────────────────────────────────
  if (phase === 'summary' && execution) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <ExecutionSummary
          execution={execution}
          onClose={() => setPhase('running')}
          onNewRun={onExit}
          onRetest={onRetest}
        />
      </div>
    );
  }

  // ── Running phase ────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('execution.running')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('execution.progress', { done: doneCount, total: allItems.length })}
              {bugCount > 0 && ` · ${t('execution.bugsCount', { count: bugCount })}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {doneCount === testCases.length && (
              <button type="button" onClick={finalize}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                {t('execution.finalize')}
              </button>
            )}
            <button type="button" onClick={onExit} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
              {t('execution.exit')}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* TC + EC list with section headers */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {allItems.map((tc, idx) => {
          const isFirstEC = tc._type === 'ec' && (idx === 0 || allItems[idx - 1]._type === 'tc');
          const isFirstTC = tc._type === 'tc' && idx === 0;
          const result  = results[tc.id] || {};
          const status  = result.status;
          const hasBug  = status === 'fail' || status === 'blocked';

          return (
            <React.Fragment key={tc.id}>
              {/* Section header */}
              {(isFirstTC && normalizedEdgeCases.length > 0) && (
                <div className="bg-slate-50 dark:bg-slate-800/40 px-5 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('execution.sectionTc', { count: normalizedTestCases.length })}
                  </p>
                </div>
              )}
              {isFirstEC && (
                <div className="bg-orange-50/60 dark:bg-orange-950/20 px-5 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                    {t('execution.sectionEc', { count: normalizedEdgeCases.length })}
                  </p>
                </div>
              )}

            <div className="px-5 py-4">
              <div className="flex items-start gap-3">
                {/* item info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-medium ${
                      tc._type === 'ec'
                        ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      {tc.id}
                    </span>
                    {saving[tc.id] && (
                      <svg className="h-3 w-3 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="3"/>
                        <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{tc.titulo}</p>
                </div>

                {/* Status buttons */}
                <div className="flex shrink-0 flex-wrap items-center gap-1">
                  {Object.entries(STATUS_BTN).map(([s, cfg]) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(tc, s)}
                      title={t(cfg.title)}
                      aria-label={t(cfg.title)}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                        status === s
                          ? `${cfg.active} ring-2`
                          : `ring-slate-200 dark:ring-slate-700 text-slate-400 dark:text-slate-500 ${cfg.base}`
                      }`}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inline bug form */}
              {hasBug && (
                <BugReportForm
                  bug={result}
                  tcTitulo={tc.titulo}
                  projectId={projectId}
                  onChange={bugData => updateBug(tc.id, bugData)}
                />
              )}
            </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Footer */}
      {doneCount === allItems.length && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4">
          <button type="button" onClick={finalize}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {t('execution.finalize')}
          </button>
        </div>
      )}
    </div>
  );
}
