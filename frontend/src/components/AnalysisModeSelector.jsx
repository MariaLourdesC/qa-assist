import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const MODE_ICONS = {
  local_only: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" /></svg>),
  hybrid:     (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>)
};

export default function AnalysisModeSelector({ value, onChange, projectSensitivity }) {
  const { t } = useLanguage();
  const MODES = [
    { id: 'local_only', label: t('analysisMode.localOnly'), desc: t('analysisMode.localOnlyDesc'), icon: MODE_ICONS.local_only },
    { id: 'hybrid',     label: t('analysisMode.hybrid'),    desc: t('analysisMode.hybridDesc'),    icon: MODE_ICONS.hybrid }
  ];
  const HYBRID_BLOCKS = [
    t('analysisMode.iaBlocks.ambiguities'),
    t('analysisMode.iaBlocks.questions'),
    t('analysisMode.iaBlocks.risks'),
    t('analysisMode.iaBlocks.edges')
  ];
  const isRestricted = projectSensitivity === 'restringido';
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
            <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </span>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t('analysisMode.title')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('analysisMode.subtitle')}</p>
        </div>
      </div>

      <div role="radiogroup" aria-label={t('analysisMode.title')} className="grid gap-3 sm:grid-cols-2">
        {MODES.map(mode => {
          const isActive = value === mode.id;
          const isDisabled = mode.id === 'hybrid' && isRestricted;
          return (
            <button key={mode.id} type="button" role="radio" aria-checked={isActive} aria-disabled={isDisabled} disabled={isDisabled} onClick={() => !isDisabled && onChange(mode.id)}
              className={`flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                isDisabled ? 'cursor-not-allowed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-60'
                  : isActive ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 ring-1 ring-inset ring-emerald-600/20 dark:ring-emerald-400/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}>
              <div className="flex w-full items-center justify-between">
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>{mode.icon}</span>
                {isActive && (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true"><path d="M4.5 12.75l6 6 9-13.5" /></svg>
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">{mode.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{mode.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {isRestricted && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 p-3.5">
          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">{t('analysisMode.blockedTitle')}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-800 dark:text-amber-200">{t('analysisMode.blockedDesc')}</p>
          </div>
        </div>
      )}

      {value === 'hybrid' && !isRestricted && (
        <div className="mt-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 p-4">
          <div className="mb-2 flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-emerald-700 dark:text-emerald-300" aria-hidden="true"><path d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">{t('analysisMode.iaBlocksTitle')}</p>
          </div>
          <ul className="grid gap-1 sm:grid-cols-2">
            {HYBRID_BLOCKS.map(b => (
              <li key={b} className="flex items-center gap-2 text-xs text-emerald-900/80 dark:text-emerald-100/80">
                <span className="h-1 w-1 rounded-full bg-emerald-500" aria-hidden="true" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
