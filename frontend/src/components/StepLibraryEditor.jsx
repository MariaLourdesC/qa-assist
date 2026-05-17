import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const CATEGORIES = ['setup', 'precondition', 'verification', 'teardown', 'util'];

const CAT_COLORS = {
  setup:        'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
  precondition: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
  verification: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
  teardown:     'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  util:         'bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300'
};

function StepRow({ step, pasos, onChangePaso, onAddPaso, onRemovePaso }) {
  return (
    <div className="space-y-1 pl-4">
      {pasos.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500 w-4 text-right">{i + 1}.</span>
          <input
            type="text"
            value={p}
            onChange={e => onChangePaso(i, e.target.value)}
            placeholder={`Paso ${i + 1}…`}
            className="flex-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
          />
          <button type="button" onClick={() => onRemovePaso(i)}
            className="shrink-0 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 focus-visible:outline-none">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
      <button type="button" onClick={onAddPaso}
        className="ml-6 text-xs text-emerald-600 dark:text-emerald-400 hover:underline focus-visible:outline-none">
        + Agregar paso
      </button>
    </div>
  );
}

export default function StepLibraryEditor({ steps = [], onChange }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(null);

  const add = () => {
    const id = Date.now();
    const newStep = { _id: id, title: '', category: 'setup', pasos: [''] };
    onChange([...steps, newStep]);
    setExpanded(id);
  };

  const update = (idx, field, value) => {
    const next = steps.map((s, i) => i === idx ? { ...s, [field]: value } : s);
    onChange(next);
  };

  const updatePaso = (stepIdx, pasoIdx, value) => {
    const next = steps.map((s, i) => {
      if (i !== stepIdx) return s;
      const p = [...s.pasos];
      p[pasoIdx] = value;
      return { ...s, pasos: p };
    });
    onChange(next);
  };

  const addPaso = (stepIdx) => {
    const next = steps.map((s, i) =>
      i === stepIdx ? { ...s, pasos: [...s.pasos, ''] } : s
    );
    onChange(next);
  };

  const removePaso = (stepIdx, pasoIdx) => {
    const next = steps.map((s, i) => {
      if (i !== stepIdx) return s;
      const p = s.pasos.filter((_, j) => j !== pasoIdx);
      return { ...s, pasos: p.length ? p : [''] };
    });
    onChange(next);
  };

  const remove = (idx) => onChange(steps.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {steps.length === 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">
          {t('stepLibrary.empty')}
        </p>
      )}

      {steps.map((step, idx) => {
        const key = step._id || step.id || idx;
        const isOpen = expanded === key;
        return (
          <div key={key} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2">
              <button type="button" onClick={() => setExpanded(isOpen ? null : key)}
                className="flex flex-1 items-center gap-2 text-left focus-visible:outline-none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
                  className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} aria-hidden="true">
                  <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
                <input
                  type="text"
                  value={step.title}
                  onChange={e => { e.stopPropagation(); update(idx, 'title', e.target.value); }}
                  onClick={e => e.stopPropagation()}
                  placeholder={t('stepLibrary.titlePlaceholder')}
                  className="flex-1 bg-transparent text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none"
                />
                <select
                  value={step.category}
                  onChange={e => { e.stopPropagation(); update(idx, 'category', e.target.value); }}
                  onClick={e => e.stopPropagation()}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium border-0 focus-visible:outline-none cursor-pointer ${CAT_COLORS[step.category] || CAT_COLORS.util}`}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{t(`stepLibrary.categories.${c}`)}</option>
                  ))}
                </select>
              </button>
              <button type="button" onClick={() => remove(idx)}
                className="shrink-0 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 focus-visible:outline-none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>

            {/* Steps detail */}
            {isOpen && (
              <div className="border-t border-slate-100 dark:border-slate-800 px-3 py-3">
                <StepRow
                  step={step}
                  pasos={step.pasos}
                  onChangePaso={(pasoIdx, val) => updatePaso(idx, pasoIdx, val)}
                  onAddPaso={() => addPaso(idx)}
                  onRemovePaso={(pasoIdx) => removePaso(idx, pasoIdx)}
                />
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 transition-colors hover:border-emerald-400 dark:hover:border-emerald-600 hover:text-emerald-600 dark:hover:text-emerald-400 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
          <path d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        {t('stepLibrary.addStep')}
      </button>
    </div>
  );
}
