"use client";

import React from "react";
import { Search, Menu, HardDrive, ShieldCheck, Globe, Bell, Building2 } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { NavTab } from "./Sidebar";

interface HeaderProps {
  activeTab: NavTab;
  onOpenMobileMenu: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSearchSubmit: (q: string) => void;
  isAccountant?: boolean;
  organizationName?: string;
  currentOrganizationId?: string;
  availableWorkspaces?: Array<{ id: string; name: string; role: string }>;
}

export function Header({
  activeTab,
  onOpenMobileMenu,
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  isAccountant = false,
  organizationName,
  currentOrganizationId,
  availableWorkspaces = [],
}: HeaderProps) {
  const { t, locale, setLocale } = useLanguage();

  const titleMap: Record<NavTab, string> = {
    dashboard: t.nav.dashboard,
    transactions: t.nav.transactions,
    invoicing: t.nav.invoicing,
    categories: t.nav.categories,
    rules: t.nav.rules,
    upload: t.nav.upload,
    reports: t.nav.reports,
    settings: t.nav.settings,
  };

  return (
    <header className="sticky top-0 z-30 bg-[#f8fae5]/90 backdrop-blur-md border-b border-[#bfcbbd]/50 px-4 md:px-8 h-16 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3 flex-1">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-[#2f5c40] hover:bg-[#e8ead1] transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h2 className="hidden lg:block font-bold text-lg text-[#1a1d17] tracking-tight shrink-0">
          {titleMap[activeTab]}
        </h2>

        {/* Global Search Bar (Wired to URL/Ledger search) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit(searchQuery);
          }}
          className="relative max-w-md w-full ml-0 lg:ml-2"
        >
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78897d]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.common.search}
            className="w-full pl-10 pr-4 py-1.5 rounded-full border border-[#bfcbbd]/70 bg-[#f6f8df] text-xs md:text-sm text-[#1a1d17] placeholder-[#78897d] focus:outline-none focus:ring-2 focus:ring-[#4a7c59] focus:bg-white transition-all shadow-2xs"
          />
        </form>
      </div>

      {/* Right: Status Indicators & Quick Language Switcher */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Workspace / Company Switcher */}
        {availableWorkspaces && availableWorkspaces.length > 1 ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#f0f2da] border border-[#9cb19e] rounded-xl text-xs font-bold text-[#11140e] shadow-2xs">
            <Building2 className="w-3.5 h-3.5 text-[#2f5c40] shrink-0" />
            <select
              value={currentOrganizationId}
              onChange={async (e) => {
                const orgId = e.target.value;
                await fetch("/api/organization/switch", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ organizationId: orgId }),
                });
                window.location.reload();
              }}
              className="bg-transparent text-[#11140e] font-bold text-xs border-none outline-none cursor-pointer pr-1"
            >
              {availableWorkspaces.map((ws) => (
                <option key={ws.id} value={ws.id} className="text-[#11140e] bg-white font-semibold">
                  {ws.name} ({ws.role === "accountant" ? "Accountant" : ws.role})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#f0f2da] border border-[#bfcbbd] rounded-xl text-xs font-bold text-[#1a1d17] shadow-2xs">
            <Building2 className="w-3.5 h-3.5 text-[#2f5c40] shrink-0" />
            <span className="truncate max-w-[140px]">{organizationName || "CS Agil Finance"}</span>
          </div>
        )}

        {/* Accountant Read-Only Badge */}
        {isAccountant ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Accountant (Read-Only)</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#f0f2da] border border-[#bfcbbd] rounded-xl text-xs font-semibold text-[#1a1d17] shadow-2xs">
            <HardDrive className="w-3.5 h-3.5 text-[#2f5c40]" />
            <span>Cloud Postgres</span>
            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
          </div>
        )}

        {/* Language Quick Switch */}
        <button
          onClick={() => setLocale(locale === "en" ? "pt-BR" : "en")}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-[#bfcbbd] rounded-xl text-xs font-bold text-[#1a1d17] hover:bg-[#f6f8df] transition-colors shadow-2xs"
          title="Switch Language (PT-BR / EN)"
        >
          <Globe className="w-3.5 h-3.5 text-[#4a7c59]" />
          <span>{locale === "en" ? "EN" : "PT"}</span>
        </button>
      </div>
    </header>
  );
}
