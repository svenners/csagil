"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Locale, translations } from "./i18n";

interface LanguageContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: typeof translations["pt-BR"];
  currency: string;
  setCurrency: (c: string) => void;
  formatMoney: (cents: number) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("pt-BR");
  const [currency, setCurrencyState] = useState<string>("BRL");

  useEffect(() => {
    const savedLocale = localStorage.getItem("csagil_locale") as Locale;
    if (savedLocale === "en" || savedLocale === "pt-BR") {
      setLocaleState(savedLocale);
    }
    const savedCurrency = localStorage.getItem("csagil_currency");
    if (savedCurrency) {
      setCurrencyState(savedCurrency);
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("csagil_locale", l);
  };

  const setCurrency = (c: string) => {
    setCurrencyState(c);
    localStorage.setItem("csagil_currency", c);
  };

  const formatMoney = (cents: number): string => {
    const val = (cents || 0) / 100;
    return new Intl.NumberFormat(locale === "pt-BR" ? "pt-BR" : "en-US", {
      style: "currency",
      currency: currency || "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const t = translations[locale];

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, currency, setCurrency, formatMoney }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
