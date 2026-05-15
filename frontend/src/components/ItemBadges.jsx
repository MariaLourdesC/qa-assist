import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const SEVERITY_STYLES = {
  alta:  { bg: 'bg-red-50 dark:bg-red-950/40',     text: 'text-red-700 dark:text-red-300',     ring: 'ring-red-600/20 dark:ring-red-400/20',     dot: 'bg-red-500'   },
  media: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-800 dark:text-amber-200', ring: 'ring-amber-600/20 dark:ring-amber-400/20', dot: 'bg-amber-500' },
  baja:  { bg: 'bg-blue-50 dark:bg-blue-950/40',   text: 'text-blue-700 dark:text-blue-300',   ring: 'ring-blue-600/20 dark:ring-blue-400/20',   dot: 'bg-blue-500'  }
};

const ORIGEN_STYLES = {
  local: { bg: 'bg-slate-50 dark:bg-slate-800/50',   text: 'text-slate-700 dark:text-slate-300',   ring: 'ring-slate-600/20 dark:ring-slate-400/20'   },
  ia:    { bg: 'bg-violet-50 dark:bg-violet-950/40', text: 'text-violet-700 dark:text-violet-300', ring: 'ring-violet-600/20 dark:ring-violet-400/20' },
  mixto: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', ring: 'ring-indigo-600/20 dark:ring-indigo-400/20' }
};

export default function ItemBadges({ severidad, origen }) {
  const { t } = useLanguage();
  const sev = severidad ? SEVERITY_STYLES[severidad] : null;
  const ori = origen ? ORIGEN_STYLES[origen] : null;
  if (!sev && !ori) return null;

  return (
    <div className="inline-flex items-center gap-1.5">
      {sev && (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${sev.bg} ${sev.text} ${sev.ring}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} aria-hidden="true" />
          {t(`badges.severity.${severidad}`)}
        </span>
      )}
      {ori && (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${ori.bg} ${ori.text} ${ori.ring}`}>
          {t(`badges.origin.${origen}`)}
        </span>
      )}
    </div>
  );
}
