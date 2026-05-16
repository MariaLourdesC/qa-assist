import React, { useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

function Kbd({ children }) {
  return (
    <kbd className="inline-flex items-center rounded border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-700 dark:text-slate-300">
      {children}
    </kbd>
  );
}

function Row({ keys, desc }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-slate-600 dark:text-slate-400">{desc}</span>
      <div className="flex shrink-0 items-center gap-1">
        {keys.map((k, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-xs text-slate-400 dark:text-slate-500">+</span>}
            <Kbd>{k}</Kbd>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default function ShortcutsModal({ onClose }) {
  const { t } = useLanguage();

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

  const isMac = navigator.platform?.toUpperCase().includes('MAC');
  const mod = isMac ? '⌘' : 'Ctrl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
          <h2 id="shortcuts-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t('shortcuts.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 px-5">
          <Row keys={['?']}          desc={t('shortcuts.showHelp')} />
          <Row keys={['/']}          desc={t('shortcuts.openSearch')} />
          <Row keys={[mod, '↵']}     desc={t('shortcuts.analyzeStory')} />
          <Row keys={['Esc']}        desc={t('shortcuts.closeModal')} />
        </div>

        <div className="px-5 py-3">
          <p className="text-[11px] text-slate-400 dark:text-slate-500">{t('shortcuts.hint')}</p>
        </div>
      </div>
    </div>
  );
}
