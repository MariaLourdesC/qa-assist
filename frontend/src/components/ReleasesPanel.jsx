import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { releasesApi, storiesApi } from '../api/client';

const STATUS_COLORS = {
  draft:    'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  active:   'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
  locked:   'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
  archived: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500'
};

function ReleaseForm({ projectId, release, onSave, onCancel }) {
  const { t } = useLanguage();
  const [name, setName]   = useState(release?.name || '');
  const [version, setVer] = useState(release?.version || '');
  const [deadline, setDl] = useState(release?.deadline?.slice(0, 10) || '');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const data = { project_id: projectId, name, version, deadline: deadline || null };
      const result = release?.id
        ? await releasesApi.update(release.id, data)
        : await releasesApi.create(data);
      onSave(result);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">{t('releases.name')} *</label>
          <input value={name} onChange={e => setName(e.target.value)} required placeholder={t('releases.namePlaceholder')}
            className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">{t('releases.version')}</label>
          <input value={version} onChange={e => setVer(e.target.value)} placeholder="v2.3.0"
            className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">{t('releases.deadline')}</label>
          <input type="date" value={deadline} onChange={e => setDl(e.target.value)}
            className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">{t('common.cancel')}</button>
        <button type="submit" disabled={saving || !name.trim()}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
          {saving ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </form>
  );
}

export default function ReleasesPanel({ projectId, refreshKey }) {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const [releases, setReleases] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [open, setOpen]         = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [allStories, setAllStories] = useState([]);
  const autoOpened = useRef(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([
      releasesApi.getAll(projectId),
      storiesApi.getAll(projectId)
    ]).then(([rels, stories]) => {
      const list = Array.isArray(rels) ? rels : [];
      setReleases(list);
      setAllStories(Array.isArray(stories) ? stories : []);
      if (list.length > 0 && !autoOpened.current) { autoOpened.current = true; setOpen(true); }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [projectId, refreshKey]);

  const handleLock = async (rel) => {
    if (!window.confirm(t('releases.lockConfirm', { name: rel.name }))) return;
    try {
      const updated = await releasesApi.lock(rel.id);
      setReleases(prev => prev.map(r => r.id === rel.id ? updated : r));
      addToast(t('releases.lockedOk', { name: updated.name }), 'success');
    } catch (err) { addToast(err.message, 'error'); }
  };

  const handleDelete = async (rel) => {
    if (!window.confirm(t('releases.deleteConfirm', { name: rel.name }))) return;
    try {
      await releasesApi.delete(rel.id);
      setReleases(prev => prev.filter(r => r.id !== rel.id));
      addToast(t('releases.deletedOk'), 'success');
    } catch (err) { addToast(err.message, 'error'); }
  };

  const handleAddStory = async (relId, storyId) => {
    try {
      const updated = await releasesApi.addStory(relId, storyId);
      setReleases(prev => prev.map(r => r.id === relId ? updated : r));
    } catch (err) { addToast(err.message, 'error'); }
  };

  const handleRemoveStory = async (relId, storyId) => {
    try {
      await releasesApi.removeStory(relId, storyId);
      setReleases(prev => prev.map(r =>
        r.id === relId ? { ...r, stories: r.stories.filter(s => s.story_id !== storyId) } : r
      ));
    } catch (err) { addToast(err.message, 'error'); }
  };

  const daysLeft = (deadline) => {
    if (!deadline) return null;
    const diff = Math.ceil((new Date(deadline) - new Date()) / 86400000);
    return diff;
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t('releases.title')}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {loading ? t('common.loading') : t('releases.count', { count: releases.length })}
            </p>
          </div>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
          className={`h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      <div className="grid transition-all duration-300 ease-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4 space-y-3">
            {creating ? (
              <ReleaseForm projectId={projectId}
                onSave={rel => { setReleases(prev => [rel, ...prev]); setCreating(false); }}
                onCancel={() => setCreating(false)} />
            ) : (
              <button type="button" onClick={() => setCreating(true)}
                className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:border-emerald-400 dark:hover:border-emerald-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 4.5v15m7.5-7.5h-15" /></svg>
                {t('releases.create')}
              </button>
            )}

            {releases.length === 0 && !creating && (
              <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-4">{t('releases.empty')}</p>
            )}

            {releases.map(rel => {
              const isOpen  = expanded === rel.id;
              const locked  = rel.status === 'locked';
              const days    = daysLeft(rel.deadline);
              const storyIds = new Set((rel.stories || []).map(s => s.story_id));
              const available = allStories.filter(s => !storyIds.has(s.id));

              return (
                <div key={rel.id} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3">
                    <button type="button" onClick={() => setExpanded(isOpen ? null : rel.id)}
                      className="flex flex-1 items-center gap-2 text-left focus-visible:outline-none">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
                        className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                        <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                      <span className="flex-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{rel.name}</span>
                      {rel.version && <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{rel.version}</span>}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[rel.status] || STATUS_COLORS.draft}`}>
                        {t(`releases.status.${rel.status}`)}
                      </span>
                      {days !== null && (
                        <span className={`text-[11px] font-medium ${days < 0 ? 'text-red-500' : days <= 3 ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`}>
                          {days < 0 ? t('releases.overdue', { d: Math.abs(days) }) : t('releases.daysLeft', { d: days })}
                        </span>
                      )}
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      {!locked && (
                        <>
                          <button type="button" onClick={() => setEditing(rel)} title={t('common.edit')}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 focus-visible:outline-none">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                          </button>
                          <button type="button" onClick={() => handleLock(rel)} title={t('releases.lock')}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 focus-visible:outline-none">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                          </button>
                        </>
                      )}
                      {locked && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium px-1">🔒</span>}
                      <button type="button" onClick={() => handleDelete(rel)} title={t('common.delete')}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 focus-visible:outline-none">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                      </button>
                    </div>
                  </div>

                  {editing?.id === rel.id && (
                    <div className="border-t border-slate-100 dark:border-slate-800 p-4">
                      <ReleaseForm projectId={projectId} release={rel}
                        onSave={updated => { setReleases(prev => prev.map(r => r.id === updated.id ? updated : r)); setEditing(null); }}
                        onCancel={() => setEditing(null)} />
                    </div>
                  )}

                  {isOpen && (
                    <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t('releases.stories', { count: rel.stories?.length || 0 })}
                      </p>
                      {(rel.stories || []).map(s => (
                        <div key={s.story_id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">{s.titulo}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">{s.estado}{s.modulo ? ` · ${s.modulo}` : ''}</p>
                          </div>
                          {!locked && (
                            <button type="button" onClick={() => handleRemoveStory(rel.id, s.story_id)}
                              className="shrink-0 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 focus-visible:outline-none">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
                        </div>
                      ))}
                      {!locked && available.length > 0 && (
                        <select
                          defaultValue=""
                          onChange={e => { if (e.target.value) handleAddStory(rel.id, parseInt(e.target.value)); e.target.value = ''; }}
                          className="block w-full rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                          <option value="" disabled>{t('releases.addStory')}</option>
                          {available.map(s => <option key={s.id} value={s.id}>{s.titulo}</option>)}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
