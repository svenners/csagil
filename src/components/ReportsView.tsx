"use client";

import React, { useState, useEffect } from "react";
import { Download, TrendingUp, Store, PiggyBank, FileText, ArrowRight, Calendar } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, Line } from "recharts";
import { useLanguage } from "@/lib/LanguageContext";

export function ReportsView() {
  const { t, formatMoney } = useLanguage();
  const [period, setPeriod] = useState<"month" | "quarter" | "ytd">("quarter");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      try {
        setLoading(true);
        const res = await fetch(`/api/reports?period=${period}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (e) {
        console.error("Reports fetch error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, [period]);

  const kpis = data?.kpis || {
    totalIncomeCents: 0,
    totalExpenseCents: 0,
    netBalanceCents: 0,
    topMerchant: "None",
    topMerchantCents: 0,
    netOperatingSurplusCents: 0,
  };

  const cashFlow = data?.cashFlow || [];
  const taxSummary = data?.taxSummary || {};

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1a1d17]">{t.reports.title}</h2>
          <p className="text-xs text-[#78897d]">{t.reports.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex bg-[#f6f8df] rounded-xl p-1 border border-[#bfcbbd]/60 shadow-2xs text-xs font-bold">
            <button
              onClick={() => setPeriod("month")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === "month" ? "bg-white text-[#2f5c40] shadow-2xs" : "text-[#495a4f]"
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setPeriod("quarter")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === "quarter" ? "bg-white text-[#2f5c40] shadow-2xs" : "text-[#495a4f]"
              }`}
            >
              Quarter
            </button>
            <button
              onClick={() => setPeriod("ytd")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === "ytd" ? "bg-white text-[#2f5c40] shadow-2xs" : "text-[#495a4f]"
              }`}
            >
              YTD
            </button>
          </div>

          {/* Monthly Closing Pack Download Button */}
          <a
            href="/api/closing-pack"
            download
            className="py-2 px-3 bg-[#4a7c59] text-white rounded-xl text-xs font-bold hover:bg-[#2f5c40] transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Closing Pack (Excel)</span>
          </a>
        </div>
      </div>

      {/* Insight KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#bfcbbd]/60 shadow-2xs flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-[#78897d] uppercase">{t.reports.netCashFlow}</span>
            <TrendingUp className="w-4 h-4 text-[#4a7c59]" />
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-800 tracking-tight">
              {formatMoney(kpis.netBalanceCents)}
            </div>
            <span className="text-xs text-[#4a7c59] font-medium block mt-1">Live from database records</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#bfcbbd]/60 shadow-2xs flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-[#78897d] uppercase">{t.reports.topMerchant}</span>
            <Store className="w-4 h-4 text-[#586948]" />
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-base font-bold text-[#1a1d17] truncate max-w-[150px]">{kpis.topMerchant}</div>
              <div className="text-xs text-[#78897d]">Principal Fornecedor</div>
            </div>
            <div className="text-lg font-bold text-[#2f5c40]">{formatMoney(kpis.topMerchantCents)}</div>
          </div>
        </div>

        <div className="bg-[#2f5c40] text-white p-5 rounded-2xl border border-[#bfcbbd]/30 shadow-2xs flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase text-[#d6eed1]">{t.reports.operatingSurplus}</span>
            <PiggyBank className="w-4 h-4 text-[#d6eed1]" />
          </div>
          <div>
            <div className="text-3xl font-black text-white tracking-tight">
              {formatMoney(kpis.netOperatingSurplusCents)}
            </div>
            <span className="text-xs text-[#d6eed1] font-medium block mt-1">Positive operational surplus</span>
          </div>
        </div>
      </div>

      {/* Brazilian Tax Withholdings Table for Accountant */}
      <div className="bg-white p-6 rounded-2xl border border-[#bfcbbd]/60 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-[#1a1d17]">{t.reports.taxSummary}</h3>
            <p className="text-xs text-[#78897d]">
              Audited taxes from {taxSummary.invoiceCount || 0} invoices issued in selected timeframe.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center text-xs">
          <div className="p-3 bg-[#f0f2da] rounded-xl border border-[#bfcbbd]/50">
            <span className="text-[10px] font-bold text-[#78897d] uppercase block">Faturamento</span>
            <span className="font-black text-sm text-[#1a1d17]">{formatMoney(taxSummary.totalBilledCents || 0)}</span>
          </div>
          <div className="p-3 bg-white rounded-xl border border-[#bfcbbd]/50">
            <span className="text-[10px] font-bold text-[#78897d] uppercase block">ISS Total</span>
            <span className="font-black text-sm text-[#2f5c40]">{formatMoney(taxSummary.totalIssCents || 0)}</span>
          </div>
          <div className="p-3 bg-white rounded-xl border border-[#bfcbbd]/50">
            <span className="text-[10px] font-bold text-[#78897d] uppercase block">ISS Retido</span>
            <span className="font-black text-sm text-rose-700">{formatMoney(taxSummary.totalIssWithheldCents || 0)}</span>
          </div>
          <div className="p-3 bg-white rounded-xl border border-[#bfcbbd]/50">
            <span className="text-[10px] font-bold text-[#78897d] uppercase block">PIS (0.65%)</span>
            <span className="font-black text-sm text-[#495a4f]">{formatMoney(taxSummary.totalPisCents || 0)}</span>
          </div>
          <div className="p-3 bg-white rounded-xl border border-[#bfcbbd]/50">
            <span className="text-[10px] font-bold text-[#78897d] uppercase block">COFINS (3.0%)</span>
            <span className="font-black text-sm text-[#495a4f]">{formatMoney(taxSummary.totalCofinsCents || 0)}</span>
          </div>
          <div className="p-3 bg-white rounded-xl border border-[#bfcbbd]/50">
            <span className="text-[10px] font-bold text-[#78897d] uppercase block">CSLL (1.0%)</span>
            <span className="font-black text-sm text-[#495a4f]">{formatMoney(taxSummary.totalCsllCents || 0)}</span>
          </div>
          <div className="p-3 bg-white rounded-xl border border-[#bfcbbd]/50">
            <span className="text-[10px] font-bold text-[#78897d] uppercase block">IRRF (1.5%)</span>
            <span className="font-black text-sm text-[#495a4f]">{formatMoney(taxSummary.totalIrrfCents || 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
