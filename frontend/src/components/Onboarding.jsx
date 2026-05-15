import React, { useEffect, useState } from 'react';
import { projectsApi, storiesApi, analysesApi } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';

const STORAGE_KEY = 'qa-assist-onboarded';

export function shouldShowOnboarding(projectsLength) {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem(STORAGE_KEY) === 'true') return false;
  return projectsLength === 0;
}

const DEMO = {
  es: {
    project: {
      nombre: 'Banca Digital · Demo',
      dominio: 'Finanzas',
      descripcion: 'Proyecto demo creado por el onboarding.',
      contexto_general: 'Plataforma de banca móvil B2C. Cumplimiento PCI y KYC.',
      sensibilidad: 'interno',
      glosario: [
        { termino: 'KYC', definicion: 'Know Your Customer (validación de identidad).' },
        { termino: 'PCI', definicion: 'Estándar de seguridad de tarjetas de pago.' }
      ],
      reglas_negocio: [
        { regla: 'Monto máximo por transferencia: $10,000 USD', tipo: 'restriccion' },
        { regla: 'Bloquear cuenta tras 5 intentos fallidos', tipo: 'seguridad' }
      ]
    },
    story: {
      titulo: 'Transferencia entre cuentas propias',
      modulo: 'Banca móvil',
      descripcion: 'Como cliente, quiero transferir dinero de mi cuenta de ahorros a mi cuenta corriente de forma rápida y segura. El sistema debe validar el monto y procesar la transacción. Si el saldo es insuficiente, mostrar un mensaje claro.',
      fuente: 'Demo onboarding',
      notas_qa: 'Considerar transferencias internacionales en versiones futuras.'
    }
  },
  en: {
    project: {
      nombre: 'Digital Banking · Demo',
      dominio: 'Finance',
      descripcion: 'Demo project created by onboarding.',
      contexto_general: 'B2C mobile banking platform. PCI and KYC compliance.',
      sensibilidad: 'interno',
      glosario: [
        { termino: 'KYC', definicion: 'Know Your Customer (identity validation).' },
        { termino: 'PCI', definicion: 'Payment card security standard.' }
      ],
      reglas_negocio: [
        { regla: 'Maximum transfer amount: $10,000 USD', tipo: 'restriccion' },
        { regla: 'Lock account after 5 failed attempts', tipo: 'seguridad' }
      ]
    },
    story: {
      titulo: 'Transfer between own accounts',
      modulo: 'Mobile banking',
      descripcion: 'As a customer, I want to transfer money from my savings account to my checking account quickly and securely. The system must validate the amount and process the transaction. If the balance is insufficient, show a clear message.',
      fuente: 'Onboarding demo',
      notas_qa: 'Consider international transfers in future versions.'
    }
  }
};

function Step({ n, title, desc }) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        {n}
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{desc}</p>
      </div>
    </div>
  );
}

export default function Onboarding({ onClose, onProjectCreated }) {
  const { t, language } = useLanguage();
  const { addToast } = useToast();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') skip(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onClose();
  };

  const createDemo = async () => {
    const data = DEMO[language] || DEMO.es;
    setCreating(true);
    try {
      const project = await projectsApi.create(data.project);
      const story = await storiesApi.create({ project_id: project.id, ...data.story });
      try {
        await analysesApi.create({ story_id: story.id, analysis_mode: 'local_only' });
      } catch {} // si falla el análisis, el proyecto ya está creado
      addToast(t('onboarding.demoCreated'), 'success');
      localStorage.setItem(STORAGE_KEY, 'true');
      onProjectCreated && onProjectCreated();
      onClose();
    } catch (err) {
      addToast(t('onboarding.demoError', { message: err.message }), 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={skip} aria-hidden="true" />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-900/10 dark:bg-slate-900">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 px-8 py-7 text-white">
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold tracking-tight">{t('onboarding.title')}</h2>
          <p className="mt-1 text-sm text-emerald-100">{t('onboarding.subtitle')}</p>
        </div>

        <div className="space-y-4 px-8 py-6">
          <Step n="1" title={t('onboarding.step1Title')} desc={t('onboarding.step1Desc')} />
          <Step n="2" title={t('onboarding.step2Title')} desc={t('onboarding.step2Desc')} />
          <Step n="3" title={t('onboarding.step3Title')} desc={t('onboarding.step3Desc')} />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/60 px-8 py-4 dark:border-slate-700 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={skip}
            disabled={creating}
            className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            {t('onboarding.skip')}
          </button>
          <button
            type="button"
            onClick={createDemo}
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-300 dark:disabled:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            {creating ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                  <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                {t('onboarding.demoLoading')}
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                </svg>
                {t('onboarding.demoCta')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
