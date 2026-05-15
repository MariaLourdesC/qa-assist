import React, { useEffect, useMemo, useState } from 'react';
import { diffAnalyses } from '../utils/diffAnalysis';
import { useLanguage } from '../context/LanguageContext';

const BLOCKS = [
  'ambiguedades',
  'preguntas_refinamiento',
  'criterios_aceptacion',
  'test_cases',
  'negativos_edge_cases',
  'riesgos'
];

function ItemRow({ item, field, variant }) {
  const variantClasses = {
    added:     'border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100',
    removed:   'border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-950/30 text-red-900 dark:text-red-100',
    unchanged: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
  };
  const sign = { added: '+', removed: '−', unchanged: '·' };
  const signClass = {
    added:     'bg-emerald-600 text-white',
    removed:   'bg-red-600 text-white',
    unchanged: 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
  };
  return (
    <li className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 ${variantClasses[variant]}`}>
      <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-xs font-bold ${signClass[variant]}`}>
        {sign[variant]}
      </span>
      <div className="min-w-0 flex-1 text-sm leading-relaxed">
        <span className="font-mono text-[10px] mr-1.5 opacity-60">{item.id}</span>
        {item[field]}
      </div>
    </li>
  );
}

export default function VersionCompare({ versions, currentVersion, onClose }) {
  const { t } = useLanguage();

  // Por defecto: izquierda = más antigua que la actual; derecha = actual
  const sorted = useMemo(() => {
    const arr = [...(versions || [])].sort((a, b) => a.version - b.version);
    return arr;
  }, [versions]);

  const findIdx = (id) => sorted.findIndex(v => v.id === id);
  const currentIdx = findIdx(currentVersion);

  const [leftId, setLeftId] = useState(() => {
    if (currentIdx > 0) return sorted[currentIdx - 1].id;
    if (sorted.length > 1) return sorted[0].id;
    return sorted[0]?.id;
  });
  const [rightId, setRightId] = useState(() => currentVersion ?? sorted[sorted.length - 1]?.id);
  const [activeBlock, setActiveBlock] = useState(BLOCKS[0]);

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

  if (sorted.length < 2) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl shadow-slate-900/10">
          <p className="text-sm text-slate-700 dark:text-slate-300">{t('compare.needTwoVersions')}</p>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              {t('compare.close')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const left = sorted.find(v => v.id === leftId) || sorted[0];
  const right = sorted.find(v => v.id === rightId) || sorted[sorted.length - 1];
  const diff = diffAnalyses(left, right);
  const blockDiff = diff.blocks[activeBlock] || { added: [], removed: [], unchanged: [] };
  const field = diff.fieldByBlock[activeBlock];

  const VersionPicker = ({ value, onChange, label }) => (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="appearance-none rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1.5 pl-3 pr-8 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          {sorted.map(v => (
            <option key={v.id} value={v.id}>v{v.version} · {new Date(v.created_at).toLocaleDateString()}</option>
          ))}
        </select>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden="true">
          <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/10">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                <path d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
              </svg>
            </span>
            <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t('compare.title')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('compare.close')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Selectors */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <VersionPicker value={leftId}  onChange={setLeftId}  label={t('compare.leftVersion')} />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true">
              <path d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
            </svg>
            <VersionPicker value={rightId} onChange={setRightId} label={t('compare.rightVersion')} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('compare.summary', diff.summary)}
          </p>
        </div>

        {/* Block tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
          <nav className="-mb-px flex gap-1 px-6">
            {BLOCKS.map(b => {
              const isActive = activeBlock === b;
              const d = diff.blocks[b] || { added: [], removed: [] };
              const changes = d.added.length + d.removed.length;
              return (
                <button
                  key={b}
                  onClick={() => setActiveBlock(b)}
                  className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                    isActive
                      ? 'border-emerald-600 text-emerald-600'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {t(`compare.blocks.${b}`)}
                  {changes > 0 && (
                    <span className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                      isActive ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {changes}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {blockDiff.added.length === 0 && blockDiff.removed.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{t('compare.noChanges')}</p>
          ) : (
            <>
              {blockDiff.removed.length > 0 && (
                <section>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
                    {t('compare.removed')} ({blockDiff.removed.length})
                  </h3>
                  <ul className="space-y-1.5">
                    {blockDiff.removed.map((item, i) => (
                      <ItemRow key={`r-${i}`} item={item} field={field} variant="removed" />
                    ))}
                  </ul>
                </section>
              )}
              {blockDiff.added.length > 0 && (
                <section>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {t('compare.added')} ({blockDiff.added.length})
                  </h3>
                  <ul className="space-y-1.5">
                    {blockDiff.added.map((item, i) => (
                      <ItemRow key={`a-${i}`} item={item} field={field} variant="added" />
                    ))}
                  </ul>
                </section>
              )}
              {blockDiff.unchanged.length > 0 && (
                <section>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('compare.unchanged')} ({blockDiff.unchanged.length})
                  </h3>
                  <ul className="space-y-1.5">
                    {blockDiff.unchanged.map((item, i) => (
                      <ItemRow key={`u-${i}`} item={item} field={field} variant="unchanged" />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
