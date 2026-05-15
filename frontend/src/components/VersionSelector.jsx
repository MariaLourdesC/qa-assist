import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

export default function VersionSelector({ versions, current, onChange, onDelete }) {
  const { addToast } = useToast();
  const { t } = useLanguage();
  const [deleting, setDeleting] = useState(false);

  if (!versions || versions.length === 0) return null;

  const currentV = versions.find(v => v.id === current);

  const handleChange = (e) => {
    onChange(parseInt(e.target.value));
    addToast(t('toast.versionChanged'), 'info');
  };

  const handleDelete = async () => {
    if (!currentV) return;
    const label = `v${currentV.version}`;
    if (!window.confirm(t('versions.deleteConfirm', { version: label }))) return;
    setDeleting(true);
    try {
      await onDelete(current);
      addToast(t('versions.deleted', { version: label }), 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = onDelete && versions.length > 1;

  return (
    <div className="inline-flex items-center gap-2">
      <label htmlFor="version-select" className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {t('results.version')}
      </label>
      <div className="relative">
        <select
          id="version-select"
          value={current || ''}
          onChange={handleChange}
          className="appearance-none rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1.5 pl-3 pr-8 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          {versions.map(v => {
            const modeLabel = t(`analysisModeShort.${v.analysis_mode}`);
            const modeText = modeLabel === `analysisModeShort.${v.analysis_mode}` ? v.analysis_mode : modeLabel;
            return (
              <option key={v.id} value={v.id}>
                v{v.version} · {new Date(v.created_at).toLocaleDateString()} · {modeText}
              </option>
            );
          })}
        </select>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden="true">
          <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </div>

      <span className="text-xs text-slate-500 dark:text-slate-400">
        {t('results.versionsCount', { count: versions.length })}
      </span>

      {canDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          aria-label={t('versions.deleteLabel')}
          title={t('versions.deleteLabel')}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          {deleting ? (
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
              <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
