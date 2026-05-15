import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { executionsApi } from '../api/client';

const DEFAULT_ITEMS = [
  'checklist.testedStaging',
  'checklist.mobileVerified',
  'checklist.dbStateChecked',
  'checklist.edgeCasesTested',
  'checklist.performanceOk',
  'checklist.accessibilityOk'
];

export default function SignOffChecklist({ executionId, onApprove, onCancel }) {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const [checked, setChecked] = useState({});
  const [extra, setExtra]     = useState('');
  const [approving, setApproving] = useState(false);

  const toggle = (key) => setChecked(p => ({ ...p, [key]: !p[key] }));
  const allChecked = DEFAULT_ITEMS.every(k => checked[k]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await executionsApi.approve(executionId);
      addToast(t('execution.approvedOk'), 'success');
      onApprove?.();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl">
        <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t('checklist.title')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('checklist.subtitle')}</p>
        </div>

        <div className="px-6 py-4 space-y-3">
          {DEFAULT_ITEMS.map(key => (
            <label key={key} className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={!!checked[key]}
                onChange={() => toggle(key)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500"
              />
              <span className={`text-sm leading-relaxed ${checked[key] ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>
                {t(key)}
              </span>
            </label>
          ))}

          <div className="pt-1">
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              {t('checklist.extraNotes')}
            </label>
            <textarea
              rows={2}
              value={extra}
              onChange={e => setExtra(e.target.value)}
              placeholder={t('checklist.extraNotesPlaceholder')}
              className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 px-6 py-4">
          <p className={`text-xs ${allChecked ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {allChecked ? t('checklist.allDone') : t('checklist.pending', { count: DEFAULT_ITEMS.filter(k => !checked[k]).length })}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onCancel}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              {t('common.cancel')}
            </button>
            <button type="button" onClick={handleApprove} disabled={!allChecked || approving}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:bg-slate-300 dark:disabled:bg-slate-700">
              {approving ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="3"/><path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              )}
              {t('execution.approveBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
