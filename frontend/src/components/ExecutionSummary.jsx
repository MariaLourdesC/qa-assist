import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { executionsApi } from '../api/client';
import { createPortal } from 'react-dom';
import PrintableExecution from './PrintableExecution';
import SignOffChecklist from './SignOffChecklist';
import { useToast } from '../context/ToastContext';

const BUG_STATUS_STYLES = {
  open:       'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300',
  fixed:      'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
  verified:   'bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300',
  wont_fix:   'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
  duplicate:  'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
};

function BugStatusSelector({ result, executionId }) {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const [status, setStatus] = useState(result.bug_status || 'open');
  const [saving, setSaving] = useState(false);

  const update = async (val) => {
    setSaving(true);
    setStatus(val);
    try {
      await executionsApi.updateResult(executionId, {
        tc_id: result.tc_id, status: result.status,
        bug_titulo: result.bug_titulo, bug_pasos_reales: result.bug_pasos_reales,
        bug_severidad: result.bug_severidad, bug_ambiente: result.bug_ambiente,
        bug_screenshot_url: result.bug_screenshot_url, bug_notas: result.bug_notas,
        bug_status: val
      });
      addToast(t('execution.bugStatusUpdated'), 'success');
    } catch (err) { addToast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  return (
    <select
      value={status}
      onChange={e => update(e.target.value)}
      disabled={saving}
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium border-0 outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 ${BUG_STATUS_STYLES[status] || BUG_STATUS_STYLES.open}`}
    >
      {['open','fixed','verified','wont_fix','duplicate'].map(s => (
        <option key={s} value={s}>{t(`execution.bugStatus.${s}`)}</option>
      ))}
    </select>
  );
}

const STATUS_COLORS = {
  pass:    'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40',
  fail:    'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40',
  blocked: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40',
  skip:    'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800',
  pending: 'text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50'
};

function StatCard({ label, value, colorClass }) {
  return (
    <div className={`rounded-xl px-4 py-3 text-center ${colorClass}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium mt-0.5">{label}</p>
    </div>
  );
}

export default function ExecutionSummary({ execution, onClose, onNewRun, onRetest, storyTitle, projectName }) {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const stats  = execution.stats || {};
  const bugs   = (execution.results || []).filter(r => r.status === 'fail' || r.status === 'blocked');
  const total  = execution.results?.length || 0;
  const done   = total - (stats.pending || 0);
  const passed = stats.pass || 0;

  const [showJira, setShowJira]         = useState(false);
  const [showSync, setShowSync]         = useState(false);
  const [syncing, setSyncing]           = useState(false);
  const [syncResults, setSyncResults]   = useState(null);
  const exportedBugs = (execution.results || []).filter(r => r.bug_jira_key);
  const failedItems = (execution.results || []).filter(r => r.status === 'fail' || r.status === 'blocked');
  const [approving, setApproving]       = useState(false);
  const [approved, setApproved]         = useState(execution.story_estado === 'approved');
  const [showChecklist, setShowChecklist] = useState(false);
  const [jiraUrl, setJiraUrl]     = useState('');
  const [email, setEmail]         = useState('');
  const [apiToken, setApiToken]   = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exported, setExported]   = useState([]);

  const handleApprove = () => setShowChecklist(true);

  const handlePrint = () => window.print();

  const handleSyncJira = async (e) => {
    e.preventDefault();
    setSyncing(true);
    setSyncResults(null);
    try {
      const form = e.target;
      const data = await executionsApi.syncJira(execution.id, {
        jiraUrl: form.jiraUrl.value,
        email:   form.email.value,
        apiToken: form.apiToken.value
      });
      setSyncResults(data);
      if (data.synced > 0) addToast(t('execution.syncedOk', { count: data.synced }), 'success');
      else addToast(t('execution.syncedNone'), 'info');
    } catch (err) {
      addToast(err.message, 'error');
    } finally { setSyncing(false); }
  };

  const handleExportJira = async (e) => {
    e.preventDefault();
    setExporting(true);
    try {
      const data = await executionsApi.exportBugs(execution.id, { jiraUrl, email, apiToken, projectKey });
      setExported(data.created || []);
      if (data.created.length) addToast(t('execution.bugsExported', { count: data.created.length }), 'success');
      if (data.errors.length)  addToast(t('execution.bugsErrors',   { count: data.errors.length }),  'error');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  const copyMarkdown = () => {
    const lines = [
      `# ${t('execution.summaryTitle')}`,
      `**${t('execution.environment')}:** ${execution.environment || '—'}`,
      `**${t('execution.date')}:** ${new Date(execution.created_at).toLocaleString()}`,
      '',
      `## ${t('execution.results')}`,
      `- ✅ ${t('execution.status.pass')}: ${passed}`,
      `- ❌ ${t('execution.status.fail')}: ${stats.fail || 0}`,
      `- ⏸ ${t('execution.status.blocked')}: ${stats.blocked || 0}`,
      `- ⏭ ${t('execution.status.skip')}: ${stats.skip || 0}`,
      '',
      ...(bugs.length ? [`## ${t('execution.bugsFound')}`, ...bugs.map(b =>
        `### [${b.tc_id}] ${b.bug_titulo || b.tc_titulo}\n` +
        `**${t('execution.bugSeverity')}:** ${b.bug_severidad || 'media'}\n` +
        (b.bug_ambiente ? `**${t('execution.bugEnvironment')}:** ${b.bug_ambiente}\n` : '') +
        (b.bug_pasos_reales ? `**${t('execution.bugActual')}:**\n${b.bug_pasos_reales}\n` : '') +
        (b.bug_screenshot_url ? `**${t('execution.bugScreenshot')}:** ${b.bug_screenshot_url}\n` : '') +
        (b.bug_jira_key ? `**Jira:** ${b.bug_jira_key}\n` : '')
      )] : [])
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(
      () => addToast(t('execution.copiedMd'), 'success'),
      () => addToast(t('execution.copyError'), 'error')
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t('execution.summaryTitle')}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {execution.environment && `${execution.environment} · `}
            {new Date(execution.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
            </svg>
            {t('export.print')}
          </button>
          {exportedBugs.length > 0 && (
            <button type="button" onClick={() => setShowSync(s => !s)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 transition-colors hover:bg-blue-100 dark:hover:bg-blue-950/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 opacity-90" aria-hidden="true">
                <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.004-1.005zm5.723-5.756H5.757a5.215 5.215 0 0 0 5.214 5.214h2.131v2.058a5.218 5.218 0 0 0 5.215 5.214V6.762a1.005 1.005 0 0 0-1.023-1.005zM23.013 0H11.47a5.215 5.215 0 0 0 5.215 5.215h2.13v2.057A5.215 5.215 0 0 0 24.018 12.49V1.005A1.005 1.005 0 0 0 23.013 0z"/>
              </svg>
              {t('execution.syncJira', { count: exportedBugs.length })}
            </button>
          )}
          <button type="button" onClick={copyMarkdown}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
            </svg>
            {t('execution.copyMd')}
          </button>
          {bugs.length > 0 && !showJira && (
            <button type="button" onClick={() => setShowJira(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 opacity-90" aria-hidden="true">
                <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.004-1.005zm5.723-5.756H5.757a5.215 5.215 0 0 0 5.214 5.214h2.131v2.058a5.218 5.218 0 0 0 5.215 5.214V6.762a1.005 1.005 0 0 0-1.023-1.005zM23.013 0H11.47a5.215 5.215 0 0 0 5.215 5.215h2.13v2.057A5.215 5.215 0 0 0 24.018 12.49V1.005A1.005 1.005 0 0 0 23.013 0z"/>
              </svg>
              {t('execution.exportBugsJira', { count: bugs.length })}
            </button>
          )}
          {!approved ? (
            <button
              type="button"
              onClick={handleApprove}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('execution.approveBtn')}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/40 px-3 py-1.5 text-xs font-medium text-violet-700 dark:text-violet-300 ring-1 ring-inset ring-violet-600/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('execution.approved')}
            </span>
          )}
          {failedItems.length > 0 && onRetest && (
            <button type="button" onClick={() => onRetest(failedItems)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 transition-colors hover:bg-red-100 dark:hover:bg-red-950/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              {t('execution.retest', { count: failedItems.length })}
            </button>
          )}
          <button type="button" onClick={onNewRun}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            {t('execution.newRun')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label={t('execution.status.pass')}    value={stats.pass    || 0} colorClass={STATUS_COLORS.pass} />
        <StatCard label={t('execution.status.fail')}    value={stats.fail    || 0} colorClass={STATUS_COLORS.fail} />
        <StatCard label={t('execution.status.blocked')} value={stats.blocked || 0} colorClass={STATUS_COLORS.blocked} />
        <StatCard label={t('execution.status.skip')}    value={stats.skip    || 0} colorClass={STATUS_COLORS.skip} />
      </div>

      {/* Jira export form */}
      {showJira && (
        <form onSubmit={handleExportJira} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('execution.exportJiraTitle')}</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['ji-url2', 'url', jiraUrl, setJiraUrl, t('jira.jiraUrl'), t('jira.jiraUrlPlaceholder')],
              ['ji-em2', 'email', email, setEmail, t('jira.email'), t('jira.emailPlaceholder')],
              ['ji-tok2', 'password', apiToken, setApiToken, t('jira.apiToken'), t('jira.apiTokenPlaceholder')],
              ['ji-proj2', 'text', projectKey, setProjectKey, t('jira.projectKey'), t('jira.projectKeyPlaceholder')]
            ].map(([id, type, val, setter, label, ph]) => (
              <div key={id}>
                <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{label}</label>
                <input id={id} type={type} value={val} onChange={e => setter(type === 'text' ? e.target.value.toUpperCase() : e.target.value)}
                  placeholder={ph} required
                  className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1" />
              </div>
            ))}
          </div>
          {exported.length > 0 && (
            <ul className="space-y-1">
              {exported.map(r => (
                <li key={r.tcId} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">{r.tcId}</span>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">{r.issueKey}</a>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowJira(false)} className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">{t('jira.cancel')}</button>
            <button type="submit" disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              {exporting ? t('jira.exporting') : t('execution.exportBugsBtn', { count: bugs.filter(b => !b.bug_jira_key).length })}
            </button>
          </div>
        </form>
      )}

      {/* Bug list */}
      {bugs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('execution.bugsFound')} ({bugs.length})</p>
          {bugs.map(b => (
            <div key={b.tc_id} className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-950/20 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{b.bug_titulo || b.tc_titulo}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {b.tc_id} · {t(`execution.severity.${b.bug_severidad || 'media'}`)}
                    {b.bug_ambiente ? ` · ${b.bug_ambiente}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                {b.bug_jira_key && (
                  <span className="rounded bg-blue-100 dark:bg-blue-950/40 px-2 py-0.5 text-[11px] font-mono font-medium text-blue-700 dark:text-blue-300">{b.bug_jira_key}</span>
                )}
                <BugStatusSelector result={b} executionId={execution.id} />
              </div>
              </div>
              {b.bug_pasos_reales && (
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-2">{b.bug_pasos_reales}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {showSync && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20 p-4 mt-2">
          <p className="mb-3 text-xs font-semibold text-blue-700 dark:text-blue-300">
            {t('execution.syncJiraTitle', { count: exportedBugs.length })}
          </p>
          <form onSubmit={handleSyncJira} className="grid grid-cols-2 gap-2">
            {[['jiraUrl','url','Jira URL','https://company.atlassian.net'],
              ['email','email','Email','you@company.com'],
              ['apiToken','password','API Token','token']].map(([name, type, label, ph]) => (
              <div key={name} className={name === 'jiraUrl' ? 'col-span-2' : ''}>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{label}</label>
                <input name={name} type={type} required placeholder={ph}
                  className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" />
              </div>
            ))}
            {syncResults && (
              <div className="col-span-2 text-xs text-slate-600 dark:text-slate-400">
                {t('execution.syncResult', { synced: syncResults.synced, total: exportedBugs.length })}
                {syncResults.updates.map(u => (
                  <div key={u.tcId} className="mt-0.5">
                    <span className="font-mono">{u.key}</span>: {u.from} → <span className="font-semibold">{u.to}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowSync(false)} className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">{t('jira.cancel')}</button>
              <button type="submit" disabled={syncing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                {syncing ? t('common.loading') : t('execution.syncBtn')}
              </button>
            </div>
          </form>
        </div>
      )}

      {showChecklist && (
        <SignOffChecklist
          executionId={execution.id}
          onApprove={() => { setShowChecklist(false); setApproved(true); }}
          onCancel={() => setShowChecklist(false)}
        />
      )}

      {createPortal(
        <div className="print-only" aria-hidden="true">
          <PrintableExecution execution={execution} projectName={projectName} storyTitle={storyTitle} />
        </div>,
        document.body
      )}

      <button type="button" onClick={onClose}
        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
        {t('execution.backToTcs')}
      </button>
    </div>
  );
}
