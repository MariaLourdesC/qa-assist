import React, { useState } from 'react';
import VersionSelector from './VersionSelector';
import ExportMenu from './ExportMenu';
import VersionCompare from './VersionCompare';
import RewriteSuggestion from './RewriteSuggestion';
import TraceabilityMatrix from './TraceabilityMatrix';
import { useLanguage } from '../context/LanguageContext';
import StructurePanel from './panels/StructurePanel';
import ClassificationPanel from './panels/ClassificationPanel';
import AmbiguitiesPanel from './panels/AmbiguitiesPanel';
import QuestionsPanel from './panels/QuestionsPanel';
import CriteriaPanel from './panels/CriteriaPanel';
import TestCasesPanel from './panels/TestCasesPanel';
import EdgeCasesPanel from './panels/EdgeCasesPanel';
import RisksPanel from './panels/RisksPanel';
import QualityChecksPanel from './panels/QualityChecksPanel';
import ScoresPanel from './panels/ScoresPanel';

const TABS = [
  { id: 'structure',      key: 'tabs.structure',      component: StructurePanel },
  { id: 'classification', key: 'tabs.classification', component: ClassificationPanel },
  { id: 'ambiguities',    key: 'tabs.ambiguities',    component: AmbiguitiesPanel,    count: a => a.resultado?.ambiguedades?.length },
  { id: 'questions',      key: 'tabs.questions',      component: QuestionsPanel,      count: a => a.resultado?.preguntas_refinamiento?.length },
  { id: 'criteria',       key: 'tabs.criteria',       component: CriteriaPanel,       count: a => a.resultado?.criterios_aceptacion?.length },
  { id: 'testcases',      key: 'tabs.testcases',      component: TestCasesPanel,      count: a => a.resultado?.test_cases?.length },
  { id: 'edges',          key: 'tabs.edges',          component: EdgeCasesPanel,      count: a => a.resultado?.negativos_edge_cases?.length },
  { id: 'risks',          key: 'tabs.risks',          component: RisksPanel,          count: a => a.resultado?.riesgos?.length },
  { id: 'quality',        key: 'tabs.quality',        component: QualityChecksPanel },
  { id: 'scores',         key: 'tabs.scores',         component: ScoresPanel }
];

const ambColor  = (v) => v > 70 ? 'red'     : v >= 40 ? 'amber' : 'emerald';
const cobColor  = (v) => v > 80 ? 'emerald' : v >= 50 ? 'amber' : 'red';
const compColor = (v) => v > 60 ? 'amber'   : 'emerald';

const CHIP_COLORS = {
  red:     { bg: 'bg-red-50 dark:bg-red-950/40',         text: 'text-red-700 dark:text-red-300',         ring: 'ring-red-600/20 dark:ring-red-400/20',         dot: 'bg-red-500' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-950/40',     text: 'text-amber-800 dark:text-amber-200',     ring: 'ring-amber-600/20 dark:ring-amber-400/20',     dot: 'bg-amber-500' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', ring: 'ring-emerald-600/20 dark:ring-emerald-400/20', dot: 'bg-emerald-500' }
};

function ScoreChip({ label, value, color }) {
  const c = CHIP_COLORS[color];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${c.bg} ${c.text} ${c.ring}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} aria-hidden="true" />
      {label}
      <span className="font-semibold">{value}</span>
    </span>
  );
}

export default function ResultTabs({ analysis, versions, currentVersion, onVersionChange, onVersionDelete, projectName, storyTitle, onRewriteApply }) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [showCompare, setShowCompare]         = useState(false);
  const [showRewrite, setShowRewrite]         = useState(false);
  const [showTraceability, setShowTraceability] = useState(false);
  const meta = analysis?.meta || {};
  const data = { ...(analysis?.resultado || {}), meta, quality_checks: analysis?.quality_checks || {}, _analysisRunId: analysis?.id, _projectId: analysis?.project_id };
  const ActivePanel = TABS.find(tab => tab.id === activeTab)?.component;
  const canCompare    = (versions || []).length >= 2;
  const hasCriteria   = (analysis?.resultado?.criterios_aceptacion || []).length > 0;
  const hasTestCases  = (analysis?.resultado?.test_cases || []).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <VersionSelector versions={versions} current={currentVersion} onChange={onVersionChange} onDelete={onVersionDelete} />
        <div className="flex flex-wrap items-center gap-2">
          {meta.score_ambiguedad  != null && <ScoreChip label={t('results.scores.amb')}   value={meta.score_ambiguedad}  color={ambColor(meta.score_ambiguedad)} />}
          {meta.score_cobertura   != null && <ScoreChip label={t('results.scores.cob')}   value={meta.score_cobertura}   color={cobColor(meta.score_cobertura)} />}
          {meta.score_complejidad != null && <ScoreChip label={t('results.scores.compl')} value={meta.score_complejidad} color={compColor(meta.score_complejidad)} />}
          {meta.lang && (
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 ring-slate-600/20 dark:ring-slate-400/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
                <path d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
              </svg>
              <span className="font-semibold uppercase">{meta.lang}</span>
            </span>
          )}
          {meta.from_cache && (
            <span title={t('results.fromCacheTitle')} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 ring-violet-600/20 dark:ring-violet-400/20">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3" aria-hidden="true">
                <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.268a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
              </svg>
              {t('results.fromCache')}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowRewrite(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-950/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
            {t('rewrite.label')}
          </button>

          {canCompare && (
            <button
              type="button"
              onClick={() => setShowCompare(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
              </svg>
              {t('compare.label')}
            </button>
          )}
          {hasCriteria && hasTestCases && (
            <button
              type="button"
              onClick={() => setShowTraceability(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75.125v-2.25M6 18.375V9a.375.375 0 00-.375-.375H4.5m13.5 9.375h1.5c.621 0 1.125-.504 1.125-1.125M19.5 19.5v-2.25M19.5 9H4.5m15 0a.375.375 0 01.375.375v6.75M4.5 9V6.75m0 0h15M4.5 6.75a.375.375 0 01.375-.375h14.25a.375.375 0 01.375.375V9" />
              </svg>
              {t('traceability.button')}
            </button>
          )}
          <ExportMenu analysis={analysis} projectName={projectName} />
        </div>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex gap-1 overflow-x-auto" role="tablist">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const count = tab.count ? tab.count(analysis) : null;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                  isActive
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {t(tab.key)}
                {count != null && (
                  <span className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                    isActive
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div role="tabpanel" className="min-h-[200px]">
        {ActivePanel && <ActivePanel data={data} storyTitle={storyTitle} />}
      </div>

      {showCompare && (
        <VersionCompare
          versions={versions}
          currentVersion={currentVersion}
          onClose={() => setShowCompare(false)}
        />
      )}

      {showTraceability && (
        <TraceabilityMatrix analysis={analysis} onClose={() => setShowTraceability(false)} />
      )}

      {showRewrite && (
        <RewriteSuggestion
          analysisId={analysis.id}
          onApply={onRewriteApply}
          onClose={() => setShowRewrite(false)}
        />
      )}
    </div>
  );
}
