import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import EvidenceUploader from './EvidenceUploader';
import StepLibraryPicker from './StepLibraryPicker';

const SEVERITIES = ['critica', 'alta', 'media', 'baja'];

const SEV_COLORS = {
  critica: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 ring-red-600/20',
  alta:    'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 ring-orange-600/20',
  media:   'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-amber-600/20',
  baja:    'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 ring-slate-600/20'
};

export default function BugReportForm({ bug, onChange, tcTitulo, projectId }) {
  const { t } = useLanguage();
  const [showPicker, setShowPicker] = useState(false);

  const set = (field, value) => onChange({ ...bug, [field]: value });

  const insertFromLibrary = (step) => {
    const existing = bug.bug_pasos_reales || '';
    const newSteps = step.pasos.join('\n');
    set('bug_pasos_reales', existing ? `${existing}\n\n[${step.title}]\n${newSteps}` : `[${step.title}]\n${newSteps}`);
  };

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-950/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-300">
        {t('execution.bugReport')}
      </p>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
          {t('execution.bugTitle')}
        </label>
        <input
          type="text"
          value={bug.bug_titulo || ''}
          onChange={e => set('bug_titulo', e.target.value)}
          placeholder={tcTitulo}
          className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            {t('execution.bugActual')} <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          {projectId && (
            <button type="button" onClick={() => setShowPicker(true)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline focus-visible:outline-none">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              {t('stepLibrary.insertBtn')}
            </button>
          )}
        </div>
        <textarea
          rows={3}
          value={bug.bug_pasos_reales || ''}
          onChange={e => set('bug_pasos_reales', e.target.value)}
          placeholder={t('execution.bugActualPlaceholder')}
          className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
        />
      </div>

      {showPicker && (
        <StepLibraryPicker
          projectId={projectId}
          onInsert={insertFromLibrary}
          onClose={() => setShowPicker(false)}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
            {t('execution.bugSeverity')}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {SEVERITIES.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => set('bug_severidad', s)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset transition-opacity ${SEV_COLORS[s]} ${bug.bug_severidad === s ? 'opacity-100 ring-2' : 'opacity-60 hover:opacity-80'}`}
              >
                {t(`execution.severity.${s}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
            {t('execution.bugEnvironment')}
          </label>
          <input
            type="text"
            value={bug.bug_ambiente || ''}
            onChange={e => set('bug_ambiente', e.target.value)}
            placeholder={t('execution.bugEnvironmentPlaceholder')}
            className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
          />
        </div>
      </div>

      {/* Evidencias — upload de imágenes y videos */}
      <EvidenceUploader
        files={bug.evidence_files || []}
        onChange={files => set('evidence_files', files)}
        maxFiles={5}
      />

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
          {t('execution.bugScreenshot')}
        </label>
        <input
          type="url"
          value={bug.bug_screenshot_url || ''}
          onChange={e => set('bug_screenshot_url', e.target.value)}
          placeholder="https://... (URL externa opcional)"
          className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
          {t('execution.bugNotes')} <span className="text-slate-400 font-normal">{t('common.optional')}</span>
        </label>
        <textarea
          rows={2}
          value={bug.bug_notas || ''}
          onChange={e => set('bug_notas', e.target.value)}
          placeholder={t('execution.bugNotesPlaceholder')}
          className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
        />
      </div>
    </div>
  );
}
