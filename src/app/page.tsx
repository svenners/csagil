"use client";

import React, { useState, useEffect } from "react";
import { Sidebar, NavTab } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { DashboardView } from "@/components/DashboardView";
import { TransactionsView } from "@/components/TransactionsView";
import { InvoicingView } from "@/components/InvoicingView";
import { CategoriesView } from "@/components/CategoriesView";
import { StatementUploadView } from "@/components/StatementUploadView";
import { ReportsView } from "@/components/ReportsView";
import { SettingsView } from "@/components/SettingsView";

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isAccountant, setIsAccountant] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setIsAccountant(data.isAccountant);
            setUserEmail(data.email);
          }
        }
      } catch (err) {
        console.error("Failed to fetch auth session:", err);
      }
    }
    checkAuth();
  }, []);

  const handleSearchSubmit = (q: string) => {
    setSearchQuery(q);
    setActiveTab("transactions");
  };

  return (
    <div className="min-h-screen bg-[#fdfdf9] flex">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAccountant={isAccountant}
        isOpenMobile={isOpenMobile}
        setIsOpenMobile={setIsOpenMobile}
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0 transition-all">
        {/* Sticky Header with Search and Language Toggle */}
        <Header
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsOpenMobile(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
          isAccountant={isAccountant}
        />

        {/* Dynamic Tab Content Area */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {activeTab === "dashboard" && (
            <DashboardView
              setActiveTab={setActiveTab}
              isAccountant={isAccountant}
            />
          )}

          {activeTab === "transactions" && (
            <TransactionsView
              isAccountant={isAccountant}
              initialSearchQuery={searchQuery}
            />
          )}

          {activeTab === "invoicing" && (
            <InvoicingView isAccountant={isAccountant} />
          )}

          {activeTab === "categories" && (
            <CategoriesView
              key="categories"
              isAccountant={isAccountant}
              defaultSubTab="categories"
            />
          )}

          {activeTab === "rules" && (
            <CategoriesView
              key="rules"
              isAccountant={isAccountant}
              defaultSubTab="rules"
            />
          )}

          {activeTab === "upload" && (
            <StatementUploadView isAccountant={isAccountant} />
          )}

          {activeTab === "reports" && <ReportsView />}

          {activeTab === "settings" && (
            <SettingsView isAccountant={isAccountant} />
          )}
        </main>
      </div>
    </div>
  );
}
