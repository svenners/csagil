"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  Receipt,
  FileText,
  Tag,
  Zap,
  UploadCloud,
  BarChart3,
  Settings,
  BookOpen,
  LogOut,
  ShieldCheck,
  Globe,
  Menu,
  X
} from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

export type NavTab = "dashboard" | "transactions" | "invoicing" | "categories" | "rules" | "upload" | "reports" | "settings";

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isAccountant?: boolean;
  userEmail?: string;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  isAccountant = false,
  userEmail,
  isOpenMobile,
  setIsOpenMobile,
}: SidebarProps) {
  const { t, locale, setLocale } = useLanguage();

  const navItems: { id: NavTab; label: string; icon: any }[] = [
    { id: "dashboard", label: t.nav.dashboard, icon: LayoutDashboard },
    { id: "transactions", label: t.nav.transactions, icon: Receipt },
    { id: "invoicing", label: t.nav.invoicing, icon: FileText },
    { id: "categories", label: t.nav.categories, icon: Tag },
    { id: "rules", label: t.nav.rules, icon: Zap },
    { id: "upload", label: t.nav.upload, icon: UploadCloud },
    { id: "reports", label: t.nav.reports, icon: BarChart3 },
    { id: "settings", label: t.nav.settings, icon: Settings },
  ];

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    setIsOpenMobile(false);
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-[#233529] text-white flex flex-col transition-transform duration-200 ease-in-out border-r border-[#314838] ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[#314838] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#4a7c59] flex items-center justify-center font-black text-sm tracking-tighter text-white shadow-xs">
                CS
              </div>
              <h1 className="font-extrabold text-sm tracking-wider text-white">CS AGIL FINANCE</h1>
            </div>
            <p className="text-[10px] text-[#9cb1a2] mt-1 font-medium">Brazil Fiscal & Ledger Suite</p>
          </div>
          <button
            onClick={() => setIsOpenMobile(false)}
            className="md:hidden p-1 text-[#9cb1a2] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Accountant Read-Only Indicator */}
        {isAccountant && (
          <div className="mx-3 mt-3 p-2 bg-[#dcfce7]/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[11px] leading-tight">{t.common.readOnlyBadge}</span>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-colors ${
                  isActive
                    ? "bg-[#4a7c59] text-white shadow-xs font-semibold"
                    : "text-[#c2d3c7] hover:bg-[#2d4233] hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-[#8ea494]"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Language Switcher & Footer */}
        <div className="p-4 border-t border-[#314838] space-y-3 bg-[#1c2b21]/70">
          {/* User profile & Sign Out */}
          {userEmail && (
            <div className="flex items-center justify-between text-xs text-[#9cb1a2] pb-1">
              <div className="truncate pr-2">
                <span className="text-[10px] uppercase font-bold text-[#78897d] block">
                  {isAccountant ? "Accountant" : "Logged in"}
                </span>
                <span className="text-white font-medium text-xs truncate block">{userEmail}</span>
              </div>
              <button
                onClick={async () => {
                  try {
                    await fetch("/api/auth/logout", { method: "POST" });
                    const { createClient } = await import("@/lib/supabaseClient");
                    const supabase = createClient();
                    await supabase.auth.signOut();
                  } catch (e) {
                    console.error(e);
                  }
                  window.location.href = "/login";
                }}
                className="p-1.5 rounded-lg text-[#9cb1a2] hover:text-white hover:bg-[#2d4233] transition-colors shrink-0"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* EN / PT-BR Toggle Button */}
          <div className="flex items-center justify-between text-xs text-[#9cb1a2] bg-[#233529] p-1.5 rounded-xl border border-[#314838]">
            <div className="flex items-center gap-1.5 px-2 font-medium">
              <Globe className="w-3.5 h-3.5 text-[#4a7c59]" />
              <span>Language:</span>
            </div>
            <div className="flex gap-1 font-bold text-[11px]">
              <button
                onClick={() => setLocale("pt-BR")}
                className={`px-2 py-0.5 rounded-lg transition-all ${
                  locale === "pt-BR" ? "bg-[#4a7c59] text-white shadow-xs" : "text-[#9cb1a2] hover:text-white"
                }`}
              >
                PT
              </button>
              <button
                onClick={() => setLocale("en")}
                className={`px-2 py-0.5 rounded-lg transition-all ${
                  locale === "en" ? "bg-[#4a7c59] text-white shadow-xs" : "text-[#9cb1a2] hover:text-white"
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
