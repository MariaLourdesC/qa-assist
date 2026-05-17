import React, { useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime';

function FilePreview({ file, onRemove }) {
  const isVideo = file.type === 'video';
  return (
    <div className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
      {isVideo ? (
        <video
          src={file.url}
          className="h-24 w-full object-cover"
          controls={false}
          muted
          playsInline
        />
      ) : (
        <img src={file.url} alt={file.filename} className="h-24 w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
        <button
          type="button"
          onClick={() => onRemove(file)}
          className="opacity-0 group-hover:opacity-100 inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          aria-label="Eliminar evidencia"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {isVideo && (
        <div className="absolute bottom-1 left-1">
          <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">VIDEO</span>
        </div>
      )}
    </div>
  );
}

export default function EvidenceUploader({ files = [], onChange, maxFiles = 5 }) {
  const { t } = useLanguage();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFiles = async (fileList) => {
    const remaining = maxFiles - files.length;
    if (remaining <= 0) return;
    setError(null);

    const toUpload = Array.from(fileList).slice(0, remaining);
    setUploading(true);

    const uploaded = [];
    for (const f of toUpload) {
      const formData = new FormData();
      formData.append('file', f);
      try {
        const res = await fetch('/api/uploads', {
          method: 'POST',
          body: formData
          // No Content-Type — browser sets multipart boundary automatically
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.error || `Error ${res.status}`);
          break;
        }
        const data = await res.json();
        uploaded.push(data);
      } catch (err) {
        setError(err.message);
        break;
      }
    }

    setUploading(false);
    if (uploaded.length) onChange([...files, ...uploaded]);
  };

  const handleRemove = async (file) => {
    // Optimistically remove from UI
    onChange(files.filter(f => f.url !== file.url));
    // Best-effort delete from server
    if (file.filename) {
      fetch(`/api/uploads/${file.filename}`, { method: 'DELETE' }).catch(() => {});
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
        {t('evidence.label')} <span className="text-slate-400 font-normal">{t('common.optional')}</span>
        <span className="ml-1 text-slate-400 dark:text-slate-500 text-[11px]">({files.length}/{maxFiles})</span>
      </label>

      {/* Previews grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {files.map((f, i) => (
            <FilePreview key={f.url || i} file={f} onRemove={handleRemove} />
          ))}
        </div>
      )}

      {/* Drop zone */}
      {files.length < maxFiles && (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-4 text-center transition-colors hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10"
        >
          {uploading ? (
            <svg className="h-5 w-5 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="3"/>
              <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-slate-400 dark:text-slate-500" aria-hidden="true">
              <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {uploading ? t('evidence.uploading') : t('evidence.dropHint')}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">{t('evidence.typeHint')}</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        onChange={e => handleFiles(e.target.files)}
      />

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
