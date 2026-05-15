import React, { useEffect, useRef, useState } from 'react';
import { jiraApi } from '../api/client';
import { useLanguage } from '../context/LanguageContext';

const CREDS_KEY = 'qa_jira_creds';

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(CREDS_KEY) || '{}'); } catch { return {}; }
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function JiraImportModal({ onImport, onClose }) {
  const { t } = useLanguage();
  const saved = loadSaved();
  const [jiraUrl, setJiraUrl]     = useState(saved.jiraUrl || '');
  const [email, setEmail]         = useState(saved.email || '');
  const [apiToken, setApiToken]   = useState('');
  const [issueKey, setIssueKey]   = useState('');
  const [remember, setRemember]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const firstRef = useRef(null);

  useEffect(() => { firstRef.current?.focus(); }, []);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jiraUrl || !email || !apiToken || !issueKey) return;
    setLoading(true);
    setError(null);
    try {
      const data = await jiraApi.import({ jiraUrl, email, apiToken, issueKey });
      if (remember) localStorage.setItem(CREDS_KEY, JSON.stringify({ jiraUrl, email }));
      onImport(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="jira-import-title"
        className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.004-1.005zm5.723-5.756H5.757a5.215 5.215 0 0 0 5.214 5.214h2.131v2.058a5.218 5.218 0 0 0 5.215 5.214V6.762a1.005 1.005 0 0 0-1.023-1.005zM23.013 0H11.47a5.215 5.215 0 0 0 5.215 5.215h2.13v2.057A5.215 5.215 0 0 0 24.018 12.49V1.005A1.005 1.005 0 0 0 23.013 0z"/>
              </svg>
            </span>
            <h2 id="jira-import-title" className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {t('jira.modalImportTitle')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('jira.cancel')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <div>
            <label htmlFor="ji-url" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('jira.jiraUrl')}
            </label>
            <input
              ref={firstRef}
              id="ji-url"
              type="url"
              value={jiraUrl}
              onChange={e => setJiraUrl(e.target.value)}
              placeholder={t('jira.jiraUrlPlaceholder')}
              required
              className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
            />
          </div>

          <div>
            <label htmlFor="ji-email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('jira.email')}
            </label>
            <input
              id="ji-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('jira.emailPlaceholder')}
              required
              className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
            />
          </div>

          <div>
            <label htmlFor="ji-token" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('jira.apiToken')}
            </label>
            <input
              id="ji-token"
              type="password"
              value={apiToken}
              onChange={e => setApiToken(e.target.value)}
              placeholder={t('jira.apiTokenPlaceholder')}
              required
              className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{t('jira.apiTokenHint')}</p>
          </div>

          <div>
            <label htmlFor="ji-key" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('jira.issueKey')}
            </label>
            <input
              id="ji-key"
              type="text"
              value={issueKey}
              onChange={e => setIssueKey(e.target.value.toUpperCase())}
              placeholder={t('jira.issueKeyPlaceholder')}
              required
              className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-mono text-sm uppercase text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:normal-case placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500"
            />
            {t('jira.rememberCreds')}
          </label>

          {jiraUrl.startsWith('http://') && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
              <p className="text-xs text-amber-700 dark:text-amber-300">{t('jira.httpWarning')}</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3">
              <p className="text-sm text-red-700 dark:text-red-300 font-mono break-all">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              {t('jira.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !jiraUrl || !email || !apiToken || !issueKey}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {loading && <Spinner />}
              {loading ? t('jira.importing') : t('jira.importBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
