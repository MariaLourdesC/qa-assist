import React, { useEffect, useRef, useState } from 'react';
import { jiraApi } from '../api/client';
import { useLanguage } from '../context/LanguageContext';

const CREDS_KEY = 'qa_jira_creds';
const ISSUE_TYPES = ['Story', 'Task', 'Bug', 'Test'];

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

export default function JiraExportModal({ testCases = [], storyTitle = '', onClose }) {
  const { t } = useLanguage();
  const saved = loadSaved();
  const [jiraUrl, setJiraUrl]       = useState(saved.jiraUrl || '');
  const [email, setEmail]           = useState(saved.email || '');
  const [apiToken, setApiToken]     = useState('');
  const [projectKey, setProjectKey] = useState(saved.projectKey || '');
  const [issueType, setIssueType]   = useState('Story');
  const [remember, setRemember]     = useState(false);
  const [selected, setSelected]     = useState(() => new Set(testCases.map(tc => tc.id)));
  const [loading, setLoading]       = useState(false);
  const [results, setResults]       = useState(null); // { created, errors }
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

  const toggleAll = () => {
    setSelected(selected.size === testCases.length
      ? new Set()
      : new Set(testCases.map(tc => tc.id)));
  };

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleExport = async (e) => {
    e.preventDefault();
    if (selected.size === 0) return;
    setLoading(true);
    try {
      const payload = {
        jiraUrl,
        email,
        apiToken,
        projectKey: projectKey.trim().toUpperCase(),
        issueType,
        storyTitle,
        testCases: testCases.filter(tc => selected.has(tc.id))
      };
      const data = await jiraApi.exportTests(payload);
      if (remember) localStorage.setItem(CREDS_KEY, JSON.stringify({ jiraUrl, email, projectKey: projectKey.trim().toUpperCase() }));
      setResults(data);
    } catch (err) {
      setResults({ created: [], errors: [{ tcId: '—', error: err.message }] });
    } finally {
      setLoading(false);
    }
  };

  const allSelected = selected.size === testCases.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="jira-export-title"
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.004-1.005zm5.723-5.756H5.757a5.215 5.215 0 0 0 5.214 5.214h2.131v2.058a5.218 5.218 0 0 0 5.215 5.214V6.762a1.005 1.005 0 0 0-1.023-1.005zM23.013 0H11.47a5.215 5.215 0 0 0 5.215 5.215h2.13v2.057A5.215 5.215 0 0 0 24.018 12.49V1.005A1.005 1.005 0 0 0 23.013 0z"/>
              </svg>
            </span>
            <div>
              <h2 id="jira-export-title" className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {t('jira.modalExportTitle')}
              </h2>
              {storyTitle && (
                <p className="truncate text-xs text-slate-500 dark:text-slate-400 max-w-[260px]">{storyTitle}</p>
              )}
            </div>
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

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {results ? (
            /* ── Results view ─────────────────────────────────────────── */
            <div className="p-6 space-y-4">
              {results.created.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    {t('jira.exportedCount', { count: results.created.length })}
                  </p>
                  <ul className="space-y-2">
                    {results.created.map(r => (
                      <li key={r.tcId} className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 px-3 py-2">
                        <span className="text-sm text-slate-700 dark:text-slate-300">{r.tcId}</span>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {r.issueKey}
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
                            <path d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {results.errors.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-red-700 dark:text-red-300">
                    {t('jira.errorsCount', { count: results.errors.length })}
                  </p>
                  <ul className="space-y-2">
                    {results.errors.map((e, i) => (
                      <li key={i} className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-2">
                        <p className="text-xs font-medium text-red-700 dark:text-red-300">{e.tcId}</p>
                        <p className="text-xs font-mono text-red-600 dark:text-red-400 break-all">{e.error}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            /* ── Form view ────────────────────────────────────────────── */
            <form id="jira-export-form" onSubmit={handleExport} className="flex flex-col gap-4 p-6">
              {/* Credentials */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label htmlFor="je-url" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('jira.jiraUrl')}
                  </label>
                  <input
                    ref={firstRef}
                    id="je-url"
                    type="url"
                    value={jiraUrl}
                    onChange={e => setJiraUrl(e.target.value)}
                    placeholder={t('jira.jiraUrlPlaceholder')}
                    required
                    className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
                  />
                </div>
                <div>
                  <label htmlFor="je-email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('jira.email')}
                  </label>
                  <input
                    id="je-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={t('jira.emailPlaceholder')}
                    required
                    className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
                  />
                </div>
                <div>
                  <label htmlFor="je-token" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('jira.apiToken')}
                  </label>
                  <input
                    id="je-token"
                    type="password"
                    value={apiToken}
                    onChange={e => setApiToken(e.target.value)}
                    placeholder={t('jira.apiTokenPlaceholder')}
                    required
                    className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
                  />
                </div>
                <div>
                  <label htmlFor="je-proj" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('jira.projectKey')}
                  </label>
                  <input
                    id="je-proj"
                    type="text"
                    value={projectKey}
                    onChange={e => setProjectKey(e.target.value.toUpperCase())}
                    placeholder={t('jira.projectKeyPlaceholder')}
                    required
                    className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-mono text-sm uppercase text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:normal-case placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
                  />
                </div>
                <div>
                  <label htmlFor="je-type" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('jira.issueType')}
                  </label>
                  <select
                    id="je-type"
                    value={issueType}
                    onChange={e => setIssueType(e.target.value)}
                    className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
                  >
                    {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
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

              {/* Test case selection */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('jira.selected', { count: selected.size })}
                  </p>
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline focus-visible:outline-none"
                  >
                    {allSelected ? t('jira.deselectAll') : t('jira.selectAll')}
                  </button>
                </div>
                {testCases.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-slate-400 dark:text-slate-500">{t('jira.noTestCases')}</p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                    {testCases.map(tc => (
                      <li key={tc.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <input
                            type="checkbox"
                            checked={selected.has(tc.id)}
                            onChange={() => toggleOne(tc.id)}
                            className="h-4 w-4 shrink-0 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="shrink-0 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {tc.id}
                          </span>
                          <span className="truncate text-sm text-slate-700 dark:text-slate-300">{tc.titulo}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {jiraUrl.startsWith('http://') && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
                  <p className="text-xs text-amber-700 dark:text-amber-300">{t('jira.httpWarning')}</p>
                </div>
              )}

              {selected.size === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">{t('jira.noSelection')}</p>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            {results ? t('jira.close') : t('jira.cancel')}
          </button>
          {!results && (
            <button
              type="submit"
              form="jira-export-form"
              disabled={loading || selected.size === 0 || !jiraUrl || !email || !apiToken || !projectKey}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {loading && <Spinner />}
              {loading ? t('jira.exporting') : t('jira.exportBtn', { count: selected.size })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
