import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectsApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

function ProjectQaBadge({ projectId }) {
  const [qa, setQa] = useState(null);
  useEffect(() => {
    projectsApi.getQaStats(projectId)
      .then(d => setQa(d))
      .catch(() => {});
  }, [projectId]);

  if (!qa || qa.executions?.total === 0) return null;
  const rate = qa.executions?.pass_rate;
  const approvedCount = qa.stories_by_estado?.approved || 0;
  const failedCount   = qa.stories_by_estado?.failed   || 0;

  return (
    <div className="flex items-center gap-2 mt-2 flex-wrap">
      {rate != null && (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
          rate >= 80 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-emerald-600/20'
          : rate >= 50 ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-amber-600/20'
          : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 ring-red-600/20'
        }`}>
          {rate}% pass
        </span>
      )}
      {approvedCount > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:text-violet-300 ring-1 ring-inset ring-violet-600/20">
          {approvedCount} ✓
        </span>
      )}
      {failedCount > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/40 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-600/20">
          {failedCount} ✗
        </span>
      )}
    </div>
  );
}

export default function ProjectList({ projects, onEdit, onRefresh, onCreateFirst }) {
  const { addToast } = useToast();
  const { t } = useLanguage();

  const handleDelete = async (id, nombre) => {
    if (!window.confirm(t('projects.deleteConfirm', { name: nombre }))) return;
    try {
      await projectsApi.delete(id);
      addToast(t('projects.toast.deleted', { name: nombre }), 'success');
      onRefresh();
    } catch (err) {
      addToast(t('toast.analysisError', { message: err.message }), 'error');
    }
  };

  if (projects.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-8 py-16 text-center shadow-sm">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-20 w-20" aria-hidden="true">
            <rect x="14" y="22" width="44" height="46" rx="6" className="fill-slate-50 dark:fill-slate-800/40 stroke-slate-200 dark:stroke-slate-700" strokeWidth="1.5" />
            <rect x="22" y="14" width="44" height="46" rx="6" className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-600" strokeWidth="1.5" />
            <path d="M30 30h28M30 38h20M30 46h24" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="60" cy="58" r="10" className="fill-emerald-600" />
            <path d="M60 54v8M56 58h8" className="stroke-white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1.5 tracking-tight">
          {t('projects.emptyTitle')}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed mb-6">
          {t('projects.emptyDesc')}
        </p>
        {onCreateFirst && (
          <button
            type="button"
            onClick={onCreateFirst}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 active:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t('projects.emptyAction')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {projects.map(project => (
        <article key={project.id} className="group flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600">
          <div className="flex-1 mb-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-snug mb-3">{project.nombre}</h3>
            {project.dominio && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-600/10 dark:ring-emerald-400/20 mb-3">
                {project.dominio}
              </span>
            )}
            <p className={`text-sm leading-relaxed ${project.descripcion ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500 italic'}`}>
              {project.descripcion || t('projects.card.noDescription')}
            </p>
            <ProjectQaBadge projectId={project.id} />
          </div>
          <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Link to={`/projects/${project.id}`} className="flex-1 inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
              {t('projects.card.analyze')}
            </Link>
            <button type="button" onClick={() => onEdit(project)} aria-label={`${t('common.edit')}: ${project.nombre}`} className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
              </svg>
            </button>
            <button type="button" onClick={() => handleDelete(project.id, project.nombre)} aria-label={`${t('common.delete')}: ${project.nombre}`} className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
