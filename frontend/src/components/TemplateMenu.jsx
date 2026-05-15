import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { DOMAIN_KEYS, getTemplate } from '../utils/domainTemplates';
import { templatesApi } from '../api/client';

// ── Small inline name input shown when saving ─────────────────────────────
function SaveModal({ onSave, onCancel, t }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    await onSave(name.trim());
    setBusy(false);
  };

  return (
    <div className="border-t border-slate-100 dark:border-slate-800 p-3">
      <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-400">{t('templates.saveModal')}</p>
      <form onSubmit={submit} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('templates.saveModalPlaceholder')}
          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        />
        <button type="submit" disabled={busy || !name.trim()}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
          {busy ? t('templates.savingBtn') : t('templates.saveBtn')}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded-lg px-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          ✕
        </button>
      </form>
    </div>
  );
}

export default function TemplateMenu({ onApply, currentGlossary = [], currentRules = [] }) {
  const { t, language } = useLanguage();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [customs, setCustoms] = useState([]);
  const [showSave, setShowSave] = useState(false);
  const wrapperRef = useRef(null);

  // Fetch custom templates when menu opens
  useEffect(() => {
    if (!open) return;
    templatesApi.getAll()
      .then(data => setCustoms(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [open]);

  // Close on outside click or Escape
  useEffect(() => {
    const onClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const handleApplyBuiltin = (domain) => {
    const tpl = getTemplate(domain, language);
    if (!tpl) return;
    onApply({ glossary: tpl.glossary, rules: tpl.rules });
    addToast(t('templates.applied', { name: t(`templates.domains.${domain}`) }), 'success');
    setOpen(false);
  };

  const handleApplyCustom = (tpl) => {
    onApply({ glossary: tpl.glossary ?? [], rules: tpl.rules ?? [] });
    addToast(t('templates.applied', { name: tpl.name }), 'success');
    setOpen(false);
  };

  const handleSave = async (name) => {
    try {
      const created = await templatesApi.create({
        name,
        glossary: currentGlossary,
        rules: currentRules
      });
      setCustoms(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      addToast(t('templates.savedOk'), 'success');
      setShowSave(false);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDelete = async (tpl, e) => {
    e.stopPropagation();
    if (!window.confirm(t('templates.deleteConfirm', { name: tpl.name }))) return;
    try {
      await templatesApi.delete(tpl.id);
      setCustoms(prev => prev.filter(c => c.id !== tpl.id));
      addToast(t('templates.deletedOk'), 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setShowSave(false); }}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
          <path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
        {t('templates.applyButton')}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">
          <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div role="menu" className="absolute left-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg shadow-slate-900/10">

          {/* Custom templates section */}
          <div className="border-b border-slate-100 dark:border-slate-800 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('templates.customSection')}
            </p>
          </div>

          {customs.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-slate-400 dark:text-slate-500">
              {t('templates.noCustom')}
            </p>
          ) : (
            customs.map(tpl => (
              <button
                key={tpl.id}
                type="button"
                role="menuitem"
                onClick={() => handleApplyCustom(tpl)}
                className="group flex w-full items-center justify-between gap-2 border-b border-slate-50 dark:border-slate-800/60 px-3 py-2.5 text-left last:border-b-0 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 focus-visible:bg-slate-50 dark:focus-visible:bg-slate-800/50 focus-visible:outline-none"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{tpl.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t('templates.preview', { glossary: (tpl.glossary || []).length, rules: (tpl.rules || []).length })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDelete(tpl, e)}
                  aria-label={`Eliminar ${tpl.name}`}
                  className="shrink-0 opacity-0 group-hover:opacity-100 inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                    <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </button>
            ))
          )}

          {/* Save current project as template */}
          {!showSave ? (
            <button
              type="button"
              onClick={() => setShowSave(true)}
              className="flex w-full items-center gap-2 border-t border-slate-100 dark:border-slate-800 px-3 py-2 text-left text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors focus-visible:outline-none"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {t('templates.saveFromProject')}
            </button>
          ) : (
            <SaveModal onSave={handleSave} onCancel={() => setShowSave(false)} t={t} />
          )}

          {/* Built-in templates section */}
          <div className="border-t border-slate-100 dark:border-slate-800 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('templates.builtinSection')}
            </p>
          </div>

          {DOMAIN_KEYS.map(domain => {
            const tpl = getTemplate(domain, language);
            if (!tpl) return null;
            return (
              <button
                key={domain}
                type="button"
                role="menuitem"
                onClick={() => handleApplyBuiltin(domain)}
                className="flex w-full flex-col items-start gap-0.5 border-b border-slate-100 dark:border-slate-800 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 focus-visible:bg-slate-50 dark:focus-visible:bg-slate-800/50 focus-visible:outline-none"
              >
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{t(`templates.domains.${domain}`)}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('templates.preview', { glossary: tpl.glossary.length, rules: tpl.rules.length })}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
