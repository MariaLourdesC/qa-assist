import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage, useT } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { authApi } from '../api/client';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button type="button" onClick={toggleTheme} aria-label={isDark ? 'Tema claro' : 'Tema oscuro'}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
      {isDark
        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>}
    </button>
  );
}

function LangToggle() {
  const { language, toggleLanguage } = useLanguage();
  return (
    <button type="button" onClick={toggleLanguage}
      className="inline-flex h-9 min-w-[3rem] items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold uppercase tracking-wider text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
      {language === 'es' ? 'EN' : 'ES'}
    </button>
  );
}

function PasswordInput({ id, value, onChange, placeholder, disabled, describedBy }) {
  const t = useT();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? 'text' : 'password'} value={value} onChange={onChange}
        placeholder={placeholder} disabled={disabled} aria-describedby={describedBy}
        className="block w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition-colors hover:border-slate-300 disabled:bg-slate-50 disabled:text-slate-500 focus-visible:outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:disabled:bg-slate-800 dark:focus-visible:border-emerald-400" />
      <button type="button" onClick={() => setShow(s => !s)}
        aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')}
        className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
        {show
          ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
          : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
      </button>
    </div>
  );
}

const BackArrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true"><path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
);

function ForgotScreen({ onBack }) {
  const t = useT();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { const data = await authApi.forgotPassword(email); setResult({ devToken: data.dev_token }); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  if (result) return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{t('auth.forgotSuccess')}</p>
      {result.devToken && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
          <p className="mb-2 text-xs font-semibold text-amber-900 dark:text-amber-100">{t('auth.forgotDevToken')}</p>
          <code className="block break-all rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 select-all">{result.devToken}</code>
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{t('auth.forgotDevHint')}</p>
        </div>
      )}
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300">
        <BackArrow />{t('auth.backToLogin')}
      </button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t('auth.forgotSubtitle')}</p>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('auth.email')}</label>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} disabled={busy}
          placeholder={t('auth.emailPlaceholder')}
          className="block w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus-visible:border-emerald-400" />
      </div>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
      <button type="submit" disabled={busy || !email}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
        {busy ? t('auth.forgotSending') : t('auth.forgotBtn')}
      </button>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
        <BackArrow />{t('auth.backToLogin')}
      </button>
    </form>
  );
}

function ResetScreen({ onBack }) {
  const t = useT();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await authApi.resetPassword(token.trim(), pass); setDone(true); setTimeout(() => navigate('/login', { replace: true }), 2500); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  if (done) return (
    <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/30">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"><path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      <p className="text-sm leading-relaxed text-emerald-800 dark:text-emerald-200">{t('auth.resetSuccess')}</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t('auth.resetSubtitle')}</p>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('auth.resetToken')}</label>
        <input type="text" required value={token} onChange={e => setToken(e.target.value)} disabled={busy}
          placeholder={t('auth.resetTokenPlaceholder')}
          className="block w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 placeholder:text-slate-400 transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus-visible:border-emerald-400" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('auth.newPassword')}</label>
        <PasswordInput id="new-password" value={pass} onChange={e => setPass(e.target.value)} disabled={busy} placeholder={t('auth.passwordPlaceholder')} />
      </div>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
      <button type="submit" disabled={busy || !token || !pass}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
        {busy ? t('auth.resetting') : t('auth.resetBtn')}
      </button>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
        <BackArrow />{t('auth.backToLogin')}
      </button>
    </form>
  );
}

