"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Locale, defaultLocale, translations, TranslationKey, t as translate, formatNumber, formatCurrency, formatDate, formatRelativeTime } from "./index";

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
  formatNumber: (value: number) => string;
  formatCurrency: (value: number, currency?: string) => string;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  formatRelativeTime: (date: Date | string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const LOCALE_STORAGE_KEY = "movearound_locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    if (savedLocale && (savedLocale === "en" || savedLocale === "es")) {
      setLocaleState(savedLocale);
    } else {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith("es")) {
        setLocaleState("es");
      }
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
  };

  const contextValue: I18nContextType = {
    locale,
    setLocale,
    t: (key: TranslationKey) => translate(key, locale),
    formatNumber: (value: number) => formatNumber(value, locale),
    formatCurrency: (value: number, currency?: string) => formatCurrency(value, locale, currency),
    formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => formatDate(date, locale, options),
    formatRelativeTime: (date: Date | string) => formatRelativeTime(date, locale),
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (context === undefined) {
    return {
      locale: defaultLocale,
      setLocale: () => {},
      t: (key: TranslationKey) => translate(key, defaultLocale),
      formatNumber: (value: number) => formatNumber(value, defaultLocale),
      formatCurrency: (value: number, currency?: string) => formatCurrency(value, defaultLocale, currency),
      formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => formatDate(date, defaultLocale, options),
      formatRelativeTime: (date: Date | string) => formatRelativeTime(date, defaultLocale),
    };
  }
  return context;
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      className={className || "px-3 py-1.5 bg-space-panel border border-space-border rounded text-text-secondary text-sm focus:outline-none focus:border-gold-border"}
    >
      <option value="en">English</option>
      <option value="es">Español</option>
    </select>
  );
}
