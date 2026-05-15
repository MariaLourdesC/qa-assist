import React from 'react';

const TYPE_STYLES = {
  success: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-900 dark:text-emerald-100', icon: 'text-emerald-600 dark:text-emerald-400' },
  error:   { bg: 'bg-red-50 dark:bg-red-950/40',         border: 'border-red-200 dark:border-red-800',         text: 'text-red-900 dark:text-red-100',         icon: 'text-red-600 dark:text-red-400' },
  warning: { bg: 'bg-amber-50 dark:bg-amber-950/40',     border: 'border-amber-200 dark:border-amber-800',     text: 'text-amber-900 dark:text-amber-100',     icon: 'text-amber-700 dark:text-amber-300' },
  info:    { bg: 'bg-blue-50 dark:bg-blue-950/40',       border: 'border-blue-200 dark:border-blue-800',       text: 'text-blue-900 dark:text-blue-100',       icon: 'text-blue-600 dark:text-blue-400' }
};

const ICONS = {
  success: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
  error:   (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
  warning: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>),
  info:    (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>)
};

export default function ToastContainer({ toasts }) {
  if (!toasts || toasts.length === 0) return null;
  return (
    <>
      <style>{`
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateX(1rem); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2" aria-live="polite" aria-atomic="false">
        {toasts.map(toast => {
          const styles = TYPE_STYLES[toast.type] || TYPE_STYLES.info;
          const icon = ICONS[toast.type] || ICONS.info;
          return (
            <div key={toast.id} role="status"
              className={`pointer-events-auto flex min-w-[260px] max-w-md items-start gap-3 rounded-xl border ${styles.border} ${styles.bg} px-4 py-3 shadow-lg shadow-slate-900/5`}
              style={{ animation: 'toast-slide-in 0.25s ease-out' }}>
              <span className={`mt-0.5 shrink-0 ${styles.icon}`}>{icon}</span>
              <p className={`text-sm font-medium leading-relaxed ${styles.text}`}>{toast.message}</p>
            </div>
          );
        })}
      </div>
    </>
  );
}
