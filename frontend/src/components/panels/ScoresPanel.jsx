import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

function Gauge({ value, label, getColor }) {
  const safe = Math.max(0, Math.min(100, value || 0));
  const radius = 56, stroke = 10;
  const norm = radius - stroke / 2;
  const circ = norm * 2 * Math.PI;
  const offset = circ - (safe / 100) * circ;

  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="relative">
        <svg width="128" height="128" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={norm} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-slate-100 dark:text-slate-700/50" />
          <circle
            cx="64" cy="64" r={norm}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            className={getColor(safe)}
            strokeDasharray={`${circ} ${circ}`}
            strokeDashoffset={offset}
            transform="rotate(-90 64 64)"
            style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{safe}</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">/ 100</span>
        </div>
      </div>
      <p className="mt-4 text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">{label}</p>
    </div>
  );
}

const ambColor  = (v) => v > 70 ? 'text-red-500' : v >= 40 ? 'text-amber-500' : 'text-emerald-500';
const cobColor  = (v) => v > 80 ? 'text-emerald-500' : v >= 50 ? 'text-amber-500' : 'text-red-500';
const compColor = (v) => v > 60 ? 'text-amber-500' : 'text-emerald-500';

function buildInterpretation(meta, t) {
  const a = meta.score_ambiguedad ?? 0;
  const c = meta.score_cobertura ?? 0;
  const x = meta.score_complejidad ?? 0;
  const points = [];
  if (a > 70)       points.push(t('panels.scores.ambHigh'));
  else if (a >= 40) points.push(t('panels.scores.ambMedium'));
  else              points.push(t('panels.scores.ambLow'));
  if (c >= 80)      points.push(t('panels.scores.covHigh'));
  else if (c >= 50) points.push(t('panels.scores.covMedium'));
  else              points.push(t('panels.scores.covLow'));
  if (x > 60)       points.push(t('panels.scores.compHigh'));
  else              points.push(t('panels.scores.compLow'));
  return points;
}

export default function ScoresPanel({ data }) {
  const { t } = useLanguage();
  const meta = data?.meta || {};
  const interpretation = buildInterpretation(meta, t);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Gauge value={meta.score_ambiguedad}  label={t('panels.scores.amb')}   getColor={ambColor} />
        <Gauge value={meta.score_cobertura}   label={t('panels.scores.cob')}   getColor={cobColor} />
        <Gauge value={meta.score_complejidad} label={t('panels.scores.compl')} getColor={compColor} />
      </div>
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true">
            <path d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t('panels.scores.interpretation')}</h3>
        </div>
        <ul className="space-y-2">
          {interpretation.map((p, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
