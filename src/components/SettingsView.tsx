"use client";

import React, { useState } from "react";
import { Settings, Upload, Download, Globe, HardDrive, CheckCircle2, ShieldAlert } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

interface SettingsViewProps {
  isAccountant?: boolean;
}

export function SettingsView({ isAccountant = false }: SettingsViewProps) {
  const { t, locale, setLocale, currency, setCurrency } = useLanguage();
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const handleCsfinanceBackupRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const text = await file.text();
      const json = JSON.parse(text);

      const res = await fetch("/api/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });

      if (res.ok) {
        const result = await res.json();
        setImportMessage(result.message);
      } else {
        const err = await res.json();
        alert(`Migration error: ${err.error}`);
      }
    } catch (e: any) {
      alert(`Invalid backup JSON file: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold text-[#1a1d17]">{t.settings.title}</h2>
        <p className="text-xs text-[#78897d]">Manage organization preferences, language, currency, and data backups.</p>
      </div>

      {isAccountant && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-3 text-xs text-emerald-900 font-bold">
          <ShieldAlert className="w-5 h-5 text-emerald-600" />
          <span>{t.common.readOnlyNotice}</span>
        </div>
      )}

      {/* Language & Currency Preferences */}
      <div className="bg-white p-6 rounded-2xl border border-[#bfcbbd]/60 shadow-2xs space-y-4">
        <h3 className="font-bold text-sm text-[#1a1d17]">Preferences & Display</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-[#495a4f] mb-1">{t.settings.language}</label>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-[#bfcbbd] bg-white font-medium"
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en">English (US)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-[#495a4f] mb-1">{t.settings.currency}</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#bfcbbd] bg-white font-medium"
            >
              <option value="BRL">R$ BRL - Brazilian Real</option>
              <option value="USD">$ USD - United States Dollar</option>
              <option value="EUR">€ EUR - Euro</option>
              <option value="GBP">£ GBP - British Pound</option>
            </select>
          </div>
        </div>
      </div>

      {/* Migration & Backup Section */}
      {!isAccountant && (
        <div className="bg-white p-6 rounded-2xl border border-[#bfcbbd]/60 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-[#4a7c59]" />
            <h3 className="font-bold text-sm text-[#1a1d17]">Database Migration from csfinance</h3>
          </div>
          <p className="text-xs text-[#495a4f]">
            Easily import your previous <code>ProfitLedger_Database_Backup_*.json</code> or <code>Finflow_AppData.json</code> backup from csfinance into PostgreSQL.
          </p>

          <div className="pt-2">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#4a7c59] text-white rounded-xl text-xs font-bold hover:bg-[#2f5c40] transition-colors cursor-pointer shadow-2xs">
              <Upload className="w-4 h-4" />
              <span>{importing ? "Importing Data..." : t.settings.restoreDatabase}</span>
              <input type="file" accept=".json" onChange={handleCsfinanceBackupRestore} className="hidden" disabled={importing} />
            </label>

            {importMessage && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{importMessage}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
