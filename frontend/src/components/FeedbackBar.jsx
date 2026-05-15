import React, { useState, useEffect } from 'react';
import CopyButton from './CopyButton';
import FeedbackHistory from './FeedbackHistory';
import { useLanguage } from '../context/LanguageContext';
import { feedbackApi } from '../api/client';

const OPTION_IDS = ['muy_util', 'util', 'poco_util', 'inutil'];

const ICONS = {
  muy_util: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" /></svg>),
  util:      (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
  poco_util: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M9.75 9.75h.008v.008H9.75V9.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0h.008v.008h-.008V9.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM9 15.75h6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
  inutil:    (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M7.5 15a4.484 4.484 0 00-1.392-3.247 4.484 4.484 0 011.392-3.247m0 6.494c.39.07.79.107 1.197.107a6.96 6.96 0 005.276-2.404m-6.473 2.297a6.972 6.972 0 01-1.5-4.397c0-1.643.567-3.155 1.515-4.353m4.958 6.45c.39.07.79.107 1.197.107a6.96 6.96 0 005.276-2.404M9.5 7.5L21 12l-7 7-1.5-3.5L7.5 14l2-6.5z" /></svg>)
};

export default function FeedbackBar({ analysisRunId, onSubmit, versions }) {
  const { t } = useLanguage();
  const [utilidad, setUtilidad] = useState(null);
  const [comentario, setComentario] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const hasHistory = (versions || []).length > 0;

  // When analysis run changes: reset form then load previous feedback
  useEffect(() => {
    setUtilidad(null);
    setComentario('');
    setSaved(false);
    setPrefilled(false);
    if (!analysisRunId) return;

    setLoadingPrev(true);
    feedbackApi.getAll(analysisRunId)
      .then(data => {
        const latest = Array.isArray(data) && data.length > 0 ? data[0] : null;
        if (latest) {
          setUtilidad(latest.utilidad);
          setComentario(latest.comentario || '');
          setPrefilled(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPrev(false));
  }, [analysisRunId]);
  const OPTIONS = OPTION_IDS.map(id => ({
    id,
    label: t(`feedback.options.${id}`),
    desc: t(`feedback.options.${id}_desc`)
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!utilidad || saving) return;
    setSaving(true);
    try {
      await onSubmit({ analysis_run_id: analysisRunId, utilidad, comentario });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const copyText = `Run #${analysisRunId} · Utilidad: ${utilidad || '—'}\n${comentario || ''}`.trim();

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t('feedback.title')}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('feedback.subtitle')}</p>
          </div>
        </div>
        {loadingPrev && (
          <svg className="h-4 w-4 animate-spin text-slate-400 dark:text-slate-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
            <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
        {prefilled && !loadingPrev && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
              <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('feedback.prevLoaded')}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div role="radiogroup" aria-label={t('feedback.title')} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {OPTIONS.map(opt => {
            const isActive = utilidad === opt.id;
            return (
              <button key={opt.id} type="button" role="radio" aria-checked={isActive} onClick={() => setUtilidad(opt.id)}
                className={`flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                  isActive ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 ring-1 ring-inset ring-emerald-600/20 dark:ring-emerald-400/20'
                           : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}>
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>{ICONS[opt.id]}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{opt.label}</p>
                  <p className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div>
          <label htmlFor="comentario" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('feedback.comment')} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">{t('common.optional')}</span>
          </label>
          <textarea id="comentario" rows={3} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder={t('feedback.commentPlaceholder')}
            className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors duration-200 hover:border-slate-300 dark:hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1" />
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <CopyButton content={copyText} label={t('feedback.copy')} />
            {hasHistory && (
              <button
                type="button"
                onClick={() => setShowHistory(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('feedbackHistory.label')}
              </button>
            )}
          </div>
          <button type="submit" disabled={!utilidad || saving || saved}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
            {saving ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                  <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                {t('feedback.saving')}
              </>
            ) : saved ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {t('feedback.savedBtn')}
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M6 12L3.269 3.125A59.769 59.769 0 0121.485 12 59.768 59.768 0 013.27 20.875L6 12zm0 0h7.5" /></svg>
                {t('feedback.save')}
              </>
            )}
          </button>
        </div>
      </form>

      {showHistory && (
        <FeedbackHistory
          versions={versions}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}
