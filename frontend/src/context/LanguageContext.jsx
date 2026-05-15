import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import esDict from '../i18n/es.json';
import enDict from '../i18n/en.json';

const STORAGE_KEY = 'qa-assist-language';
const DICTS = { es: esDict, en: enDict };
const FALLBACK = 'es';

const LanguageContext = createContext();

function getInitialLanguage() {
  if (typeof window === 'undefined') return FALLBACK;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'es' || stored === 'en') return stored;
  const navLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
  if (navLang.startsWith('en')) return 'en';
  return FALLBACK;
}

function lookup(dict, path) {
  if (!dict) return undefined;
  const parts = path.split('.');
  let cur = dict;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

function interpolate(template, vars) {
  if (typeof template !== 'string' || !vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? String(vars[k]) : `{{${k}}}`));
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(getInitialLanguage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => (prev === 'es' ? 'en' : 'es'));
  }, []);

  const t = useCallback((key, vars) => {
    if (!key) return '';
    // Soporte sufijo de pluralización (key + "_one"/"_other") con vars.count
    if (vars && typeof vars.count === 'number') {
      const suffix = vars.count === 1 ? '_one' : '_other';
      const pluralVal = lookup(DICTS[language], key + suffix) ?? lookup(DICTS[FALLBACK], key + suffix);
      if (pluralVal != null) return interpolate(pluralVal, vars);
    }
    const val = lookup(DICTS[language], key) ?? lookup(DICTS[FALLBACK], key);
    if (val == null) return key;
    return interpolate(val, vars);
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, toggleLanguage, t }), [language, toggleLanguage, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useT() {
  const ctx = useContext(LanguageContext);
  return ctx ? ctx.t : (k) => k;
}
