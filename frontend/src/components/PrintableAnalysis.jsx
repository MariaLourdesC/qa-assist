import React from 'react';
import { useLanguage } from '../context/LanguageContext';

function Section({ title, children }) {
  return (
    <section className="print-section">
      <h2 className="print-section-title">{title}</h2>
      <div className="print-section-body">{children}</div>
    </section>
  );
}

function ItemId({ id }) {
  return <span className="print-id">{id}</span>;
}

export default function PrintableAnalysis({ analysis, projectName, projectDescription }) {
  const { t } = useLanguage();
  if (!analysis) return null;
  const meta = analysis.meta || {};
  const qc = analysis.quality_checks || {};
  const r = analysis.resultado || {};
  const snap = analysis.input_snapshot || {};
  const e = r.estructura_detectada || {};
  const c = r.clasificacion_funcional || {};

  const severidadLabel = (s) => s ? t(`badges.severity.${s}`) : '—';

  const checkKeys = [
    'cobertura_minima',
    'casos_accionables',
    'sin_supuestos_no_soportados',
    'riesgos_relevantes',
    'sin_redundancia_excesiva',
    'preguntas_refinamiento_utiles'
  ];

  return (
    <div className="printable-analysis">
      <header className="print-cover">
        <p className="print-eyebrow">{t('print.appName')}</p>
        <h1 className="print-title">{snap.titulo || t('print.untitled')}</h1>
        <dl className="print-meta">
          <div><dt>{t('print.cover.project')}</dt><dd>{projectName || '—'}</dd></div>
          <div><dt>{t('print.cover.version')}</dt><dd>v{analysis.version || '?'} · {meta.analysis_mode || '—'}</dd></div>
          {analysis.created_at && <div><dt>{t('print.cover.date')}</dt><dd>{analysis.created_at}</dd></div>}
          {snap.modulo && <div><dt>{t('print.cover.module')}</dt><dd>{snap.modulo}</dd></div>}
        </dl>
        {projectDescription && <p className="print-project-desc">{projectDescription}</p>}
      </header>

      {snap.descripcion && (
        <Section title={t('print.sections.original')}>
          <pre className="print-quote">{snap.descripcion}</pre>
        </Section>
      )}

      <Section title={t('print.sections.scores')}>
        <div className="print-scores">
          <div><span>{t('print.fields.ambiguity')}</span><strong>{meta.score_ambiguedad ?? '—'}/100</strong></div>
          <div><span>{t('print.fields.coverage')}</span><strong>{meta.score_cobertura ?? '—'}/100</strong></div>
          <div><span>{t('print.fields.complexity')}</span><strong>{meta.score_complejidad ?? '—'}/100</strong></div>
        </div>
      </Section>

      <Section title={t('print.sections.qualityChecks')}>
        <ul className="print-checks">
          {checkKeys.map(key => {
            const val = qc[key];
            return (
              <li key={key} className={val ? 'ok' : 'fail'}>
                <span className="print-check-mark">{val ? '✓' : '✗'}</span> {t(`print.checks.${key}`)}
              </li>
            );
          })}
        </ul>
        {qc.requiere_refinamiento_humano && (
          <p className="print-warning">{t('print.warningRefinement')}</p>
        )}
      </Section>

      <Section title={t('print.sections.structure')}>
        <dl className="print-kv">
          <div><dt>{t('print.fields.actor')}</dt><dd>{e.actor || '—'}</dd></div>
          <div><dt>{t('print.fields.action')}</dt><dd>{e.accion || '—'}</dd></div>
          <div><dt>{t('print.fields.objective')}</dt><dd>{e.objetivo || '—'}</dd></div>
          {e.entidades_detectadas?.length > 0 && (
            <div><dt>{t('print.fields.entities')}</dt><dd>{e.entidades_detectadas.join(', ')}</dd></div>
          )}
          {e.integraciones_detectadas?.length > 0 && (
            <div><dt>{t('print.fields.integrations')}</dt><dd>{e.integraciones_detectadas.join(', ')}</dd></div>
          )}
          {e.restricciones_detectadas?.length > 0 && (
            <div><dt>{t('print.fields.constraints')}</dt><dd>{e.restricciones_detectadas.join(', ')}</dd></div>
          )}
          {e.roles_detectados?.length > 0 && (
            <div><dt>{t('print.fields.roles')}</dt><dd>{e.roles_detectados.join(', ')}</dd></div>
          )}
        </dl>
      </Section>

      <Section title={t('print.sections.classification')}>
        <dl className="print-kv">
          <div><dt>{t('print.fields.primaryType')}</dt><dd>{c.tipo_primario || '—'}</dd></div>
          <div><dt>{t('print.fields.confidence')}</dt><dd>{Math.round((c.confianza || 0) * 100)}%</dd></div>
          {c.subtipos?.length > 0 && (
            <div><dt>{t('print.fields.subtypes')}</dt><dd>{c.subtipos.join(', ')}</dd></div>
          )}
        </dl>
      </Section>

      <Section title={`${t('print.sections.ambiguities')} (${(r.ambiguedades || []).length})`}>
        {(r.ambiguedades || []).length === 0 ? (
          <p className="print-empty">{t('print.empty.ambiguities')}</p>
        ) : (
          <ul className="print-list">
            {r.ambiguedades.map(item => (
              <li key={item.id}>
                <ItemId id={item.id} />
                <span className="print-sev">[{severidadLabel(item.severidad)}]</span>
                <span>{item.descripcion}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`${t('print.sections.questions')} (${(r.preguntas_refinamiento || []).length})`}>
        {(r.preguntas_refinamiento || []).length === 0 ? (
          <p className="print-empty">{t('print.empty.questions')}</p>
        ) : (
          <ul className="print-list">
            {r.preguntas_refinamiento.map(item => (
              <li key={item.id}>
                <ItemId id={item.id} />
                <span>{item.pregunta}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`${t('print.sections.criteria')} (${(r.criterios_aceptacion || []).length})`}>
        {(r.criterios_aceptacion || []).length === 0 ? (
          <p className="print-empty">{t('print.empty.criteria')}</p>
        ) : (
          <ul className="print-list">
            {r.criterios_aceptacion.map(item => (
              <li key={item.id}>
                <ItemId id={item.id} />
                <span>{item.criterio}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`${t('print.sections.testcases')} (${(r.test_cases || []).length})`}>
        {(r.test_cases || []).length === 0 ? (
          <p className="print-empty">{t('print.empty.testcases')}</p>
        ) : (
          <div className="print-testcases">
            {r.test_cases.map(tc => (
              <article key={tc.id} className="print-testcase">
                <h3><ItemId id={tc.id} /> {tc.titulo}</h3>
                {tc.precondiciones && (
                  <p><strong>{t('print.tc.preconditions')}:</strong> {tc.precondiciones}</p>
                )}
                {tc.pasos && tc.pasos.length > 0 && (
                  <>
                    <p><strong>{t('print.tc.steps')}:</strong></p>
                    <ol>
                      {tc.pasos.map((p, i) => <li key={i}>{p}</li>)}
                    </ol>
                  </>
                )}
                {tc.resultado_esperado && (
                  <p><strong>{t('print.tc.expected')}:</strong> {tc.resultado_esperado}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </Section>

      <Section title={`${t('print.sections.edges')} (${(r.negativos_edge_cases || []).length})`}>
        {(r.negativos_edge_cases || []).length === 0 ? (
          <p className="print-empty">{t('print.empty.edges')}</p>
        ) : (
          <ul className="print-list">
            {r.negativos_edge_cases.map(item => (
              <li key={item.id}>
                <ItemId id={item.id} />
                <span>{item.descripcion}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`${t('print.sections.risks')} (${(r.riesgos || []).length})`}>
        {(r.riesgos || []).length === 0 ? (
          <p className="print-empty">{t('print.empty.risks')}</p>
        ) : (
          <ul className="print-list">
            {r.riesgos.map(item => (
              <li key={item.id}>
                <ItemId id={item.id} />
                <span className="print-sev">[{severidadLabel(item.severidad)}]</span>
                <span>{item.descripcion}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <footer className="print-footer">
        {t('print.footer')} · {new Date().toLocaleString()}
      </footer>
    </div>
  );
}
