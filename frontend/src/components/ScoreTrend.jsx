import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const METRICS = [
  { key: 'score_ambiguedad',  labelKey: 'results.scores.amb',   good: v => v <= 40, warn: v => v > 70,  color: { good: 'bg-emerald-500', warn: 'bg-red-500',   mid: 'bg-amber-400' } },
  { key: 'score_cobertura',   labelKey: 'results.scores.cob',   good: v => v >= 80, warn: v => v < 50,  color: { good: 'bg-emerald-500', warn: 'bg-red-500',   mid: 'bg-amber-400' } },
  { key: 'score_complejidad', labelKey: 'results.scores.compl', good: v => v <= 60, warn: v => v > 80,  color: { good: 'bg-emerald-500', warn: 'bg-amber-400', mid: 'bg-slate-400' } }
];

function barColor(metric, value) {
  if (value == null) return 'bg-slate-200 dark:bg-slate-700';
  if (metric.warn(value)) return metric.color.warn;
  if (metric.good(value)) return metric.color.good;
  return metric.color.mid;
}

export default function ScoreTrend({ versions }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  if (!versions || versions.length < 2) return null;

  const sorted = [...versions].sort((a, b) => a.version - b.version);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t('scoreTrend.title')}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('scoreTrend.subtitle', { count: versions.length })}</p>
          </div>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
          className={`h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true">
          <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      <div className="grid transition-all duration-300 ease-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4 space-y-5">
            {METRICS.map(metric => (
              <div key={metric.key}>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t(metric.labelKey)}
                </p>
                <div className="flex items-end gap-2">
                  {sorted.map(v => {
                    const val = v.meta?.[metric.key];
                    const pct = val != null ? val : 0;
                    const color = barColor(metric, val);
                    return (
                      <div key={v.id} className="flex flex-1 flex-col items-center gap-1">
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 tabular-nums">
                          {val ?? '—'}
                        </span>
                        <div className="relative w-full rounded-t overflow-hidden bg-slate-100 dark:bg-slate-800" style={{ height: '48px' }}>
                          <div
                            className={`absolute bottom-0 w-full rounded-t transition-all duration-500 ${color}`}
                            style={{ height: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">v{v.version}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Delta summary */}
            {sorted.length >= 2 && (() => {
              const first = sorted[0];
              const last  = sorted[sorted.length - 1];
              const deltas = METRICS.map(m => ({
                label: t(m.labelKey),
                delta: (last.meta?.[m.key] ?? 0) - (first.meta?.[m.key] ?? 0)
              }));
              return (
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 px-4 py-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('scoreTrend.delta', { from: `v${first.version}`, to: `v${last.version}` })}
                  </p>
                  <div className="flex gap-4">
                    {deltas.map(({ label, delta }) => (
                      <div key={label} className="text-center">
                        <p className={`text-sm font-bold ${delta === 0 ? 'text-slate-400 dark:text-slate-500' : delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {delta > 0 ? '+' : ''}{delta}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
