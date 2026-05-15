import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { storiesApi } from '../api/client';
import useHotkey from '../hooks/useHotkey';
import JiraImportModal from './JiraImportModal';

export default function StoryForm({ projectId, onAnalyze, isLoading, initialData, mode = 'create', nextVersion, onLoadStory, rewriteText }) {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const formRef = useRef(null);
  const [duplicates, setDuplicates] = useState([]);
  const [titulo, setTitulo] = useState(initialData?.titulo || '');
  const [modulo, setModulo] = useState(initialData?.modulo || '');
  const [descripcion, setDescripcion] = useState(initialData?.descripcion || '');
  const [fuente, setFuente] = useState(initialData?.fuente || '');
  const [notasQa, setNotasQa] = useState(initialData?.notas_qa || '');
  const [errors, setErrors] = useState({});
  const [showJiraImport, setShowJiraImport] = useState(false);

  useEffect(() => {
    setTitulo(initialData?.titulo || '');
    setModulo(initialData?.modulo || '');
    setDescripcion(initialData?.descripcion || '');
    setFuente(initialData?.fuente || '');
    setNotasQa(initialData?.notas_qa || '');
    setErrors({});
    setDuplicates([]);
  }, [initialData?.id]);

  // Cuando llega un texto reescrito por IA, actualizar solo la descripción
  useEffect(() => {
    if (rewriteText) {
      setDescripcion(rewriteText);
      setErrors({});
    }
  }, [rewriteText]);

  // Debounced duplicate check sobre titulo+descripcion (solo en modo create)
  useEffect(() => {
    if (mode === 'edit') { setDuplicates([]); return; }
    if (!projectId) return;
    const text = `${titulo} ${descripcion}`.trim();
    if (text.length < 12) { setDuplicates([]); return; }
    const handle = setTimeout(() => {
      storiesApi.checkDuplicates({
        project_id: projectId,
        titulo,
        descripcion,
        exclude_id: initialData?.id || null
      })
        .then(r => setDuplicates(Array.isArray(r?.matches) ? r.matches : []))
        .catch(() => setDuplicates([]));
    }, 600);
    return () => clearTimeout(handle);
  }, [titulo, descripcion, projectId, mode, initialData?.id]);

  const isEdit = mode === 'edit';

  const handleSubmit = (e) => {
    e.preventDefault();
    const next = {};
    if (!titulo.trim())      next.titulo      = t('story.fields.tituloError');
    if (!descripcion.trim()) next.descripcion = t('story.fields.descripcionError');
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onAnalyze({ projectId, titulo, modulo, descripcion, fuente, notas_qa: notasQa });
  };

  const clearError = (field) => {
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleJiraImport = (data) => {
    setTitulo(data.titulo || '');
    setModulo(data.modulo || '');
    setDescripcion(data.descripcion || '');
    setFuente(data.fuente || '');
    setErrors({});
    addToast(t('jira.importSuccess', { key: data.issueKey }), 'success');
  };

  // Ctrl/Cmd + Enter envía el form si el foco está dentro de él
  useHotkey('mod+enter', (e) => {
    if (formRef.current && formRef.current.contains(e.target) && !isLoading) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, { allowInInputs: true, deps: [isLoading, titulo, modulo, descripcion, fuente, notasQa] });

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H8.25m4.5-6H8.25m0 0H6.75m1.5 0v6.75m0-9V3.375c0-.621-.504-1.125-1.125-1.125H4.875c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h14.25c.621 0 1.125-.504 1.125-1.125V11.25c0-.621-.504-1.125-1.125-1.125z" />
            </svg>
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {isEdit ? t('story.reanalyzeTitle') : t('story.newTitle')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isEdit
                ? t('story.reanalyzeSubtitle', { version: nextVersion || '?' })
                : t('story.newSubtitle')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowJiraImport(true)}
          title={t('jira.importButton')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-blue-500" aria-hidden="true">
            <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.004-1.005zm5.723-5.756H5.757a5.215 5.215 0 0 0 5.214 5.214h2.131v2.058a5.218 5.218 0 0 0 5.215 5.214V6.762a1.005 1.005 0 0 0-1.023-1.005zM23.013 0H11.47a5.215 5.215 0 0 0 5.215 5.215h2.13v2.057A5.215 5.215 0 0 0 24.018 12.49V1.005A1.005 1.005 0 0 0 23.013 0z"/>
          </svg>
          {t('jira.importButton')}
        </button>
      </div>

      {duplicates.length > 0 && mode === 'create' && (
        <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 p-3.5">
          <div className="mb-2 flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-amber-700 dark:text-amber-400" aria-hidden="true">
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">
              {t('duplicates.warning', { count: duplicates.length })}
            </p>
          </div>
          <ul className="space-y-1.5">
            {duplicates.map(d => (
              <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg bg-white dark:bg-slate-900 px-2.5 py-1.5 ring-1 ring-inset ring-amber-200 dark:ring-amber-800">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{d.titulo}</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    {t('duplicates.similar', { score: Math.round(d.score * 100) })}
                  </p>
                </div>
                {onLoadStory && (
                  <button
                    type="button"
                    onClick={() => storiesApi.getById(d.id).then(onLoadStory).catch(() => {})}
                    className="inline-flex shrink-0 items-center rounded-md border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] font-medium text-amber-800 dark:text-amber-200 transition-colors hover:bg-amber-50 dark:hover:bg-amber-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    {t('duplicates.viewAndLoad')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showJiraImport && (
        <JiraImportModal onImport={handleJiraImport} onClose={() => setShowJiraImport(false)} />
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="titulo" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('story.fields.titulo')} <span className="text-red-500 dark:text-red-400" aria-hidden="true">*</span>
          </label>
          <input id="titulo" type="text" value={titulo} onChange={(e) => { setTitulo(e.target.value); clearError('titulo'); }} placeholder={t('story.fields.tituloPlaceholder')} disabled={isLoading} aria-invalid={!!errors.titulo} aria-describedby={errors.titulo ? 'titulo-error' : undefined}
            className={`block w-full rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors duration-200 disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 ${errors.titulo ? 'border-red-300 dark:border-red-800' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`} />
          {errors.titulo && <p id="titulo-error" className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.titulo}</p>}
        </div>

        <div>
          <label htmlFor="modulo" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('story.fields.modulo')} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">{t('common.optional')}</span>
          </label>
          <input id="modulo" type="text" value={modulo} onChange={(e) => setModulo(e.target.value)} placeholder={t('story.fields.moduloPlaceholder')} disabled={isLoading}
            className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors duration-200 hover:border-slate-300 dark:hover:border-slate-600 disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1" />
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <label htmlFor="descripcion" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('story.fields.descripcion')} <span className="text-red-500 dark:text-red-400" aria-hidden="true">*</span>
            </label>
            <span className={`text-xs tabular-nums ${
              descripcion.length > 5000
                ? 'font-semibold text-red-600 dark:text-red-400'
                : descripcion.length > 4000
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-400 dark:text-slate-500'
            }`}>
              {descripcion.length} / 5000
            </span>
          </div>
          <textarea id="descripcion" rows={8} value={descripcion} onChange={(e) => { setDescripcion(e.target.value); clearError('descripcion'); }} placeholder={t('story.fields.descripcionPlaceholder')} disabled={isLoading} aria-invalid={!!errors.descripcion} aria-describedby={errors.descripcion ? 'descripcion-error' : 'descripcion-hint'}
            className={`block w-full rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 font-mono text-sm leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors duration-200 disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 ${errors.descripcion ? 'border-red-300 dark:border-red-800' : descripcion.length > 5000 ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`} />
          {errors.descripcion ? (
            <p id="descripcion-error" className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.descripcion}</p>
          ) : descripcion.length > 5000 ? (
            <p id="descripcion-hint" className="mt-1 text-xs text-red-600 dark:text-red-400">{t('story.fields.descripcionTooLong', { max: 5000 })}</p>
          ) : (
            <p id="descripcion-hint" className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('story.fields.descripcionHint')}</p>
          )}
        </div>

        <div>
          <label htmlFor="fuente" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('story.fields.fuente')} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">{t('common.optional')}</span>
          </label>
          <input id="fuente" type="text" value={fuente} onChange={(e) => setFuente(e.target.value)} placeholder={t('story.fields.fuentePlaceholder')} disabled={isLoading}
            className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors duration-200 hover:border-slate-300 dark:hover:border-slate-600 disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1" />
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <label htmlFor="notas_qa" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('story.fields.notasQa')} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">{t('common.optional')}</span>
            </label>
            {notasQa.length > 0 && (
              <span className={`text-xs tabular-nums ${
                notasQa.length > 2000
                  ? 'font-semibold text-red-600 dark:text-red-400'
                  : notasQa.length > 1600
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-400 dark:text-slate-500'
              }`}>
                {notasQa.length} / 2000
              </span>
            )}
          </div>
          <textarea id="notas_qa" rows={3} value={notasQa} onChange={(e) => setNotasQa(e.target.value)} placeholder={t('story.fields.notasQaPlaceholder')} disabled={isLoading}
            className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors duration-200 hover:border-slate-300 dark:hover:border-slate-600 disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1" />
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={isLoading || descripcion.length > 5000}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
            {isLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                  <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                {t('common.analyzing')}
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                </svg>
                {isEdit ? t('story.actions.reanalyze', { version: nextVersion || '?' }) : t('story.actions.analyze')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
