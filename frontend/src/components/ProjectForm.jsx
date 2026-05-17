import React, { useState, useEffect } from 'react';
import { projectsApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import InlineTable from './InlineTable';
import TemplateMenu from './TemplateMenu';
import StepLibraryEditor from './StepLibraryEditor';

const SENSITIVITY_VALUES = ['publico', 'interno', 'sensible', 'restringido'];

export default function ProjectForm({ project, onClose, onSave }) {
  const { addToast } = useToast();
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const SENSITIVITY_OPTIONS = SENSITIVITY_VALUES.map(value => ({
    value,
    label: t(`projects.sensitivity.${value}`),
    desc: t(`projects.sensitivity.${value}_desc`)
  }));
  const [formData, setFormData] = useState({
    nombre: project?.nombre || '', descripcion: project?.descripcion || '',
    dominio: project?.dominio || '', contexto_general: project?.contexto_general || '',
    sensibilidad: project?.sensibilidad || 'interno',
    glosario: tryParse(project?.glosario_json || '[]'),
    reglas_negocio: tryParse(project?.reglas_negocio_json || '[]'),
    step_library: tryParse(project?.step_library_json || '[]')
  });
  function tryParse(json) { try { return JSON.parse(json); } catch { return []; } }
  const isEdit = !!project?.id;
  const isRestringido = formData.sensibilidad === 'restringido';
  const sensitivityDesc = SENSITIVITY_OPTIONS.find(o => o.value === formData.sensibilidad)?.desc;

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
  const update = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const applyTemplate = (tpl) => {
    setFormData(prev => {
      // Merge sin duplicar términos / reglas (por nombre / texto)
      const existingGlossaryTerms = new Set((prev.glosario || []).map(g => (g.termino || '').toLowerCase()));
      const newGlossary = tpl.glossary.filter(g => !existingGlossaryTerms.has((g.termino || '').toLowerCase()));
      const existingRules = new Set((prev.reglas_negocio || []).map(r => (r.regla || '').toLowerCase()));
      const newRules = tpl.rules.filter(r => !existingRules.has((r.regla || '').toLowerCase()));
      return {
        ...prev,
        glosario: [...(prev.glosario || []), ...newGlossary],
        reglas_negocio: [...(prev.reglas_negocio || []), ...newRules]
      };
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        ...formData,
        glosario:      formData.glosario,
        reglas_negocio: formData.reglas_negocio,
        step_library:  formData.step_library
      };
      if (project?.id) {
        await projectsApi.update(project.id, payload);
        addToast(t('projects.toast.updated', { name: formData.nombre }), 'success');
      } else {
        await projectsApi.create(payload);
        addToast(t('projects.toast.created', { name: formData.nombre }), 'success');
      }
      onSave();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-labelledby="project-form-title" className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/10">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>
            </span>
            <div>
              <h2 id="project-form-title" className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">{isEdit ? t('projects.form.editTitle') : t('projects.form.createTitle')}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{isEdit ? t('projects.form.editSubtitle') : t('projects.form.createSubtitle')}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={t('common.cancel')} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
            <section>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('projects.form.sectionIdentity')}</h3>
                <TemplateMenu
                  onApply={applyTemplate}
                  currentGlossary={formData.glosario}
                  currentRules={formData.reglas_negocio}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="nombre" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('projects.form.name')} <span className="text-red-500 dark:text-red-400" aria-hidden="true">*</span></label>
                  <input id="nombre" type="text" required value={formData.nombre} onChange={(e) => update('nombre', e.target.value)} placeholder={t('projects.form.namePlaceholder')} className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors duration-200 hover:border-slate-300 dark:hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1" />
                </div>
                <div>
                  <label htmlFor="dominio" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('projects.form.domain')}</label>
                  <input id="dominio" type="text" value={formData.dominio} onChange={(e) => update('dominio', e.target.value)} placeholder={t('projects.form.domainPlaceholder')} className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors duration-200 hover:border-slate-300 dark:hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1" />
                </div>
                <div>
                  <label htmlFor="sensibilidad" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('projects.form.sensitivity')}</label>
                  <div className="relative">
                    <select id="sensibilidad" value={formData.sensibilidad} onChange={(e) => update('sensibilidad', e.target.value)} className="block w-full appearance-none rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 pr-9 text-sm text-slate-900 dark:text-slate-100 transition-colors duration-200 hover:border-slate-300 dark:hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1">
                      {SENSITIVITY_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                    </select>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden="true"><path d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sensitivityDesc}</p>
                </div>
              </div>
              {isRestringido && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 p-3.5">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">{t('projects.form.restrictedTitle')}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-amber-800 dark:text-amber-200">{t('projects.form.restrictedDesc')}</p>
                  </div>
                </div>
              )}
            </section>
            <section>
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('projects.form.sectionContext')}</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="descripcion" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('projects.form.description')}</label>
                  <textarea id="descripcion" rows={3} value={formData.descripcion} onChange={(e) => update('descripcion', e.target.value)} placeholder={t('projects.form.descriptionPlaceholder')} className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors duration-200 hover:border-slate-300 dark:hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1" />
                </div>
                <div>
                  <label htmlFor="contexto_general" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('projects.form.contextGeneral')}</label>
                  <textarea id="contexto_general" rows={4} value={formData.contexto_general} onChange={(e) => update('contexto_general', e.target.value)} placeholder={t('projects.form.contextPlaceholder')} className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors duration-200 hover:border-slate-300 dark:hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1" />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('projects.form.contextHint')}</p>
                </div>
              </div>
            </section>
            <section>
              <div className="mb-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('projects.form.sectionGlossary')}</h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('projects.form.glossaryDesc')}</p>
              </div>
              <InlineTable items={formData.glosario} columns={['termino', 'definicion']} onUpdate={(items) => update('glosario', items)} placeholders={{ termino: 'Ej: KYC', definicion: 'Ej: Know Your Customer' }} />
            </section>
            <section>
              <div className="mb-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('projects.form.sectionRules')}</h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('projects.form.rulesDesc')}</p>
              </div>
              <InlineTable items={formData.reglas_negocio} columns={['regla', 'tipo']} onUpdate={(items) => update('reglas_negocio', items)} placeholders={{ regla: 'Ej: Monto máximo $10,000 USD', tipo: 'restriccion' }} />
            </section>

            <section>
              <div className="mb-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('stepLibrary.sectionTitle')}</h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('stepLibrary.sectionDesc')}</p>
              </div>
              <StepLibraryEditor
                steps={formData.step_library}
                onChange={(items) => update('step_library', items)}
              />
            </section>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 px-6 py-4">
            <button type="button" onClick={onClose} disabled={saving} className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">{t('common.cancel')}</button>
            <button type="submit" disabled={saving || !formData.nombre.trim()} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
              {saving ? (<><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" /><path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg> {t('common.saving')}</>) : (isEdit ? t('projects.form.updateBtn') : t('projects.form.createBtn'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
