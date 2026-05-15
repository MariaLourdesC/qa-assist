import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const labelize = (col) => col.charAt(0).toUpperCase() + col.slice(1).replace(/_/g, ' ');

export default function InlineTable({ items, columns, onUpdate, placeholders = {} }) {
  const { t } = useLanguage();
  const handleAddRow = () => {
    const newRow = Object.fromEntries(columns.map(col => [col, '']));
    onUpdate([...items, newRow]);
  };
  const handleUpdateRow = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onUpdate(updated);
  };
  const handleDeleteRow = (index) => onUpdate(items.filter((_, i) => i !== index));
  const gridStyle = { gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr)) 2.25rem` };

  return (
    <div className="space-y-2">
      {items.length > 0 ? (
        <>
          <div className="grid gap-2 px-3" style={gridStyle}>
            {columns.map(col => (<div key={col} className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{labelize(col)}</div>))}
            <div aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            {items.map((item, i) => (
              <div key={i} className="grid items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 shadow-sm transition-colors duration-200 hover:border-slate-300 dark:hover:border-slate-600" style={gridStyle}>
                {columns.map(col => (
                  <input key={col} type="text" value={item[col] || ''} onChange={(e) => handleUpdateRow(i, col, e.target.value)} placeholder={placeholders[col] || ''}
                    className="w-full min-w-0 rounded-md bg-transparent px-2 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 focus-visible:bg-slate-50 dark:focus-visible:bg-slate-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500" />
                ))}
                <button type="button" onClick={() => handleDeleteRow(i)} aria-label={t('inlineTable.deleteRow')}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 dark:text-slate-500 transition-colors duration-200 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/30 px-4 py-5 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('inlineTable.addRowHint')}</p>
        </div>
      )}
      <button type="button" onClick={handleAddRow} className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 transition-colors duration-200 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M12 4.5v15m7.5-7.5h-15" /></svg>
        {t('inlineTable.addRow')}
      </button>
    </div>
  );
}
