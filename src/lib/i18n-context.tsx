"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Locale, LOCALES, getTranslation } from "@/lib/i18n";

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "zh-CN",
  setLocale: () => {},
  t: (key) => key,
});

function detectLocale(): Locale {
  if (typeof window === "undefined") return "zh-CN";
  const saved = localStorage.getItem("locale") as Locale | null;
  if (saved && LOCALES.some((l) => l.code === saved)) return saved;
  const nav = navigator.language;
  if (nav.startsWith("zh-TW") || nav.startsWith("zh-HK")) return "zh-TW";
  if (nav.startsWith("zh")) return "zh-CN";
  if (nav.startsWith("ja")) return "ja";
  if (nav.startsWith("en")) return "en";
  return "zh-CN";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh-CN");

  useEffect(() => {
    setLocaleState(detectLocale());
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem("locale", l);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback((key: string) => getTranslation(locale, key), [locale]);

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      className={`cursor-pointer bg-transparent text-[var(--ink-soft)] border border-[var(--gold)]/25 rounded-full px-3 py-1 text-xs outline-none hover:border-[var(--gold)]/50 transition-colors ${className}`}
      aria-label="Language"
    >
      {LOCALES.map((l) => (
        <option key={l.code} value={l.code} className="bg-[#1a0a0e] text-[#faf6f0]">
          {l.label}
        </option>
      ))}
    </select>
  );
}
