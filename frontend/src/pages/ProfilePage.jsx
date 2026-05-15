import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { authApi } from '../api/client';

function PwdInput({ id, value, onChange, placeholder, disabled }) {
  const { t } = useLanguage();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? 'text' : 'password'} value={value} onChange={onChange}
        placeholder={placeholder} disabled={disabled}
        className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 pr-10 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors hover:border-slate-300 dark:hover:border-slate-600 disabled:bg-slate-50 dark:disabled:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1" />
      <button type="button" onClick={() => setShow(s => !s)}
        aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')}
        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
        {show
          ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
          : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
      </button>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <h2 className="mb-5 text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const { user, logout, refreshUser } = useAuth();

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [changingPw, setChangingPw] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await authApi.updateProfile(displayName);
      await refreshUser();
      addToast(t('auth.profileSaved'), 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally { setSavingProfile(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangingPw(true);
    try {
      await authApi.changePassword(currentPw, newPw);
      addToast(t('auth.passwordChanged'), 'success');
      setCurrentPw(''); setNewPw('');
      // Server invalidated all tokens — force logout
      setTimeout(() => logout(), 1500);
    } catch (err) {
      addToast(err.message, 'error');
    } finally { setChangingPw(false); }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    try { return new Date(iso.replace(' ', 'T')).toLocaleDateString(); }
    catch { return iso; }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {t('auth.profileTitle')}
      </h1>

      {/* Account info */}
      <Section title={t('auth.accountSection')}>
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-slate-500 dark:text-slate-400">{t('auth.email')}</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">{user?.email}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-500 dark:text-slate-400">{t('auth.memberSince')}</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">{formatDate(user?.created_at)}</dd>
          </div>
        </dl>
      </Section>

      {/* Display name */}
      <Section title={t('auth.displayName')}>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder={t('auth.displayNamePlaceholder')}
              maxLength={100}
              disabled={savingProfile}
              className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors hover:border-slate-300 dark:hover:border-slate-600 disabled:bg-slate-50 dark:disabled:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('auth.displayNameHint')}</p>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={savingProfile}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
              {savingProfile ? t('auth.savingProfile') : t('auth.saveProfile')}
            </button>
          </div>
        </form>
      </Section>

      {/* Change password */}
      <Section title={t('auth.changePasswordTitle')}>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label htmlFor="current-pw" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('auth.currentPassword')}
            </label>
            <PwdInput id="current-pw" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')} disabled={changingPw} />
          </div>
          <div>
            <label htmlFor="new-pw" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('auth.newPasswordLabel')}
            </label>
            <PwdInput id="new-pw" value={newPw} onChange={e => setNewPw(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')} disabled={changingPw} />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={changingPw || !currentPw || !newPw || newPw.length < 8}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
              {changingPw ? t('auth.changingPassword') : t('auth.changePasswordBtn')}
            </button>
          </div>
        </form>
      </Section>
    </div>
  );
}
