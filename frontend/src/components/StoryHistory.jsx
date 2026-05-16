import React, { useEffect, useRef, useState } from 'react';
import { storiesApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso.replace(' ', 'T'));
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

const ESTADO_STYLES = {
  draft:      'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 ring-slate-600/20 dark:ring-slate-400/20',
  analyzed:   'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-emerald-600/20 dark:ring-emerald-400/20',
  in_testing: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-blue-600/20 dark:ring-blue-400/20',
  passed:     'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 ring-teal-600/20 dark:ring-teal-400/20',
  failed:     'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 ring-red-600/20 dark:ring-red-400/20',
  approved:   'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 ring-violet-600/20 dark:ring-violet-400/20'
};

export default function StoryHistory({ projectId, refreshKey, onLoadStory, activeStoryId }) {
  const { addToast } = useToast();
  const { t } = useLanguage();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const autoOpened = useRef(false);
  const [query, setQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('all');
  const [sortBy, setSortBy]             = useState('recent');
  const [visibleCount, setVisibleCount] = useState(20);
  const [bulkMode, setBulkMode]         = useState(false);
  const [selected, setSelected]         = useState(new Set());
  const [bulkBusy, setBulkBusy]         = useState(false);

  const PAGE_SIZE = 20;
  const SORTS = ['recent', 'oldest', 'az'];

  const normalizedQuery = query.trim().toLowerCase();
  const filteredStories = stories
    .filter(s => estadoFilter === 'all' || s.estado === estadoFilter)
    .filter(s => !normalizedQuery ||
      (s.titulo || '').toLowerCase().includes(normalizedQuery) ||
      (s.modulo || '').toLowerCase().includes(normalizedQuery)
    )
    .sort((a, b) => {
      if (sortBy === 'az')     return (a.titulo || '').localeCompare(b.titulo || '');
      if (sortBy === 'oldest') return new Date(a.updated_at) - new Date(b.updated_at);
      return new Date(b.updated_at) - new Date(a.updated_at); // 'recent'
    });

  const visibleStories = filteredStories.slice(0, visibleCount);
  const hiddenCount = filteredStories.length - visibleStories.length;

  // Reset pagination when filters change
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [query, estadoFilter, sortBy]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await storiesApi.getAll(projectId);
        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];
          setStories(list);
          // Auto-open once when stories exist — respects manual close after that
          if (list.length > 0 && !autoOpened.current) {
            autoOpened.current = true;
            setOpen(true);
          }
        }
      } catch (err) {
        if (!cancelled) addToast(t('history.toast.loadError', { message: err.message }), 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [projectId, refreshKey, addToast]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected(selected.size === filteredStories.length
      ? new Set()
      : new Set(filteredStories.map(s => s.id))
    );
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(t('history.bulk.deleteConfirm', { count: selected.size }))) return;
    setBulkBusy(true);
    try {
      const { deleted } = await storiesApi.bulkDelete([...selected]);
      setStories(prev => prev.filter(s => !selected.has(s.id)));
      setSelected(new Set());
      setBulkMode(false);
      addToast(t('history.bulk.deletedOk', { count: deleted }), 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally { setBulkBusy(false); }
  };

  const handleBulkApprove = async () => {
    setBulkBusy(true);
    try {
      const { approved } = await storiesApi.bulkApprove([...selected]);
      setStories(prev => prev.map(s =>
        selected.has(s.id) ? { ...s, estado: 'approved' } : s
      ));
      setSelected(new Set());
      setBulkMode(false);
      addToast(t('history.bulk.approvedOk', { count: approved }), 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally { setBulkBusy(false); }
  };

  const handleClone = async (e, id) => {
    e.stopPropagation();
    try {
      const cloned = await storiesApi.clone(id);
      setStories(prev => [cloned, ...prev]);
      addToast(t('history.toast.cloned', { title: cloned.titulo }), 'success');
      onLoadStory(cloned);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDelete = async (e, id, titulo) => {
    e.stopPropagation();
    if (!window.confirm(t('history.deleteConfirm', { title: titulo }))) return;
    try {
      await storiesApi.delete(id);
      addToast(t('history.toast.deleted', { title: titulo }), 'success');
      setStories(prev => prev.filter(s => s.id !== id));
      if (activeStoryId === id) onLoadStory(null);
    } catch (err) {
      addToast(t('toast.analysisError', { message: err.message }), 'error');
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t('history.title')}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {loading
                ? t('history.loading')
                : stories.length === 0
                  ? t('history.empty')
                  : filteredStories.length < stories.length
                    ? t('history.matching', { count: filteredStories.length, total: stories.length })
                    : t('history.count', { count: stories.length })}
            </p>
          </div>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true">
          <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      <div className="grid transition-all duration-300 ease-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4">
            {stories.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                {t('history.noStories')}
              </p>
            ) : (
              <>
                <div className="relative mb-3">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                      <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                  </span>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('history.searchPlaceholder')}
                    className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-9 pr-9 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors duration-200 hover:border-slate-300 dark:hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label={t('history.clearSearch')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {/* Filters + sort */}
                {/* ── Bulk toolbar ── */}
                {bulkMode ? (
                  <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={toggleSelectAll}
                        className="text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:underline focus-visible:outline-none">
                        {selected.size === filteredStories.length ? t('history.bulk.deselectAll') : t('history.bulk.selectAll')}
                      </button>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {t('history.bulk.selected', { count: selected.size })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={handleBulkApprove}
                        disabled={selected.size === 0 || bulkBusy}
                        className="rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                        {t('history.bulk.approve')}
                      </button>
                      <button type="button" onClick={handleBulkDelete}
                        disabled={selected.size === 0 || bulkBusy}
                        className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
                        {t('history.bulk.delete')}
                      </button>
                      <button type="button" onClick={() => { setBulkMode(false); setSelected(new Set()); }}
                        className="rounded-lg px-2 py-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 focus-visible:outline-none">
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setBulkMode(true)}
                    className="mb-3 ml-auto flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                      <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t('history.bulk.toggle')}
                  </button>
                )}

                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {['all', 'analyzed', 'in_testing', 'passed', 'failed', 'approved', 'draft'].map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setEstadoFilter(f)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                          estadoFilter === f
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {t(`history.filter.${f}`)}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSortBy(s => SORTS[(SORTS.indexOf(s) + 1) % SORTS.length])}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                      <path d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
                    </svg>
                    {t(`history.sort.${sortBy}`)}
                  </button>
                </div>

                {filteredStories.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                    {t('history.noMatches', { query })}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {visibleStories.map(story => {
                      const isActive = story.id === activeStoryId;
                      const estadoStyle = ESTADO_STYLES[story.estado] || ESTADO_STYLES.draft;
                      return (
                        <li key={story.id}>
                          <div
                            onClick={() => bulkMode ? toggleSelect(story.id) : onLoadStory(story)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bulkMode ? toggleSelect(story.id) : onLoadStory(story); } }}
                            className={`group flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-3 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                              isActive
                                ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 ring-1 ring-inset ring-emerald-600/20 dark:ring-emerald-400/20'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            {bulkMode && (
                              <input type="checkbox" readOnly checked={selected.has(story.id)}
                                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${estadoStyle}`}>
                                  {t(`history.estado.${story.estado}`) !== `history.estado.${story.estado}`
                                    ? t(`history.estado.${story.estado}`)
                                    : story.estado}
                                </span>
                                {story.modulo && (
                                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{story.modulo}</span>
                                )}
                              </div>
                              <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                                {story.titulo}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                {t('history.updatedAt', { date: formatDate(story.updated_at) })}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {isActive && (
                                <span className="hidden sm:inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                                  {t('history.active')}
                                </span>
                              )}
                              {!bulkMode && (
                                <button
                                  type="button"
                                  onClick={(e) => handleClone(e, story.id)}
                                  aria-label={t('history.cloneBtn')}
                                  title={t('history.cloneBtn')}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                                    <path d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                                  </svg>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => handleDelete(e, story.id, story.titulo)}
                                aria-label={`${t('common.delete')}: ${story.titulo}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 transition-colors duration-200 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                                  <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                    className="mt-3 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    {t('history.showMore', { count: Math.min(hiddenCount, PAGE_SIZE), total: hiddenCount })}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
