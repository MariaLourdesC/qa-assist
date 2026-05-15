import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { analysisToMarkdown, analysisToCSV, downloadFile, slugify } from '../utils/exportAnalysis';

export default function ExportMenu({ analysis, projectName }) {
  const { addToast } = useToast();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!analysis) return null;

  const md = () => analysisToMarkdown(analysis, projectName);
  const baseName = slugify(`${projectName || 'qa'}-${analysis.input_snapshot?.titulo || 'analisis'}-v${analysis.version || 1}`);

  const handleCopyMd = async () => {
    try {
      await navigator.clipboard.writeText(md());
      addToast(t('export.toast.mdCopied'), 'success');
    } catch {
      addToast(t('export.toast.mdError'), 'error');
    } finally {
      setOpen(false);
    }
  };

  const handleDownloadMd = () => {
    downloadFile(`${baseName}.md`, md(), 'text/markdown;charset=utf-8');
    addToast(t('export.toast.mdDownloaded'), 'success');
    setOpen(false);
  };

  const handleDownloadCSV = () => {
    const tcCount = (analysis.resultado?.test_cases || []).length;
    const ecCount = (analysis.resultado?.negativos_edge_cases || []).length;
    if (tcCount + ecCount === 0) {
      addToast(t('export.toast.csvEmpty'), 'info');
      setOpen(false);
      return;
    }
    downloadFile(`${baseName}-test-cases.csv`, analysisToCSV(analysis), 'text/csv;charset=utf-8');
    addToast(t('export.toast.csvDownloaded', { count: tcCount + ecCount }), 'success');
    setOpen(false);
  };

  const handleDownloadJson = () => {
    const payload = {
      version:        analysis.version,
      analysis_mode:  analysis.meta?.analysis_mode,
      created_at:     analysis.created_at,
      input_snapshot: analysis.input_snapshot,
      meta:           analysis.meta,
      quality_checks: analysis.quality_checks,
      resultado:      analysis.resultado
    };
    downloadFile(`${baseName}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
    addToast(t('export.toast.jsonDownloaded'), 'success');
    setOpen(false);
  };

  const handlePrint = () => {
    setOpen(false);
    setTimeout(() => window.print(), 100);
  };

  const Item = ({ icon, label, hint, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      role="menuitem"
      className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 focus-visible:bg-slate-50 dark:focus-visible:bg-slate-800/60 focus-visible:outline-none"
    >
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">{label}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">{hint}</span>
      </span>
    </button>
  );

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
          <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        {t('export.label')}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">
          <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg shadow-slate-900/10"
        >
          <Item
            label={t('export.copyMd')}
            hint={t('export.copyMdHint')}
            onClick={handleCopyMd}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
              </svg>
            }
          />
          <div className="border-t border-slate-100 dark:border-slate-800" />
          <Item
            label={t('export.downloadMd')}
            hint={t('export.downloadMdHint')}
            onClick={handleDownloadMd}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25M10 14l2 2m0 0l2-2m-2 2v-6" />
                <path d="M14.25 8.25l-3-3m0 0l-3 3m3-3v6" />
              </svg>
            }
          />
          <div className="border-t border-slate-100 dark:border-slate-800" />
          <Item
            label={t('export.downloadCsv')}
            hint={t('export.downloadCsvHint')}
            onClick={handleDownloadCSV}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75.125v-2.25M6 18.375V9a.375.375 0 00-.375-.375H4.5m13.5 9.375h1.5c.621 0 1.125-.504 1.125-1.125M19.5 19.5v-2.25M19.5 9H4.5m15 0a.375.375 0 01.375.375v6.75M4.5 9V6.75m0 0h15M4.5 6.75a.375.375 0 01.375-.375h14.25a.375.375 0 01.375.375V9" />
              </svg>
            }
          />
          <div className="border-t border-slate-100 dark:border-slate-800" />
          <Item
            label={t('export.downloadJson')}
            hint={t('export.downloadJsonHint')}
            onClick={handleDownloadJson}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
            }
          />
          <div className="border-t border-slate-100 dark:border-slate-800" />
          <Item
            label={t('export.print')}
            hint={t('export.printHint')}
            onClick={handlePrint}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
              </svg>
            }
          />
        </div>
      )}
    </div>
  );
}
