import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { searchApi } from '../api/client';

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const ESTADO_COLORS = {
  draft:      'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
  analyzed:   'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
  in_testing: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
  passed:     'bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300',
  failed:     'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300',
  approved:   'bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300'
};

export default function GlobalSearch({ onClose }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { inputRef.current?.focus(); }, []);

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

  useEffect(() => {
    if (query.trim().length < 2) { setResults(null); return; }
    const timer = setTimeout(() => {
      setLoading(true);
      searchApi.query(query.trim())
        .then(data => setResults(data))
        .catch(() => setResults({ projects: [], stories: [] }))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const goTo = (path) => { navigate(path); onClose(); };

  const totalResults = (results?.projects?.length || 0) + (results?.stories?.length || 0);
  const hasResults = results && totalResults > 0;
  const noResults  = results && totalResults === 0 && query.trim().length >= 2;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 pb-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('search.title')}
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl"
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true">
            <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
          />
          {loading && <Spinner />}
          <kbd className="hidden sm:inline-flex h-6 items-center rounded border border-slate-200 dark:border-slate-700 px-1.5 font-mono text-[10px] text-slate-400 dark:text-slate-500">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!query.trim() && (
            <p className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
              {t('search.hint')}
            </p>
          )}

          {noResults && (
            <p className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
              {t('search.noResults', { q: query })}
            </p>
          )}

          {hasResults && (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">

              {/* Proyectos */}
              {results.projects.length > 0 && (
                <div>
                  <p className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('search.sectionProjects', { count: results.projects.length })}
                  </p>
                  {results.projects.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => goTo(`/projects/${p.id}`)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 focus-visible:outline-none focus-visible:bg-slate-50 dark:focus-visible:bg-slate-800/60"
                    >
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                          <path d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                        </svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{p.nombre}</p>
                        {p.dominio && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{p.dominio}</p>}
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden="true">
                        <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}

              {/* Historias */}
              {results.stories.length > 0 && (
                <div>
                  <p className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('search.sectionStories', { count: results.stories.length })}
                  </p>
                  {results.stories.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => goTo(`/projects/${s.project_id}`)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 focus-visible:outline-none focus-visible:bg-slate-50 dark:focus-visible:bg-slate-800/60"
                    >
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                          <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{s.titulo}</p>
                          {s.estado && (
                            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${ESTADO_COLORS[s.estado] || ESTADO_COLORS.draft}`}>
                              {t(`history.estado.${s.estado}`, s.estado)}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {s.project_nombre}{s.modulo ? ` · ${s.modulo}` : ''}
                        </p>
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden="true">
                        <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
