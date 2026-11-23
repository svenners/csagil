"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Download,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  Tag,
  ExternalLink,
  StickyNote,
  X,
  ShieldAlert,
  ArrowUpDown
} from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

interface TransactionsViewProps {
  isAccountant?: boolean;
  initialSearchQuery?: string;
}

export function TransactionsView({
  isAccountant = false,
  initialSearchQuery = "",
}: TransactionsViewProps) {
  const { t, formatMoney } = useLanguage();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [jumpPage, setJumpPage] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);

  // Form state for new transaction
  const [newTxDate, setNewTxDate] = useState("2026-01-01");

  useEffect(() => {
    setNewTxDate(new Date().toISOString().split("T")[0]);
  }, []);
  const [newMerchant, setNewMerchant] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newType, setNewType] = useState<"debit" | "credit">("debit");
  const [newCategoryId, setNewCategoryId] = useState("");

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "25",
        year: selectedYear,
        month: selectedMonth,
        type: typeFilter,
        status: statusFilter,
        categoryId: categoryFilter,
        q: searchQuery,
      });

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setTransactions(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
        setTotalCount(json.pagination?.totalCount || 0);
      }
    } catch (err) {
      console.error("Transactions fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const json = await res.json();
        setCategoriesList(json.categories || []);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, selectedYear, selectedMonth, typeFilter, statusFilter, categoryFilter, searchQuery]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMerchant || !newAmount) return;

    const amountFloat = parseFloat(newAmount.replace(",", "."));
    const amountCents = Math.round(amountFloat * 100);

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        txDate: newTxDate,
        merchant: newMerchant,
        description: newDesc || newMerchant,
        amountCents,
        type: newType,
        categoryId: newCategoryId || null,
      }),
    });

    if (res.ok) {
      setShowAddModal(false);
      setNewMerchant("");
      setNewDesc("");
      setNewAmount("");
      fetchTransactions();
    } else {
      const err = await res.json();
      alert(`Error: ${err.error}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction record?")) return;
    const res = await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchTransactions();
    }
  };

  // Pagination Window Calculator (At most 10 page buttons at once per User Guide)
  const renderPaginationButtons = () => {
    const windowSize = 10;
    const currentWindowStart = Math.floor((page - 1) / windowSize) * windowSize + 1;
    const currentWindowEnd = Math.min(totalPages, currentWindowStart + windowSize - 1);

    const buttons = [];
    for (let p = currentWindowStart; p <= currentWindowEnd; p++) {
      buttons.push(
        <button
          key={p}
          onClick={() => setPage(p)}
          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
            page === p
              ? "bg-[#4a7c59] text-white shadow-2xs"
              : "bg-white border border-[#bfcbbd] text-[#1a1d17] hover:bg-[#f6f8df]"
          }`}
        >
          {p}
        </button>
      );
    }
    return buttons;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1a1d17]">{t.ledger.title}</h2>
          <p className="text-xs text-[#78897d]">
            {totalCount} total verified transactions in database ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isAccountant && (
            <button
              onClick={() => setShowAddModal(true)}
              className="py-2 px-3 bg-[#4a7c59] text-white rounded-xl text-xs font-bold hover:bg-[#2f5c40] transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>{t.ledger.addTransaction}</span>
            </button>
          )}

          <a
            href="/api/closing-pack"
            download
            className="py-2 px-3 bg-white border border-[#bfcbbd] text-[#1a1d17] rounded-xl text-xs font-bold hover:bg-[#f6f8df] transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-4 h-4 text-[#4a7c59]" />
            <span>{t.ledger.exportLedger}</span>
          </a>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-[#bfcbbd]/60 shadow-2xs space-y-3">
        {/* Quick Period Buttons */}
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <button
            onClick={() => {
              setSelectedYear("All");
              setSelectedMonth("All");
              setCategoryFilter("All");
              setTypeFilter("All");
              setStatusFilter("All");
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl border transition-colors ${
              selectedYear === "All" && selectedMonth === "All" && categoryFilter === "All"
                ? "bg-[#2f5c40] text-white border-[#2f5c40]"
                : "bg-[#f6f8df] border-[#bfcbbd] text-[#495a4f] hover:text-[#1a1d17]"
            }`}
          >
            {t.ledger.allTime}
          </button>
          <button
            onClick={() => {
              const now = new Date();
              setSelectedYear(String(now.getFullYear()));
              setSelectedMonth(String(now.getMonth() + 1).padStart(2, "0"));
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-xl border bg-[#f6f8df] border-[#bfcbbd] text-[#495a4f] hover:text-[#1a1d17]"
          >
            {t.ledger.thisMonth}
          </button>
          <button
            onClick={() => {
              const now = new Date();
              setSelectedYear(String(now.getFullYear()));
              setSelectedMonth("All");
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-xl border bg-[#f6f8df] border-[#bfcbbd] text-[#495a4f] hover:text-[#1a1d17]"
          >
            {t.ledger.thisYear}
          </button>
        </div>

        {/* Detailed Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-[#78897d] uppercase mb-1">
              {t.common.category}
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-xl border border-[#9cb19e] bg-white text-[#11140e] font-semibold truncate shadow-2xs focus:border-[#2f5c40] focus:outline-none"
            >
              <option value="All" className="text-[#11140e] bg-white">{t.common.all} {t.common.category}</option>
              <option value="uncategorized" className="text-[#11140e] bg-white">Sem Categoria (Unassigned)</option>
              {categoriesList.map((c) => (
                <option key={c.id} value={c.id} className="text-[#11140e] bg-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#78897d] uppercase mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-xl border border-[#9cb19e] bg-white text-[#11140e] font-semibold shadow-2xs focus:border-[#2f5c40] focus:outline-none"
            >
              <option value="All" className="text-[#11140e] bg-white">All Types</option>
              <option value="credit" className="text-[#11140e] bg-white">{t.ledger.creditsOnly}</option>
              <option value="debit" className="text-[#11140e] bg-white">{t.ledger.debitsOnly}</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#78897d] uppercase mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-xl border border-[#9cb19e] bg-white text-[#11140e] font-semibold shadow-2xs focus:border-[#2f5c40] focus:outline-none"
            >
              <option value="All" className="text-[#11140e] bg-white">All Statuses</option>
              <option value="Cleared" className="text-[#11140e] bg-white">{t.ledger.cleared}</option>
              <option value="Pending" className="text-[#11140e] bg-white">{t.ledger.pending}</option>
              <option value="Flagged" className="text-[#11140e] bg-white">{t.ledger.flagged}</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#78897d] uppercase mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-xl border border-[#9cb19e] bg-white text-[#11140e] font-semibold shadow-2xs focus:border-[#2f5c40] focus:outline-none"
            >
              <option value="All" className="text-[#11140e] bg-white">All Years</option>
              <option value="2026" className="text-[#11140e] bg-white">2026</option>
              <option value="2025" className="text-[#11140e] bg-white">2025</option>
              <option value="2024" className="text-[#11140e] bg-white">2024</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#78897d] uppercase mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-xl border border-[#9cb19e] bg-white text-[#11140e] font-semibold shadow-2xs focus:border-[#2f5c40] focus:outline-none"
            >
              <option value="All" className="text-[#11140e] bg-white">All Months</option>
              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => (
                <option key={m} value={m} className="text-[#11140e] bg-white">
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-[#bfcbbd]/60 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f0f2da] border-b border-[#bfcbbd]/60 text-[#495a4f] font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Merchant / Favorecido</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                {!isAccountant && <th className="py-3 px-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#bfcbbd]/30 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#78897d]">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#78897d]">
                    {t.ledger.noTransactions}
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#f8fae5]/50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-[#495a4f]">{tx.txDate}</td>
                    <td className="py-3 px-4 font-bold text-[#1a1d17]">{tx.merchant}</td>
                    <td className="py-3 px-4 text-[#495a4f] max-w-xs truncate" title={tx.description}>
                      {tx.description}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                        style={{
                          backgroundColor: tx.categoryBgColor || "#f3f4f6",
                          color: tx.categoryTextColor || "#374151",
                        }}
                      >
                        {tx.categoryName || "Unassigned"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#78897d] whitespace-nowrap">{tx.accountName}</td>
                    <td
                      className={`py-3 px-4 text-right font-black whitespace-nowrap ${
                        tx.amountCents >= 0 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {formatMoney(tx.amountCents)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.status === "Cleared"
                            ? "bg-emerald-100 text-emerald-800"
                            : tx.status === "Pending"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    {!isAccountant && (
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Enhanced 10-Page Pagination Bar per User Guide */}
        <div className="p-4 bg-[#f8fae5] border-t border-[#bfcbbd]/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="font-semibold text-[#495a4f]">
            {t.ledger.page} <span className="text-[#1a1d17] font-bold">{page}</span> {t.ledger.of}{" "}
            <span className="text-[#1a1d17] font-bold">{totalPages}</span> ({totalCount} items)
          </div>

          <div className="flex items-center gap-1">
            {/* Start (<<) */}
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-[#bfcbbd] bg-white text-[#1a1d17] disabled:opacity-30 hover:bg-[#f6f8df]"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* -10 Jump */}
            <button
              onClick={() => setPage(Math.max(1, page - 10))}
              disabled={page <= 1}
              className="px-2 py-1 rounded-lg border border-[#bfcbbd] bg-white text-xs font-bold text-[#1a1d17] disabled:opacity-30 hover:bg-[#f6f8df]"
              title="-10 Pages"
            >
              -10
            </button>

            {/* < Previous */}
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-[#bfcbbd] bg-white text-[#1a1d17] disabled:opacity-30 hover:bg-[#f6f8df]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* 10-Page Buttons Window */}
            <div className="hidden sm:flex items-center gap-1">{renderPaginationButtons()}</div>

            {/* > Next */}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-[#bfcbbd] bg-white text-[#1a1d17] disabled:opacity-30 hover:bg-[#f6f8df]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* +10 Jump */}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 10))}
              disabled={page >= totalPages}
              className="px-2 py-1 rounded-lg border border-[#bfcbbd] bg-white text-xs font-bold text-[#1a1d17] disabled:opacity-30 hover:bg-[#f6f8df]"
              title="+10 Pages"
            >
              +10
            </button>

            {/* Finish (>>) */}
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-[#bfcbbd] bg-white text-[#1a1d17] disabled:opacity-30 hover:bg-[#f6f8df]"
              title="Final Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>

            {/* Direct Jump Input ("Go to") */}
            <div className="flex items-center gap-1 ml-2">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={jumpPage}
                onChange={(e) => setJumpPage(e.target.value)}
                placeholder="#"
                className="w-12 px-2 py-1 bg-white border border-[#bfcbbd] rounded-lg text-center text-xs"
              />
              <button
                onClick={() => {
                  const p = parseInt(jumpPage, 10);
                  if (p >= 1 && p <= totalPages) {
                    setPage(p);
                    setJumpPage("");
                  }
                }}
                className="px-2.5 py-1 bg-[#4a7c59] text-white rounded-lg text-xs font-bold hover:bg-[#2f5c40]"
              >
                {t.ledger.goTo}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#bfcbbd] shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#bfcbbd]/40">
              <h3 className="font-bold text-base text-[#1a1d17]">{t.ledger.addTransaction}</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-[#78897d] hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#495a4f] mb-1">Date</label>
                <input
                  type="date"
                  value={newTxDate}
                  onChange={(e) => setNewTxDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#bfcbbd]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#495a4f] mb-1">Merchant / Favorecido</label>
                <input
                  type="text"
                  placeholder="e.g. AWS, Claro, Stripe"
                  value={newMerchant}
                  onChange={(e) => setNewMerchant(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#bfcbbd]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#495a4f] mb-1">Description / Histórico</label>
                <input
                  type="text"
                  placeholder="Optional detail"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#bfcbbd]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-[#495a4f] mb-1">Amount (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#bfcbbd]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#495a4f] mb-1">Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[#9cb19e] bg-white text-[#11140e] font-semibold"
                  >
                    <option value="debit" className="text-[#11140e] bg-white">Expense / Débito</option>
                    <option value="credit" className="text-[#11140e] bg-white">Revenue / Crédito</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#495a4f] mb-1">Category</label>
                <select
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#9cb19e] bg-white text-[#11140e] font-semibold"
                >
                  <option value="" className="text-[#11140e] bg-white">Unassigned</option>
                  {categoriesList.map((c) => (
                    <option key={c.id} value={c.id} className="text-[#11140e] bg-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#bfcbbd]/40">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-[#bfcbbd] rounded-xl font-bold text-[#495a4f]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4a7c59] text-white rounded-xl font-bold hover:bg-[#2f5c40]"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
