"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  UploadCloud,
  FileText,
  Clock,
  ArrowRight,
  ShieldAlert,
  Calendar,
  Filter
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { useLanguage } from "@/lib/LanguageContext";
import { NavTab } from "./Sidebar";

interface DashboardProps {
  setActiveTab: (tab: NavTab) => void;
  isAccountant?: boolean;
}

const MONTHS = [
  { value: "01", name: "Jan", fullName: "Janeiro / January" },
  { value: "02", name: "Feb", fullName: "Fevereiro / February" },
  { value: "03", name: "Mar", fullName: "Março / March" },
  { value: "04", name: "Apr", fullName: "Abril / April" },
  { value: "05", name: "May", fullName: "Maio / May" },
  { value: "06", name: "Jun", fullName: "Junho / June" },
  { value: "07", name: "Jul", fullName: "Julho / July" },
  { value: "08", name: "Aug", fullName: "Agosto / August" },
  { value: "09", name: "Sep", fullName: "Setembro / September" },
  { value: "10", name: "Oct", fullName: "Outubro / October" },
  { value: "11", name: "Nov", fullName: "Novembro / November" },
  { value: "12", name: "Dec", fullName: "Dezembro / December" },
];

const YEARS = ["2023", "2024", "2025", "2026", "2027"];

