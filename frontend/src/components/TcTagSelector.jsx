import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { analysesApi } from '../api/client';
import { useToast } from '../context/ToastContext';

const TAGS = ['smoke', 'regression', 'funcional', 'exploratorio'];

const TAG_STYLES = {
  smoke:       'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-blue-600/20',
  regression:  'bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 ring-violet-600/20',
  funcional:   'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-emerald-600/20',
  exploratorio:'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-amber-600/20'
};

export function TcTagBadge({ tag }) {
  const { t } = useLanguage();
  if (!tag) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${TAG_STYLES[tag] || 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-slate-600/20'}`}>
      {t(`tcTags.${tag}`, tag)}
    </span>
  );
}

export default function TcTagSelector({ analysisId, tcId, currentTag, onTagChange }) {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const select = async (tag) => {
    setOpen(false);
    if (tag === currentTag) return;
    setSaving(true);
    try {
      await onTagChange(tcId, tag);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 dark:border-slate-600 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50"
      >
        {currentTag ? <TcTagBadge tag={currentTag} /> : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
              <path d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path d="M6 6h.008v.008H6V6z" />
            </svg>
            {t('tcTags.addTag')}
          </>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
          {TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => select(tag)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${tag === currentTag ? 'font-semibold' : ''}`}
            >
              <TcTagBadge tag={tag} />
            </button>
          ))}
          {currentTag && (
            <button
              type="button"
              onClick={() => select(null)}
              className="flex w-full items-center px-3 py-2 text-left text-xs text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 border-t border-slate-100 dark:border-slate-800"
            >
              {t('tcTags.removeTag')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