function BrandPanel() {
  const t = useT();
  const features = [
    t('auth.featureAnalysis') || 'Análisis estructurado de historias en segundos',
    t('auth.featureCoverage') || 'Detecta ambigüedades, riesgos y casos borde',
    t('auth.featureLocal')    || 'Modo local-only para datos sensibles'
  ];
  return (
    <div className="relative hidden overflow-hidden bg-slate-900 lg:flex lg:w-2/5 lg:flex-col">
      <svg className="absolute inset-0 h-full w-full text-white/[0.04]" aria-hidden="true">
        <defs><pattern id="brand-dots" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="currentColor" /></pattern></defs>
        <rect width="100%" height="100%" fill="url(#brand-dots)" />
      </svg>
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-500/25 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-teal-500/15 blur-3xl" aria-hidden="true" />

      <div className="relative z-10 flex h-full flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white shadow-lg shadow-emerald-900/30 ring-1 ring-inset ring-white/10 backdrop-blur-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
          </span>
          <div>
            <p className="text-base font-semibold tracking-tight text-white">QA Assist</p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Story Analyzer</p>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white">
              {t('auth.heroTitle') || 'Convierte historias en planes de prueba accionables.'}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              {t('auth.heroSubtitle') || 'Análisis automático de user stories para equipos QA exigentes.'}
            </p>
          </div>
          <ul className="space-y-3">
            {features.map((feat, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 ring-1 ring-inset ring-emerald-400/30">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M4.5 12.75l6 6 9-13.5" /></svg>
                </span>
                <span className="leading-relaxed">{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-slate-500">© {new Date().getFullYear()} QA Assist · {t('auth.localFirst') || 'Local-first by design'}</p>
      </div>
    </div>
  );
}

function AuthModeTabs({ mode, onChange }) {
  const t = useT();
  if (mode !== 'login' && mode !== 'register') return null;
  return (
    <div className="mb-6 inline-flex w-full rounded-lg bg-slate-100 p-1 dark:bg-slate-800/60" role="tablist">
      {[
        { id: 'login',    label: t('auth.tabLogin')    || t('auth.loginBtn') },
        { id: 'register', label: t('auth.tabRegister') || t('auth.registerBtn') }
      ].map(tab => {
        const isActive = mode === tab.id;
        return (
          <button key={tab.id} type="button" role="tab" aria-selected={isActive} onClick={() => onChange(tab.id)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
              isActive
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default function LoginPage() {
  const t = useT();
  const navigate = useNavigate();
  const { user, loading, login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate('/projects', { replace: true });
  }, [user, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password);
      navigate('/projects', { replace: true });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const isLogin = mode === 'login';
  const title = mode === 'forgot' ? t('auth.forgotTitle') : mode === 'reset' ? t('auth.resetTitle') : isLogin ? t('auth.loginTitle') : t('auth.registerTitle');
  const subtitle = isLogin ? t('auth.loginSubtitle') : t('auth.registerSubtitle');

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <BrandPanel />

      <div className="relative flex w-full flex-col lg:w-3/5">
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
          <LangToggle />
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-12">
          <div className="w-full max-w-md">
            {/* Logo mobile only */}
            <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/25">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                </svg>
              </span>
              <p className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">QA Assist</p>
            </div>

            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
              {(isLogin || mode === 'register') && (
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{subtitle}</p>
              )}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200/60 dark:bg-slate-900 dark:shadow-none dark:ring-slate-800 sm:p-8">
              {(mode === 'login' || mode === 'register') && (
                <AuthModeTabs mode={mode} onChange={(m) => { setMode(m); setError(''); }} />
              )}

              {mode === 'forgot' && <ForgotScreen onBack={() => setMode('login')} />}
              {mode === 'reset'  && <ResetScreen  onBack={() => setMode('login')} />}

              {(mode === 'login' || mode === 'register') && (
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('auth.email')}</label>
                    <input id="email" type="email" required autoFocus value={email}
                      onChange={e => { setEmail(e.target.value); setError(''); }}
                      placeholder={t('auth.emailPlaceholder')} disabled={busy}
                      className="block w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors hover:border-slate-300 disabled:bg-slate-50 disabled:text-slate-500 focus-visible:outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:disabled:bg-slate-800 dark:focus-visible:border-emerald-400" />
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('auth.password')}</label>
                      {isLogin && (
                        <button type="button" onClick={() => setMode('forgot')}
                          className="text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 focus-visible:outline-none focus-visible:underline">
                          {t('auth.forgotPassword')}
                        </button>
                      )}
                    </div>
                    <PasswordInput id="password" value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      placeholder={t('auth.passwordPlaceholder')} disabled={busy} />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-800 dark:bg-red-950/30">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400"><path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                      <p className="text-sm leading-relaxed text-red-700 dark:text-red-300">{error}</p>
                    </div>
                  )}

                  <button type="submit" disabled={busy || !email || !password}
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/25 active:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
                    {busy ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" /><path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                        {isLogin ? t('auth.loggingIn') : t('auth.registering')}
                      </>
                    ) : (
                      <>
                        {isLogin ? t('auth.loginBtn') : t('auth.registerBtn')}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"><path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                      </>
                    )}
                  </button>
                </form>
              )}

              {(mode === 'login' || mode === 'register') && isLogin && (
                <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <button type="button" onClick={() => setMode('reset')}
                    className="text-xs text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
                    {t('auth.resetTitle')} {t('auth.withToken') || '(con token)'}
                  </button>
                </div>
              )}
            </div>

            <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
              {t('auth.termsNote') || 'Al continuar aceptas los términos de uso del producto.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
