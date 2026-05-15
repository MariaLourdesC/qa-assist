import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

const Icon = {
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  bolt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
};

function HighlightCard({ icon, label, value }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-emerald-600 dark:text-emerald-400">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <p className="text-base font-semibold leading-snug tracking-tight text-slate-900 dark:text-slate-100">
        {value || <span className="font-normal italic text-slate-400 dark:text-slate-500">{t('panels.structure.notDetected')}</span>}
      </p>
    </div>
  );
}

function ChipGroup({ title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h4>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={i} className="inline-flex items-center rounded-full bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 ring-1 ring-inset ring-slate-200 dark:ring-slate-700">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function StepList({ label, items, color }) {
  if (!items || items.length === 0) return null;
  const colorMap = {
    given: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    when:  'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
    then:  'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
  };
  return (
    <div className="flex gap-2">
      <span className={`inline-flex h-6 shrink-0 items-center rounded px-2 text-[10px] font-bold uppercase tracking-wider ${colorMap[color]}`}>
        {label}
      </span>
      <ul className="flex-1 space-y-0.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {items.map((step, i) => (<li key={i}>{step}</li>))}
      </ul>
    </div>
  );
}

function ScenarioCard({ sc, t }) {
  return (
    <article className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <h4 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {sc.titulo || '—'}
        </h4>
        {sc.outline && (
          <span className="inline-flex items-center rounded-full bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300 ring-1 ring-inset ring-violet-600/20 dark:ring-violet-400/20">
            {t('panels.structure.outlineBadge')}
          </span>
        )}
      </div>
      <div className="space-y-2.5">
        <StepList label={t('panels.structure.given')} items={sc.given} color="given" />
        <StepList label={t('panels.structure.when')}  items={sc.when}  color="when" />
        <StepList label={t('panels.structure.then')}  items={sc.then}  color="then" />
      </div>
    </article>
  );
}

function DataTable({ table }) {
  if (!table || !table.headers?.length) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800/50">
            {table.headers.map((h, i) => (
              <th key={i} className="border-b border-slate-200 dark:border-slate-700 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} className="border-b border-slate-100 dark:border-slate-800 last:border-b-0">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-slate-700 dark:text-slate-300 font-mono text-xs">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StructurePanel({ data }) {
  const { t } = useLanguage();
  const e = data?.estructura_detectada || {};
  const bdd = e.bdd || null;
  const hasBDD = bdd && bdd.escenarios?.length > 0;

  return (
    <div className="space-y-6">
      {hasBDD && (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 dark:bg-violet-950/40 px-3 py-1 text-xs font-medium text-violet-700 dark:text-violet-300 ring-1 ring-inset ring-violet-600/20 dark:ring-violet-400/20">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
            <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t('panels.structure.bddBadge')}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <HighlightCard icon={Icon.user}   label={t('panels.structure.actor')}     value={e.actor} />
        <HighlightCard icon={Icon.bolt}   label={t('panels.structure.action')}    value={e.accion} />
        <HighlightCard icon={Icon.target} label={t('panels.structure.objective')} value={e.objetivo} />
      </div>

      <div className="space-y-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <ChipGroup title={t('panels.structure.entities')}      items={e.entidades_detectadas} />
        <ChipGroup title={t('panels.structure.integrations')}  items={e.integraciones_detectadas} />
        <ChipGroup title={t('panels.structure.constraints')}   items={e.restricciones_detectadas} />
        <ChipGroup title={t('panels.structure.roles')}         items={e.roles_detectados} />
      </div>

      {hasBDD && (
        <div className="space-y-3">
          {bdd.background && (bdd.background.given?.length > 0 || bdd.background.when?.length > 0 || bdd.background.then?.length > 0) && (
            <article className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/30 p-4">
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('panels.structure.background')}
              </h4>
              <div className="space-y-2.5">
                <StepList label={t('panels.structure.given')} items={bdd.background.given} color="given" />
                <StepList label={t('panels.structure.when')}  items={bdd.background.when}  color="when" />
                <StepList label={t('panels.structure.then')}  items={bdd.background.then}  color="then" />
              </div>
            </article>
          )}

          <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {t('panels.structure.scenariosTitle')} ({bdd.escenarios.length})
          </h3>
          <div className="space-y-3">
            {bdd.escenarios.map((sc, i) => (<ScenarioCard key={i} sc={sc} t={t} />))}
          </div>

          {bdd.tablas && bdd.tablas.length > 0 && (
            <>
              <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {t('panels.structure.tablesTitle')} ({bdd.tablas.length})
              </h3>
              <div className="space-y-2">
                {bdd.tablas.map((tab, i) => (<DataTable key={i} table={tab} />))}
              </div>
            </>
          )}

          {bdd.ejemplos && bdd.ejemplos.some(ex => ex.tabla) && (
            <>
              <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {t('panels.structure.examples')}
              </h3>
              <div className="space-y-2">
                {bdd.ejemplos.filter(ex => ex.tabla).map((ex, i) => (
                  <div key={i}>
                    <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">{ex.titulo}</p>
                    <DataTable table={ex.tabla} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
