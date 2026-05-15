import React, { useEffect, useState } from 'react';
import { feedbackApi } from '../api/client';
import { useLanguage } from '../context/LanguageContext';

const UTILIDAD_STYLES = {
  muy_util:  'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-emerald-600/20 dark:ring-emerald-400/20',
  util:      'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-emerald-600/20 dark:ring-emerald-400/20',
  poco_util: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-amber-600/20 dark:ring-amber-400/20',
  inutil:    'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 ring-red-600/20 dark:ring-red-400/20'
};

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso.replace(' ', 'T'));
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export default function FeedbackHistory({ versions, onClose }) {
  const { t } = useLanguage();
  const [byVersion, setByVersion] = useState([]);
  const [loading, setLoading] = useState(true);

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
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const sorted = [...(versions || [])].sort((a, b) => b.version - a.version);
        const results = await Promise.all(
          sorted.map(v =>
            feedbackApi.getAll(v.id)
              .then(items => ({ version: v, items: Array.isArray(items) ? items : [] }))
              .catch(() => ({ version: v, items: [] }))
          )
        );
        if (!cancelled) setByVersion(results);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [versions]);

  const total = byVersion.reduce((acc, b) => acc + b.items.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/10">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                <path d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </span>
            <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t('feedbackHistory.title')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('feedbackHistory.close')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{t('feedbackHistory.loading')}</p>
          ) : total === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{t('feedbackHistory.empty')}</p>
          ) : (
            <div className="space-y-5">
              {byVersion.map(({ version, items }) => (
                items.length === 0 ? null : (
                  <section key={version.id}>
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('feedbackHistory.versionLabel', { version: version.version })}
                    </h3>
                    <ul className="space-y-2">
                      {items.map((fb, i) => {
                        const utilStyle = UTILIDAD_STYLES[fb.utilidad] || UTILIDAD_STYLES.util;
                        return (
                          <li key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-sm">
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${utilStyle}`}>
                                {t(`feedback.options.${fb.utilidad}`)}
                              </span>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                {formatDate(fb.created_at)}
                              </span>
                            </div>
                            <p className={`text-sm leading-relaxed ${fb.comentario ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500 italic'}`}>
                              {fb.comentario || t('feedbackHistory.noComment')}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
