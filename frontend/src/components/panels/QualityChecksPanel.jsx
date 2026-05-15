import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

const CHECK_KEYS = [
  'cobertura_minima',
  'casos_accionables',
  'sin_supuestos_no_soportados',
  'riesgos_relevantes',
  'sin_redundancia_excesiva',
  'preguntas_refinamiento_utiles'
];

function CheckCard({ ok, label, desc }) {
  return (
    <div className="group relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-slate-600">
      <div className="flex items-center gap-3">
        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'}`}>
          {ok ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </span>
        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</span>
      </div>
      <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-lg bg-slate-900 dark:bg-slate-100 px-3 py-2 text-xs leading-relaxed text-slate-100 dark:text-slate-800 opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
        {desc}
        <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-900 dark:bg-slate-100" />
      </div>
    </div>
  );
}

function RefinementBanner({ requires }) {
  const { t } = useLanguage();
  if (requires) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 p-5 shadow-sm">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
            <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">{t('panels.quality.refinementTitle')}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-amber-800 dark:text-amber-200">
            {t('panels.quality.refinementDesc')}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 p-5 shadow-sm">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
          <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </span>
      <div>
        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">{t('panels.quality.readyTitle')}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-emerald-800 dark:text-emerald-200">
          {t('panels.quality.readyDesc')}
        </p>
      </div>
    </div>
  );
}

export default function QualityChecksPanel({ data }) {
  const { t } = useLanguage();
  const q = data?.quality_checks || {};
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {CHECK_KEYS.map(key => (
          <CheckCard
            key={key}
            ok={!!q[key]}
            label={t(`panels.quality.checks.${key}`)}
            desc={t(`panels.quality.checks.${key}_desc`)}
          />
        ))}
      </div>
      <RefinementBanner requires={!!q.requiere_refinamiento_humano} />
    </div>
  );
}
