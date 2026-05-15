import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const SEV_LABEL = { critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja',
                    critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };

export default function PrintableExecution({ execution, projectName, storyTitle }) {
  const { t } = useLanguage();
  if (!execution) return null;

  const stats   = execution.stats   || {};
  const results = execution.results || [];
  const bugs    = results.filter(r => r.status === 'fail' || r.status === 'blocked');
  const total   = results.length;
  const tested  = (stats.pass || 0) + (stats.fail || 0) + (stats.blocked || 0);
  const passRate = tested > 0 ? Math.round((stats.pass / tested) * 100) : null;

  return (
    <div className="print-execution hidden print:block font-sans text-slate-900" style={{ fontFamily: 'system-ui, sans-serif', color: '#0f172a' }}>
      {/* Cover */}
      <div style={{ borderBottom: '2px solid #10b981', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{t('print.sections.testExecution')}</h1>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>{storyTitle || '—'}</p>
        <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem', fontSize: '0.8rem', color: '#475569' }}>
          {projectName && <span><strong>{t('print.cover.project')}:</strong> {projectName}</span>}
          {execution.environment && <span><strong>{t('execution.environment')}:</strong> {execution.environment}</span>}
          <span><strong>{t('print.cover.date')}:</strong> {new Date(execution.created_at?.replace(' ', 'T')).toLocaleString()}</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: t('execution.status.pass'),    value: stats.pass    || 0, color: '#10b981' },
          { label: t('execution.status.fail'),    value: stats.fail    || 0, color: '#ef4444' },
          { label: t('execution.status.blocked'), value: stats.blocked || 0, color: '#f59e0b' },
          { label: 'Pass rate',                   value: passRate != null ? `${passRate}%` : '—', color: passRate >= 80 ? '#10b981' : passRate >= 50 ? '#f59e0b' : '#ef4444' }
        ].map(({ label, value, color }) => (
          <div key={label} style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.75rem', textAlign: 'center' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color, margin: 0 }}>{value}</p>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.25rem 0 0' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* All results */}
      <h2 style={{ fontSize: '1rem', fontWeight: 600, borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
        {t('execution.results')} ({total})
      </h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc' }}>
            {['ID', t('execution.status.pass').replace('Pasó','Estado'), t('execution.bugTitle'), t('execution.bugSeverity')].map(h => (
              <th key={h} style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map(r => {
            const statusColor = { pass: '#10b981', fail: '#ef4444', blocked: '#f59e0b', skip: '#94a3b8', pending: '#cbd5e1' }[r.status] || '#94a3b8';
            return (
              <tr key={r.tc_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.4rem 0.5rem', fontFamily: 'monospace', color: '#475569' }}>{r.tc_id}</td>
                <td style={{ padding: '0.4rem 0.5rem' }}>
                  <span style={{ color: statusColor, fontWeight: 600 }}>{r.status?.toUpperCase()}</span>
                </td>
                <td style={{ padding: '0.4rem 0.5rem', color: '#334155' }}>{r.bug_titulo || r.tc_titulo}</td>
                <td style={{ padding: '0.4rem 0.5rem', color: '#475569' }}>{r.bug_severidad || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Bugs detail */}
      {bugs.length > 0 && (
        <>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
            {t('execution.bugsFound')} ({bugs.length})
          </h2>
          {bugs.map(b => (
            <div key={b.tc_id} style={{ border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '0.5rem', backgroundColor: '#fff5f5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <strong style={{ fontSize: '0.875rem' }}>{b.bug_titulo || b.tc_titulo}</strong>
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b' }}>{b.tc_id} · {SEV_LABEL[b.bug_severidad] || b.bug_severidad || '—'}</span>
              </div>
              {b.bug_ambiente    && <p style={{ margin: '0.25rem 0', fontSize: '0.8rem', color: '#475569' }}><strong>Ambiente:</strong> {b.bug_ambiente}</p>}
              {b.bug_pasos_reales && <p style={{ margin: '0.25rem 0', fontSize: '0.8rem', color: '#334155', whiteSpace: 'pre-wrap' }}><strong>Resultado real:</strong> {b.bug_pasos_reales}</p>}
              {b.bug_screenshot_url && <p style={{ margin: '0.25rem 0', fontSize: '0.8rem', color: '#2563eb' }}><strong>Evidencia:</strong> {b.bug_screenshot_url}</p>}
              {b.bug_notas       && <p style={{ margin: '0.25rem 0', fontSize: '0.8rem', color: '#475569', fontStyle: 'italic' }}>{b.bug_notas}</p>}
              {b.bug_jira_key    && <p style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}><strong>Jira:</strong> {b.bug_jira_key}</p>}
            </div>
          ))}
        </>
      )}

      <p style={{ marginTop: '2rem', fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center' }}>{t('print.footer')} · QA Assist</p>
    </div>
  );
}
