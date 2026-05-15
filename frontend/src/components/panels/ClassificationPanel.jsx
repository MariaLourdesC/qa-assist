import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

function ConfidenceGauge({ value }) {
  const { t } = useLanguage();
  const pct = Math.round((value || 0) * 100);
  const radius = 36, stroke = 6;
  const norm = radius - stroke / 2;
  const circ = norm * 2 * Math.PI;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 70 ? 'text-emerald-500' : pct >= 40 ? 'text-amber-500' : 'text-red-500';
  const label = pct >= 70 ? t('panels.classification.confidenceHigh') : pct >= 40 ? t('panels.classification.confidenceMedium') : t('panels.classification.confidenceLow');

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={norm} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-slate-100 dark:text-slate-700/50" />
          <circle
            cx="40" cy="40" r={norm}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            className={color}
            strokeDasharray={`${circ} ${circ}`}
            strokeDashoffset={offset}
            transform="rotate(-90 40 40)"
            style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-semibold text-slate-900 dark:text-slate-100">{pct}%</span>
        </div>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('panels.classification.confidence')}</p>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</p>
      </div>
    </div>
  );
}

export default function ClassificationPanel({ data }) {
  const { t } = useLanguage();
  const c = data?.clasificacion_funcional || {};
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('panels.classification.primaryType')}</p>
          <p className="text-2xl font-semibold capitalize tracking-tight text-slate-900 dark:text-slate-100">
            {c.tipo_primario
              ? (() => {
                  const translated = t(`tipos.${c.tipo_primario}`);
                  return translated === `tipos.${c.tipo_primario}` ? c.tipo_primario : translated;
                })()
              : <span className="font-normal italic text-slate-400 dark:text-slate-500">{t('panels.classification.notDetermined')}</span>}
          </p>
        </div>
        {c.confianza != null && <ConfidenceGauge value={c.confianza} />}
      </div>
      {c.subtipos && c.subtipos.length > 0 && (
        <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('panels.classification.subtypes')}</p>
          <div className="flex flex-wrap gap-1.5">
            {c.subtipos.map((s, i) => {
              const translated = t(`tipos.${s}`);
              const label = translated === `tipos.${s}` ? s : translated;
              return (
                <span key={i} className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-600/10 dark:ring-emerald-400/20">
                  {label}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
