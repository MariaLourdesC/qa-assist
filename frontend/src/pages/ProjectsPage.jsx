import React, { useEffect, useRef, useState } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useFetch } from '../hooks/useFetch';
import { useLanguage } from '../context/LanguageContext';
import useHotkey from '../hooks/useHotkey';
import ProjectList from '../components/ProjectList';
import ProjectForm from '../components/ProjectForm';
import Onboarding, { shouldShowOnboarding } from '../components/Onboarding';

export default function ProjectsPage() {
  const { t } = useLanguage();
  const { projects, loading: projectsLoading, fetchProjects } = useProjects();
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [query, setQuery] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { loading: _formLoading } = useFetch(); // kept for hook side-effects
  const searchRef = useRef(null);

  useHotkey('slash', (e) => {
    if (searchRef.current) {
      e.preventDefault();
      searchRef.current.focus();
    }
  });

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (!projectsLoading && shouldShowOnboarding(projects.length)) {
      setShowOnboarding(true);
    }
  }, [projectsLoading, projects.length]);

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProject(null);
  };

  const handleFormSave = async () => {
    await fetchProjects();
    handleFormClose();
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filteredProjects = normalizedQuery
    ? projects.filter(p =>
        (p.nombre || '').toLowerCase().includes(normalizedQuery) ||
        (p.dominio || '').toLowerCase().includes(normalizedQuery) ||
        (p.descripcion || '').toLowerCase().includes(normalizedQuery)
      )
    : projects;

  const showSearch = projects.length > 0 && !projectsLoading;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t('projects.title')}</h1>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
            <path d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t('projects.create')}
        </button>
      </div>

      {showForm && (
        <ProjectForm
          project={editingProject}
          onClose={handleFormClose}
          onSave={handleFormSave}
        />
      )}

      {showOnboarding && (
        <Onboarding
          onClose={() => setShowOnboarding(false)}
          onProjectCreated={fetchProjects}
        />
      )}

      {showSearch && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('projects.searchPlaceholder')}
              className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-9 pr-9 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors duration-200 hover:border-slate-300 dark:hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t('projects.clearSearch')}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {normalizedQuery && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t('projects.matching', { count: filteredProjects.length, total: projects.length })}
            </span>
          )}
        </div>
      )}

      {projectsLoading ? (
        <div className="text-center py-8 text-slate-600 dark:text-slate-400">{t('projects.loading')}</div>
      ) : normalizedQuery && filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500 dark:text-slate-400 shadow-sm">
          {t('projects.noMatches', { query })}
        </div>
      ) : (
        <ProjectList
          projects={filteredProjects}
          onEdit={(project) => {
            setEditingProject(project);
            setShowForm(true);
          }}
          onRefresh={fetchProjects}
          onCreateFirst={() => setShowForm(true)}
        />
      )}
    </div>
  );
}
