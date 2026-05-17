import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { projectsApi, storiesApi, analysesApi, feedbackApi } from '../api/client';
import { useFetch } from '../hooks/useFetch';
import { useAnalysis } from '../hooks/useAnalysis';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import StoryForm from '../components/StoryForm';
import AnalysisModeSelector from '../components/AnalysisModeSelector';
import ResultTabs from '../components/ResultTabs';
import FeedbackBar from '../components/FeedbackBar';
import StoryHistory from '../components/StoryHistory';
import PrintableAnalysis from '../components/PrintableAnalysis';
import ProjectStats from '../components/ProjectStats';
import QADashboard from '../components/QADashboard';
import ScoreTrend from '../components/ScoreTrend';
import ReleasesPanel from '../components/ReleasesPanel';

export default function StoryAnalyzerPage() {
  const { projectId } = useParams();
  const { addToast } = useToast();
  const { t } = useLanguage();
  const { execute } = useFetch();
  const { analysis, versions, currentVersion, fetchVersions, switchVersion, deleteVersion, reset } = useAnalysis();

  const [project, setProject] = useState(null);
  const [activeStory, setActiveStory] = useState(null); // null = nueva historia
  const [analysisMode, setAnalysisMode] = useState('local_only');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [rewriteText, setRewriteText] = useState(null);

  useEffect(() => {
    const loadProject = async () => {
      const data = await projectsApi.getById(projectId);
      setProject(data);
    };
    loadProject().catch(err => addToast(t('toast.analysisError', { message: err.message }), 'error'));
  }, [projectId, addToast, t]);

  const handleAnalyze = async (storyData) => {
    setIsAnalyzing(true);
    try {
      let storyId;
      if (activeStory?.id) {
        // Re-analizar: actualizar la historia existente y crear nueva versión
        const updated = await execute(() => storiesApi.update(activeStory.id, {
          titulo: storyData.titulo,
          modulo: storyData.modulo,
          descripcion: storyData.descripcion,
          fuente: storyData.fuente,
          notas_qa: storyData.notas_qa,
          estado: 'analyzed'
        }));
        storyId = updated.id;
        setActiveStory(updated);
      } else {
        const created = await execute(() => storiesApi.create({
          project_id: projectId,
          ...storyData
        }));
        storyId = created.id;
        setActiveStory(created);
      }

      const result = await execute(() => analysesApi.create({
        story_id: storyId,
        analysis_mode: analysisMode
      }));

      await fetchVersions(storyId);
      setHistoryRefreshKey(k => k + 1);

      if (analysisMode === 'hybrid' && result?.meta && !result.meta.uso_ia) {
        addToast(t('toast.analysisDoneNoIa'), 'warning');
      } else if (analysisMode === 'hybrid' && result?.meta?.uso_ia) {
        const blocks = result.meta.bloques_generados_por_ia || [];
        addToast(t('toast.analysisDoneIa', { count: blocks.length, plural: blocks.length === 1 ? '' : 's' }), 'success');
      } else {
        addToast(t('toast.analysisDone'), 'success');
      }
    } catch (err) {
      addToast(t('toast.analysisError', { message: err.message }), 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFeedback = async (feedbackData) => {
    try {
      await execute(() => feedbackApi.create({
        analysis_run_id: analysis.id,
        ...feedbackData
      }));
      addToast(t('feedback.toast.saved'), 'success');
    } catch (err) {
      addToast(t('feedback.toast.error', { message: err.message }), 'error');
    }
  };

  const handleLoadStory = async (story) => {
    if (!story) {
      handleNewStory();
      return;
    }
    setActiveStory(story);
    try {
      await fetchVersions(story.id);
      addToast(t('history.toast.loaded', { title: story.titulo }), 'info');
    } catch (err) {
      addToast(t('history.toast.loadError', { message: err.message }), 'error');
    }
  };

  const handleNewStory = () => {
    setActiveStory(null);
    if (typeof reset === 'function') reset();
    setHistoryRefreshKey(k => k + 1);
  };

  const nextVersion = versions && versions.length > 0
    ? Math.max(...versions.map(v => v.version)) + 1
    : 1;

  return (
    <div className="space-y-6">
      {analysis && createPortal(
        <div className="print-only" aria-hidden="true">
          <PrintableAnalysis
            analysis={analysis}
            projectName={project?.nombre}
            projectDescription={project?.descripcion}
          />
        </div>,
        document.body
      )}
      {!project ? (
        <div className="text-center py-12 text-slate-600 dark:text-slate-400">{t('common.loading')}</div>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{project.nombre}</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{project.descripcion}</p>
            </div>
            {activeStory && (
              <button
                type="button"
                onClick={handleNewStory}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {t('story.actions.newStory')}
              </button>
            )}
          </div>

          <ProjectStats
            projectId={projectId}
            refreshKey={historyRefreshKey}
          />

          <QADashboard
            projectId={projectId}
            refreshKey={historyRefreshKey}
          />

          <ReleasesPanel
            projectId={projectId}
            refreshKey={historyRefreshKey}
          />

          <StoryHistory
            projectId={projectId}
            refreshKey={historyRefreshKey}
            onLoadStory={handleLoadStory}
            activeStoryId={activeStory?.id}
          />

          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <StoryForm
                projectId={projectId}
                onAnalyze={handleAnalyze}
                isLoading={isAnalyzing}
                initialData={activeStory}
                mode={activeStory ? 'edit' : 'create'}
                nextVersion={nextVersion}
                onLoadStory={handleLoadStory}
                rewriteText={rewriteText}
              />

              <AnalysisModeSelector
                value={analysisMode}
                onChange={setAnalysisMode}
                projectSensitivity={project.sensibilidad}
              />
            </div>

            {analysis ? (
              <div className="lg:col-span-3 space-y-4">
                {analysis.quality_checks?.requiere_refinamiento_humano && (
                  <div className="bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 p-4 rounded">
                    <p className="font-semibold text-red-800 dark:text-red-200">{t('results.requiresRefinement')}</p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {t('results.ambiguityLabel', { score: analysis.meta.score_ambiguedad })}
                    </p>
                  </div>
                )}

                <ResultTabs
                  analysis={analysis}
                  versions={versions}
                  currentVersion={currentVersion}
                  onVersionChange={switchVersion}
                  onVersionDelete={deleteVersion}
                  projectName={project.nombre}
                  storyTitle={activeStory?.titulo}
                  onRewriteApply={(newText) => {
                    setRewriteText(newText);
                    setTimeout(() => setRewriteText(null), 100);
                  }}
                />

                <ScoreTrend versions={versions} />

                <FeedbackBar
                  analysisRunId={analysis.id}
                  onSubmit={handleFeedback}
                  versions={versions}
                />
              </div>
            ) : (
              <div className="lg:col-span-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center text-slate-600 dark:text-slate-400">
                {t('results.placeholder')}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