export function DashboardView({ setActiveTab, isAccountant = false }: DashboardProps) {
  const { t, formatMoney } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Period filtering state
  const [period, setPeriod] = useState<"month" | "year" | "all" | "custom">("month");
  const [selectedMonth, setSelectedMonth] = useState<string>("01");
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [customStart, setCustomStart] = useState<string>("2026-01-01");
  const [customEnd, setCustomEnd] = useState<string>("2026-12-31");

  useEffect(() => {
    const now = new Date();
    setSelectedMonth(String(now.getMonth() + 1).padStart(2, "0"));
    setSelectedYear(String(now.getFullYear()));
    setCustomStart(`${now.getFullYear()}-01-01`);
    setCustomEnd(now.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    async function fetchReports() {
      try {
        setLoading(true);
        let url = `/api/reports?period=${period}`;
        if (period === "month") {
          url += `&year=${selectedYear}&month=${selectedMonth}`;
        } else if (period === "year") {
          url += `&year=${selectedYear}`;
        } else if (period === "custom") {
          if (!customStart || !customEnd) return;
          url += `&startDate=${customStart}&endDate=${customEnd}`;
        }
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Dashboard reports fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, [period, selectedMonth, selectedYear, customStart, customEnd]);

  const kpis = data?.kpis || {
    totalIncomeCents: 0,
    totalExpenseCents: 0,
    netBalanceCents: 0,
    transactionCount: 0,
  };

  const cashFlow = data?.cashFlow || [];
  const categories = data?.categoryBreakdown || [];

  const getPeriodLabel = () => {
    if (period === "month") {
      const m = MONTHS.find((item) => item.value === selectedMonth);
      return `${m?.name || selectedMonth} ${selectedYear}`;
    }
    if (period === "year") {
      return `${selectedYear}`;
    }
    if (period === "all") {
      return t.dashboard.periodAll || "All Time";
    }
    if (period === "custom") {
      return `${customStart} ~ ${customEnd}`;
    }
    return "";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Accountant Notice Banner if signed in as accountant */}
      {isAccountant && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-start gap-3 shadow-2xs text-xs text-emerald-900">
          <ShieldAlert className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm text-emerald-900">{t.common.readOnlyBadge}</h4>
            <p className="mt-0.5 text-emerald-800">{t.common.readOnlyNotice}</p>
          </div>
        </div>
      )}

      {/* Period Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-[#bfcbbd]/60 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Main Period Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#f6f8df] p-1.5 rounded-xl border border-[#bfcbbd]/60 text-xs font-bold">
            <button
              onClick={() => setPeriod("month")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === "month"
                  ? "bg-[#2f5c40] text-white shadow-2xs"
                  : "text-[#495a4f] hover:text-[#11140e]"
              }`}
            >
              {t.dashboard.periodMonth || "Month"}
            </button>
            <button
              onClick={() => setPeriod("year")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === "year"
                  ? "bg-[#2f5c40] text-white shadow-2xs"
                  : "text-[#495a4f] hover:text-[#11140e]"
              }`}
            >
              {t.dashboard.periodYear || "Year"}
            </button>
            <button
              onClick={() => setPeriod("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === "all"
                  ? "bg-[#2f5c40] text-white shadow-2xs"
                  : "text-[#495a4f] hover:text-[#11140e]"
              }`}
            >
              {t.dashboard.periodAll || "All Time"}
            </button>
            <button
              onClick={() => setPeriod("custom")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === "custom"
                  ? "bg-[#2f5c40] text-white shadow-2xs"
                  : "text-[#495a4f] hover:text-[#11140e]"
              }`}
            >
              {t.dashboard.periodCustom || "Defined Period"}
            </button>
          </div>

          {/* Contextual Granular Filter Controls */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {period === "month" && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#78897d] uppercase">{t.common.date}:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-[#9cb19e] bg-white text-[#11140e] font-semibold text-xs shadow-2xs focus:border-[#2f5c40] focus:outline-none"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value} className="text-[#11140e] bg-white">
                      {m.name} ({m.fullName})
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-[#9cb19e] bg-white text-[#11140e] font-semibold text-xs shadow-2xs focus:border-[#2f5c40] focus:outline-none"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y} className="text-[#11140e] bg-white">
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {period === "year" && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#78897d] uppercase">Ano / Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-[#9cb19e] bg-white text-[#11140e] font-semibold text-xs shadow-2xs focus:border-[#2f5c40] focus:outline-none"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y} className="text-[#11140e] bg-white">
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {period === "custom" && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#78897d] uppercase">
                    {t.dashboard.startDate || "From"}:
                  </span>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-[#9cb19e] bg-white text-[#11140e] font-semibold text-xs shadow-2xs focus:border-[#2f5c40] focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#78897d] uppercase">
                    {t.dashboard.endDate || "To"}:
                  </span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-[#9cb19e] bg-white text-[#11140e] font-semibold text-xs shadow-2xs focus:border-[#2f5c40] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {period === "all" && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#f0f2da] rounded-xl text-[#2f5c40] font-bold text-xs border border-[#bfcbbd]/60">
                <Clock className="w-3.5 h-3.5" />
                <span>Todo o Histórico (All Database Records)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity duration-200 ${loading ? "opacity-60" : "opacity-100"}`}>
        {/* Total Income */}
        <div className="bg-white p-5 rounded-2xl border border-[#bfcbbd]/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78897d] uppercase tracking-wider">
              {t.dashboard.totalIncome}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-800 tracking-tight">
              {formatMoney(kpis.totalIncomeCents)}
            </div>
            <span className="text-[11px] text-[#78897d] font-medium mt-1 block">
              {getPeriodLabel()} Inflow
            </span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-[#bfcbbd]/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78897d] uppercase tracking-wider">
              {t.dashboard.totalExpenses}
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-800 tracking-tight">
              {formatMoney(kpis.totalExpenseCents)}
            </div>
            <span className="text-[11px] text-[#78897d] font-medium mt-1 block">
              {getPeriodLabel()} Outflow
            </span>
          </div>
        </div>

        {/* Net Balance */}
        <div className="bg-[#2f5c40] text-white p-5 rounded-2xl border border-[#bfcbbd]/30 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#d6eed1]">
              {t.dashboard.netBalance}
            </span>
            <div className="w-7 h-7 rounded-lg bg-white/10 text-white flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              {formatMoney(kpis.netBalanceCents)}
            </div>
            <span className="text-[11px] text-[#d6eed1] font-medium mt-1 block">
              {getPeriodLabel()} Net Surplus
            </span>
          </div>
        </div>

        {/* Transaction Volume */}
        <div className="bg-white p-5 rounded-2xl border border-[#bfcbbd]/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78897d] uppercase tracking-wider">
              {t.dashboard.transactionVolume}
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#f0f2da] text-[#2f5c40] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#1a1d17] tracking-tight">
              {kpis.transactionCount}
            </div>
            <span className="text-[11px] text-[#78897d] font-medium mt-1 block">
              {getPeriodLabel()} Records in DB
            </span>
          </div>
        </div>
      </div>

      {/* Visual Charts: Cash Flow & Category Distribution */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 transition-opacity duration-200 ${loading ? "opacity-60" : "opacity-100"}`}>
        {/* Monthly Cash Flow Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#bfcbbd]/60 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-[#1a1d17]">{t.dashboard.monthlyCashFlow}</h3>
              <p className="text-xs text-[#78897d]">
                {getPeriodLabel()} progression &mdash; Inflows vs Outflows (PostgreSQL)
              </p>
            </div>
            <button
              onClick={() => setActiveTab("reports")}
              className="text-xs font-bold text-[#4a7c59] hover:underline flex items-center gap-1"
            >
              <span>{t.dashboard.viewAll}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full pt-2">
            {cashFlow.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#78897d]">
                No transactions recorded for {getPeriodLabel()}. Import a statement or adjust the period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlow} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="month" stroke="#78897d" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#78897d"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `R$ ${(v / 100000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: any) => [formatMoney(v as number), ""]}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "12px",
                      borderColor: "#bfcbbd",
                      fontSize: "12px",
                      color: "#11140e",
                    }}
                  />
                  <Bar dataKey="inflowCents" fill="#2f5c40" radius={[4, 4, 0, 0]} name={t.dashboard.inflow} />
                  <Bar dataKey="outflowCents" fill="#ba1a1a" radius={[4, 4, 0, 0]} name={t.dashboard.outflow} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Spending Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-[#bfcbbd]/60 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-base text-[#1a1d17]">Spending Breakdown</h3>
              <button
                onClick={() => setActiveTab("categories")}
                className="text-xs font-bold text-[#4a7c59] hover:underline"
              >
                Categories
              </button>
            </div>
            <div className="space-y-3">
              {categories.slice(0, 5).map((cat: any) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#1a1d17]">{cat.name}</span>
                    <span className="text-[#495a4f]">{formatMoney(cat.spentCents)}</span>
                  </div>
                  <div className="w-full h-2 bg-[#f0f2da] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#4a7c59] rounded-full"
                      style={{ width: `${Math.min(100, cat.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-xs text-[#78897d] py-6 text-center">
                  No categorized expenses in {getPeriodLabel()}.
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions (only enabled for owner/editor) */}
          {!isAccountant && (
            <div className="pt-4 border-t border-[#bfcbbd]/40 grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveTab("transactions")}
                className="py-2 px-3 bg-[#4a7c59] text-white rounded-xl text-xs font-bold hover:bg-[#2f5c40] transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.dashboard.newTransaction}</span>
              </button>
              <button
                onClick={() => setActiveTab("upload")}
                className="py-2 px-3 bg-[#f6f8df] border border-[#bfcbbd] text-[#1a1d17] rounded-xl text-xs font-bold hover:bg-[#e8ead1] transition-colors flex items-center justify-center gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5 text-[#4a7c59]" />
                <span>{t.dashboard.uploadStatement}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
