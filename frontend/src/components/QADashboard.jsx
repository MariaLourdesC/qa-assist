import React, { useEffect, useState } from 'react';
import { projectsApi } from '../api/client';
import { useLanguage } from '../context/LanguageContext';

const ESTADO_COLORS = {
  draft:      'bg-slate-200 dark:bg-slate-700',
  analyzed:   'bg-emerald-400 dark:bg-emerald-500',
  in_testing: 'bg-blue-400 dark:bg-blue-500',
  passed:     'bg-teal-400 dark:bg-teal-500',
  failed:     'bg-red-400 dark:bg-red-500',
  approved:   'bg-violet-400 dark:bg-violet-500'
};

const SEV_COLORS = {
  critica: { bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
  alta:    { bar: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400' },
  media:   { bar: 'bg-amber-400', text: 'text-amber-600 dark:text-amber-400' },
  baja:    { bar: 'bg-slate-300 dark:bg-slate-600', text: 'text-slate-500 dark:text-slate-400' }
};

function MiniStat({ label, value, valueClass = 'text-slate-900 dark:text-slate-100', suffix }) {
  return (
    <div className="text-center">
      <p className={`text-xl font-bold tracking-tight ${valueClass}`}>
        {value ?? '—'}{suffix && value != null && <span className="text-xs font-normal ml-0.5">{suffix}</span>}
      </p>
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso.replace(' ', 'T')).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }); }
  catch { return '—'; }
}

export default function QADashboard({ projectId, refreshKey }) {
  const { t } = useLanguage();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]     = useState(false);
  const autoOpened          = React.useRef(false);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    projectsApi.getQaStats(projectId)
      .then(d => {
        if (!cancelled) {
          setData(d);
          if (d.executions?.total > 0 && !autoOpened.current) {
            autoOpened.current = true;
            setOpen(true);
          }
        }
      })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId, refreshKey]);

  if (!data || data.executions?.total === 0) return null;

  const { executions, bugs, stories_by_estado, coverage_by_module, recent_executions } = data;
  const totalStories = Object.values(stories_by_estado || {}).reduce((a, b) => a + b, 0);
  const maxBug = Math.max(...Object.values(bugs.by_severity || {}), 1);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {t('qaDashboard.title')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('qaDashboard.subtitle', {
                runs: executions.total,
                rate: executions.pass_rate ?? '—'
              })}
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
          <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-5 space-y-6">

            {/* ── Key metrics ── */}
            <div className="grid grid-cols-4 gap-4">
              <MiniStat
                label={t('qaDashboard.totalRuns')}
                value={executions.total}
              />
              <MiniStat
                label={t('qaDashboard.passRate')}
                value={executions.pass_rate}
                suffix="%"
                valueClass={
                  executions.pass_rate == null ? 'text-slate-400 dark:text-slate-500'
                  : executions.pass_rate >= 80 ? 'text-emerald-600 dark:text-emerald-400'
                  : executions.pass_rate >= 50 ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-600 dark:text-red-400'
                }
              />
              <MiniStat
                label={t('qaDashboard.bugsFound')}
                value={bugs.total}
                valueClass={bugs.total > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}
              />
              <MiniStat
                label={t('qaDashboard.approved')}
                value={stories_by_estado.approved || 0}
                valueClass="text-violet-600 dark:text-violet-400"
              />
            </div>

            {/* ── Story states breakdown ── */}
            {totalStories > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('qaDashboard.storyStates')}
                </p>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  {Object.entries(ESTADO_COLORS).map(([estado, colorClass]) => {
                    const count = stories_by_estado[estado] || 0;
                    if (!count) return null;
                    const pct = (count / totalStories) * 100;
                    return (
                      <div
                        key={estado}
                        className={`${colorClass} transition-all`}
                        style={{ width: `${pct}%` }}
                        title={`${t(`history.estado.${estado}`)}: ${count}`}
                      />
                    );
                  })}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {Object.entries(ESTADO_COLORS).map(([estado, colorClass]) => {
                    const count = stories_by_estado[estado] || 0;
                    if (!count) return null;
                    return (
                      <span key={estado} className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                        <span className={`h-2 w-2 rounded-full ${colorClass}`} />
                        {t(`history.estado.${estado}`)} <span className="font-semibold">{count}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Bug severity ── */}
            {bugs.total > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('qaDashboard.bugsBySeverity')}
                  {bugs.exported > 0 && (
                    <span className="ml-2 font-normal normal-case text-blue-500 dark:text-blue-400">
                      · {t('qaDashboard.exportedToJira', { count: bugs.exported })}
                    </span>
                  )}
                </p>
                <div className="space-y-1.5">
                  {['critica', 'alta', 'media', 'baja'].map(sev => {
                    const count = bugs.by_severity[sev] || 0;
                    const pct   = maxBug > 0 ? (count / maxBug) * 100 : 0;
                    const c     = SEV_COLORS[sev];
                    return (
                      <div key={sev} className="flex items-center gap-2">
                        <span className={`w-12 shrink-0 text-right text-[11px] font-medium ${c.text}`}>
                          {t(`execution.severity.${sev}`)}
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className={`h-full rounded-full ${c.bar} transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-6 shrink-0 text-[11px] font-semibold text-slate-700 dark:text-slate-300">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Coverage by module ── */}
            {coverage_by_module?.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('qaDashboard.coverageByModule')}
                </p>
                <div className="space-y-2">
                  {coverage_by_module.map(mod => {
                    const pct = mod.stories > 0 ? Math.round((mod.qa_ok / mod.stories) * 100) : 0;
                    return (
                      <div key={mod.modulo} className="flex items-center gap-3">
                        <span className="w-28 shrink-0 truncate text-xs font-medium text-slate-700 dark:text-slate-300" title={mod.modulo}>
                          {mod.modulo}
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-[11px]">
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">{mod.qa_ok}✓</span>
                          {mod.qa_fail > 0 && <span className="text-red-500 dark:text-red-400">{mod.qa_fail}✗</span>}
                          {mod.pending > 0 && <span className="text-slate-400 dark:text-slate-500">{mod.pending}⏳</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Recent executions ── */}
            {recent_executions.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('qaDashboard.recentRuns')}
                </p>
                <ul className="space-y-1.5">
                  {recent_executions.map(ex => {
                    const tested = ex.pass + ex.fail + ex.blocked;
                    const pct    = tested > 0 ? Math.round((ex.pass / tested) * 100) : null;
                    return (
                      <li key={ex.id} className="flex items-center gap-3 rounded-lg border border-slate-100 dark:border-slate-800 px-3 py-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${ex.completed_at ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                        <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                          {ex.story_titulo}
                        </p>
                        <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">{formatDate(ex.created_at)}</span>
                        {pct != null && (
                          <span className={`shrink-0 text-[11px] font-semibold tabular-nums ${pct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : pct >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                            {pct}%
                          </span>
                        )}
                        {ex.fail > 0 && (
                          <span className="shrink-0 text-[11px] font-medium text-red-500 dark:text-red-400">
                            {ex.fail}❌
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
