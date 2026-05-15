import React, { useState, useRef } from 'react';
import ItemBadges from '../ItemBadges';
import { useLanguage } from '../../context/LanguageContext';
import JiraExportModal from '../JiraExportModal';
import ExecutionMode from '../ExecutionMode';
import ExecutionHistoryPanel from '../ExecutionHistoryPanel';
import TcTagSelector, { TcTagBadge } from '../TcTagSelector';
import { analysesApi } from '../../api/client';

function EmptyState() {
  const { t } = useLanguage();
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-12 text-center shadow-sm">
      <svg viewBox="0 0 64 64" className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M16 18h32M16 32h32M16 46h20" strokeLinecap="round" />
      </svg>
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('panels.testcases.emptyTitle')}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('panels.testcases.emptyDesc')}</p>
    </div>
  );
}

function TestCaseCard({ tc, expanded, onToggle }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-slate-600">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 rounded-xl p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        <span className="shrink-0 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {tc.id}
        </span>
        <span className="flex-1 text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">{tc.titulo}</span>
        {tcTags[tc.id] && <TcTagBadge tag={tcTags[tc.id]} />}
        <ItemBadges origen={tc.origen} />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} aria-hidden="true">
          <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      <div className="grid transition-all duration-300 ease-out" style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}>
        <div className="overflow-hidden">
          <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 p-4">
            {tc.precondiciones && (
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('panels.testcases.preconditions')}</p>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{tc.precondiciones}</p>
              </div>
            )}
            {tc.pasos && tc.pasos.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('panels.testcases.steps')}</p>
                <ol className="space-y-1.5">
                  {tc.pasos.map((paso, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        {i + 1}
                      </span>
                      <span>{paso}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {tc.resultado_esperado && (
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 p-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-300">{t('panels.testcases.expected')}</p>
                <p className="text-sm leading-relaxed text-emerald-900 dark:text-emerald-100">{tc.resultado_esperado}</p>
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] text-slate-400 dark:text-slate-500">{t('tcTags.label')}</span>
              <TcTagSelector
                analysisId={analysisRunId}
                tcId={tc.id}
                currentTag={tcTags[tc.id] || null}
                onTagChange={handleTagChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TestCasesPanel({ data, storyTitle }) {
  const { t } = useLanguage();
  const items = data?.test_cases || [];
  const [expanded, setExpanded] = useState(() => new Set(items.length > 0 ? [items[0].id] : []));
  const [showExport, setShowExport]       = useState(false);
  const [executionMode, setExecutionMode] = useState(false);
  const [retestIds, setRetestIds]         = useState(null); // null=all, Set=filtered
  const [historyKey, setHistoryKey]       = useState(0);
  const [tcTags, setTcTags]              = useState(data?.tc_tags || {});
  const analysisRunId = data?._analysisRunId;

  const handleTagChange = async (tcId, tag) => {
    const next = { ...tcTags, [tcId]: tag };
    if (!tag) delete next[tcId];
    setTcTags(next);
    if (analysisRunId) await analysesApi.saveTcTags(analysisRunId, next);
  };

  if (items.length === 0) return <EmptyState />;

  // Execution mode takes over the panel
  if (executionMode) {
    return (
      <ExecutionMode
        testCases={retestIds ? items.filter(tc => retestIds.has(tc.id)) : items}
        edgeCases={retestIds ? [] : (data?.negativos_edge_cases || [])}
        tcTags={tcTags}
        analysisRunId={analysisRunId}
        onExit={() => {
          setExecutionMode(false);
          setRetestIds(null);
          setHistoryKey(k => k + 1);
        }}
        onRetest={(failedResults) => {
          const ids = new Set(failedResults.map(r => r.tc_id));
          setRetestIds(ids);
          setExecutionMode(false);
          setTimeout(() => setExecutionMode(true), 50);
        }}
      />
    );
  }

  const toggle = (id) => {
    setExpanded(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  return (
    <>
      <div className="mb-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setExecutionMode(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
          </svg>
          {t('execution.runButton')}
        </button>
        <button
          type="button"
          onClick={() => setShowExport(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-blue-500" aria-hidden="true">
            <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.004-1.005zm5.723-5.756H5.757a5.215 5.215 0 0 0 5.214 5.214h2.131v2.058a5.218 5.218 0 0 0 5.215 5.214V6.762a1.005 1.005 0 0 0-1.023-1.005zM23.013 0H11.47a5.215 5.215 0 0 0 5.215 5.215h2.13v2.057A5.215 5.215 0 0 0 24.018 12.49V1.005A1.005 1.005 0 0 0 23.013 0z"/>
          </svg>
          {t('jira.exportButton')}
        </button>
      </div>

      <div className="space-y-3">
        {items.map(tc => (
          <TestCaseCard key={tc.id} tc={tc} expanded={expanded.has(tc.id)} onToggle={() => toggle(tc.id)} />
        ))}
      </div>

      {showExport && (
        <JiraExportModal
          testCases={items}
          storyTitle={storyTitle || ''}
          onClose={() => setShowExport(false)}
        />
      )}

      <ExecutionHistoryPanel key={historyKey} analysisRunId={analysisRunId} />
    </>
  );
}
