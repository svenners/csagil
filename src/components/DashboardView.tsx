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
  ShieldAlert
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { useLanguage } from "@/lib/LanguageContext";
import { NavTab } from "./Sidebar";

interface DashboardProps {
  setActiveTab: (tab: NavTab) => void;
  isAccountant?: boolean;
}

export function DashboardView({ setActiveTab, isAccountant = false }: DashboardProps) {
  const { t, formatMoney } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function fetchReports() {
      try {
        setLoading(true);
        const res = await fetch("/api/reports?period=ytd");
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
  }, []);

  const kpis = data?.kpis || {
    totalIncomeCents: 0,
    totalExpenseCents: 0,
    netBalanceCents: 0,
    transactionCount: 0,
  };

  const cashFlow = data?.cashFlow || [];
  const categories = data?.categoryBreakdown || [];

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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <span className="text-[11px] text-[#78897d] font-medium mt-1 block">Year to Date Inflow</span>
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
            <span className="text-[11px] text-[#78897d] font-medium mt-1 block">Year to Date Outflow</span>
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
            <span className="text-[11px] text-[#d6eed1] font-medium mt-1 block">Net Operating Surplus</span>
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
            <span className="text-[11px] text-[#78897d] font-medium mt-1 block">Audited Records in DB</span>
          </div>
        </div>
      </div>

      {/* Visual Charts: Cash Flow & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Cash Flow Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#bfcbbd]/60 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-[#1a1d17]">{t.dashboard.monthlyCashFlow}</h3>
              <p className="text-xs text-[#78897d]">Inflows vs Outflows progression (PostgreSQL)</p>
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
                No monthly transactions recorded yet. Import a statement or add transactions to view cash flow.
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
                <p className="text-xs text-[#78897d] py-6 text-center">No categorized expenses in current period.</p>
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
