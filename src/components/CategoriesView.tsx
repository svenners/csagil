"use client";

import React, { useState, useEffect } from "react";
import { Tag, Zap, Plus, Trash2, CheckCircle2, Play, AlertCircle, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  bgColor?: string;
  textColor?: string;
  monthlyBudgetCents?: number;
  description?: string;
}

interface CategoryRule {
  id: string;
  keyword: string;
  matchType: string;
  matchField: string;
  targetCategoryId: string;
  priority?: number;
}

interface CategoriesViewProps {
  isAccountant?: boolean;
  defaultSubTab?: "categories" | "rules";
}

const PRESET_COLORS = [
  { color: "#4a7c59", bgColor: "#e8ead1", textColor: "#2f5c40", label: "Sage Forest" },
  { color: "#2563eb", bgColor: "#dbeafe", textColor: "#1e40af", label: "Blue" },
  { color: "#7c3aed", bgColor: "#ede9fe", textColor: "#5b21b6", label: "Purple" },
  { color: "#ea580c", bgColor: "#ffedd5", textColor: "#9a3412", label: "Orange" },
  { color: "#059669", bgColor: "#d1fae5", textColor: "#065f46", label: "Emerald" },
  { color: "#dc2626", bgColor: "#fee2e2", textColor: "#991b1b", label: "Ruby" },
  { color: "#d97706", bgColor: "#fef3c7", textColor: "#92400e", label: "Amber" },
  { color: "#475569", bgColor: "#f1f5f9", textColor: "#334155", label: "Slate" },
];

export function CategoriesView({ isAccountant = false, defaultSubTab = "categories" }: CategoriesViewProps) {
  const { t, formatMoney } = useLanguage();
  const [subTab, setSubTab] = useState<"categories" | "rules">(defaultSubTab);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [rulesList, setRulesList] = useState<CategoryRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);

  // New Category form
  const [catName, setCatName] = useState("");
  const [catBudget, setCatBudget] = useState("");
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);

  // New Rule form
  const [ruleKeyword, setRuleKeyword] = useState("");
  const [ruleField, setRuleField] = useState("all");
  const [ruleType, setRuleType] = useState("contains");
  const [ruleTargetCat, setRuleTargetCat] = useState("");
  const [ruleApplyExisting, setRuleApplyExisting] = useState(true);

  // Busy state
  const [submitting, setSubmitting] = useState(false);

  const fetchCategoriesAndRules = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (data.success) {
        setCategoriesList(data.categories || []);
        setRulesList(data.rules || []);
        if (data.categories?.length > 0 && !ruleTargetCat) {
          setRuleTargetCat(data.categories[0].id);
        }
      } else {
        setErrorMsg(data.error || "Failed to load categories and rules");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoriesAndRules();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    try {
      setSubmitting(true);
      setErrorMsg("");
      const preset = PRESET_COLORS[selectedColorIndex];
      const budgetCents = catBudget ? Math.round(parseFloat(catBudget.replace(",", ".")) * 100) : 0;

      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_category",
          name: catName.trim(),
          color: preset.color,
          bgColor: preset.bgColor,
          textColor: preset.textColor,
          monthlyBudgetCents: budgetCents,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create category");
      }

      setCatName("");
      setCatBudget("");
      setShowCategoryModal(false);
      setSuccessMsg(t.common.success);
      setTimeout(() => setSuccessMsg(""), 3500);
      fetchCategoriesAndRules();
    } catch (err: any) {
      setErrorMsg(err.message || "Error creating category");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (isAccountant) return;
    if (!window.confirm(t.categories.deleteConfirm)) return;

    try {
      const res = await fetch(`/api/categories?categoryId=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete category");
      }
      setSuccessMsg(t.common.success);
      setTimeout(() => setSuccessMsg(""), 3000);
      fetchCategoriesAndRules();
    } catch (err: any) {
      setErrorMsg(err.message || "Error deleting category");
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleKeyword.trim() || !ruleTargetCat) return;

    try {
      setSubmitting(true);
      setErrorMsg("");

      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_rule",
          keyword: ruleKeyword.trim(),
          matchField: ruleField,
          matchType: ruleType,
          targetCategoryId: ruleTargetCat,
          applyToExisting: ruleApplyExisting,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create rule");
      }

      setRuleKeyword("");
      setShowRuleModal(false);
      setSuccessMsg(
        data.updatedCount !== undefined
          ? `${t.common.success} (${data.updatedCount} transactions categorized)`
          : t.common.success
      );
      setTimeout(() => setSuccessMsg(""), 4000);
      fetchCategoriesAndRules();
    } catch (err: any) {
      setErrorMsg(err.message || "Error creating rule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (isAccountant) return;
    if (!window.confirm("Delete this automated categorization rule?")) return;

    try {
      const res = await fetch(`/api/categories?ruleId=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete rule");
      }
      setSuccessMsg(t.common.success);
      setTimeout(() => setSuccessMsg(""), 3000);
      fetchCategoriesAndRules();
    } catch (err: any) {
      setErrorMsg(err.message || "Error deleting rule");
    }
  };

  const handleApplyAllRules = async () => {
    if (isAccountant) return;
    try {
      setSubmitting(true);
      setErrorMsg("");
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply_rules_to_ledger" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to run rules");
      }
      setSuccessMsg(`All rules applied! ${data.updatedCount || 0} transactions updated.`);
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error running rules");
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryById = (id: string) => categoriesList.find((c) => c.id === id);

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-[#1e2d24]">
              {subTab === "categories" ? t.categories.title : t.rules.title}
            </h1>
          </div>
          <p className="text-sm text-[#4a5e51] mt-1">
            {subTab === "categories" ? t.categories.subtitle : t.rules.subtitle}
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center gap-2 bg-[#f0f4eb] p-1.5 rounded-xl border border-[#d6dfd0] self-start sm:self-auto">
          <button
            onClick={() => setSubTab("categories")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === "categories"
                ? "bg-white text-[#2f5c40] shadow-xs"
                : "text-[#4a5e51] hover:text-[#1e2d24]"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            {t.nav.categories}
          </button>
          <button
            onClick={() => setSubTab("rules")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === "rules"
                ? "bg-white text-[#2f5c40] shadow-xs"
                : "text-[#4a5e51] hover:text-[#1e2d24]"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            {t.nav.rules}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-sm font-semibold">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TAB 1: CATEGORIES LIST */}
      {subTab === "categories" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#4a5e51] uppercase tracking-wider">
              {categoriesList.length} Categories Defined
            </span>
            {!isAccountant && (
              <button
                onClick={() => setShowCategoryModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#2f5c40] hover:bg-[#234530] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t.categories.newCategory}
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-[#4a5e51]">{t.common.loading}</div>
          ) : categoriesList.length === 0 ? (
            <div className="p-12 text-center bg-[#f8fae5]/40 border border-dashed border-[#ccd9c4] rounded-2xl text-sm text-[#4a5e51]">
              {t.categories.noCategories}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {categoriesList.map((cat) => {
                const linkedRulesCount = rulesList.filter((r) => r.targetCategoryId === cat.id).length;
                return (
                  <div
                    key={cat.id}
                    className="p-5 bg-white border border-[#e2e8dc] rounded-2xl shadow-xs flex flex-col justify-between transition-all hover:border-[#ccd9c4]"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-extrabold tracking-wide inline-flex items-center gap-1.5"
                          style={{
                            backgroundColor: cat.bgColor || "#e8ead1",
                            color: cat.textColor || "#2f5c40",
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: cat.color || "#4a7c59" }}
                          />
                          {cat.name}
                        </span>
                        {!isAccountant && (
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="p-1 text-zinc-400 hover:text-rose-600 transition-colors"
                            title={t.common.delete}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {cat.monthlyBudgetCents && cat.monthlyBudgetCents > 0 ? (
                        <div className="mt-3 text-xs text-[#4a5e51]">
                          <span className="font-medium">{t.categories.monthlyBudget}: </span>
                          <span className="font-bold text-[#1e2d24]">
                            {formatMoney(cat.monthlyBudgetCents)}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#f0f4eb] flex items-center justify-between text-[11px] text-[#718576]">
                      <span>{linkedRulesCount} active rules</span>
                      <span className="font-mono text-[10px] text-zinc-400">ID: {cat.id}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RULES LIST */}
      {subTab === "rules" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-[#4a5e51] uppercase tracking-wider">
              {rulesList.length} Automated Rules
            </span>

            <div className="flex items-center gap-2">
              {!isAccountant && (
                <>
                  <button
                    onClick={handleApplyAllRules}
                    disabled={submitting || rulesList.length === 0}
                    className="flex items-center gap-2 px-3 py-2 bg-[#f0f4eb] hover:bg-[#e2ead8] text-[#2f5c40] text-xs font-bold rounded-xl border border-[#d6dfd0] transition-colors disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {t.rules.applyAll}
                  </button>
                  <button
                    onClick={() => setShowRuleModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#2f5c40] hover:bg-[#234530] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    {t.rules.newRule}
                  </button>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-[#4a5e51]">{t.common.loading}</div>
          ) : rulesList.length === 0 ? (
            <div className="p-12 text-center bg-[#f8fae5]/40 border border-dashed border-[#ccd9c4] rounded-2xl text-sm text-[#4a5e51]">
              {t.rules.noRules}
            </div>
          ) : (
            <div className="bg-white border border-[#e2e8dc] rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8fae5]/70 text-[#4a5e51] font-bold border-b border-[#e2e8dc]">
                    <tr>
                      <th className="p-3.5">{t.rules.keyword}</th>
                      <th className="p-3.5">{t.rules.matchField}</th>
                      <th className="p-3.5">{t.rules.matchType}</th>
                      <th className="p-3.5">{t.rules.targetCategory}</th>
                      <th className="p-3.5 text-right">{t.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f4eb]">
                    {rulesList.map((rule) => {
                      const targetCat = getCategoryById(rule.targetCategoryId);
                      return (
                        <tr key={rule.id} className="hover:bg-[#fbfcf7] transition-colors">
                          <td className="p-3.5 font-mono font-bold text-[#1e2d24]">
                            "{rule.keyword}"
                          </td>
                          <td className="p-3.5 capitalize text-[#4a5e51]">
                            {t.rules.fields[rule.matchField as keyof typeof t.rules.fields] || rule.matchField}
                          </td>
                          <td className="p-3.5 text-[#4a5e51]">
                            <span className="px-2 py-0.5 bg-zinc-100 rounded-md text-[11px] font-medium text-zinc-700">
                              {t.rules.types[rule.matchType as keyof typeof t.rules.types] || rule.matchType}
                            </span>
                          </td>
                          <td className="p-3.5">
                            {targetCat ? (
                              <span
                                className="px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5"
                                style={{
                                  backgroundColor: targetCat.bgColor || "#e8ead1",
                                  color: targetCat.textColor || "#2f5c40",
                                }}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: targetCat.color || "#4a7c59" }}
                                />
                                {targetCat.name}
                              </span>
                            ) : (
                              <span className="text-zinc-400 italic">Orphan ({rule.targetCategoryId})</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            {!isAccountant && (
                              <button
                                onClick={() => handleDeleteRule(rule.id)}
                                className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors"
                                title={t.common.delete}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE CATEGORY */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-[#e2e8dc]">
            <h2 className="text-lg font-black text-[#1e2d24]">{t.categories.newCategory}</h2>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#4a5e51] mb-1">
                  {t.categories.name} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fornecedores TI / Consultoria"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-[#d6dfd0] rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#2f5c40]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4a5e51] mb-1">
                  {t.categories.monthlyBudget} (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={catBudget}
                  onChange={(e) => setCatBudget(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-[#d6dfd0] rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#2f5c40]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4a5e51] mb-2">
                  {t.categories.color}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_COLORS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedColorIndex(idx)}
                      className={`p-2 rounded-xl flex items-center justify-center border-2 transition-all ${
                        selectedColorIndex === idx
                          ? "border-[#2f5c40] scale-105 shadow-xs"
                          : "border-transparent opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: preset.bgColor }}
                    >
                      <span
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preset.color }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#4a5e51] hover:text-[#1e2d24]"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#2f5c40] hover:bg-[#234530] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {submitting ? t.common.loading : t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE RULE */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-[#e2e8dc]">
            <h2 className="text-lg font-black text-[#1e2d24]">{t.rules.newRule}</h2>
            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#4a5e51] mb-1">
                  {t.rules.keyword} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS, POSTO, UBER, GOOGLE"
                  value={ruleKeyword}
                  onChange={(e) => setRuleKeyword(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-[#d6dfd0] rounded-xl text-xs font-mono font-medium focus:outline-hidden focus:border-[#2f5c40]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#4a5e51] mb-1">
                    {t.rules.matchField}
                  </label>
                  <select
                    value={ruleField}
                    onChange={(e) => setRuleField(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-[#d6dfd0] rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#2f5c40]"
                  >
                    <option value="all">{t.rules.fields.all}</option>
                    <option value="merchant">{t.rules.fields.merchant}</option>
                    <option value="description">{t.rules.fields.description}</option>
                    <option value="filename">{t.rules.fields.filename}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4a5e51] mb-1">
                    {t.rules.matchType}
                  </label>
                  <select
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-[#d6dfd0] rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#2f5c40]"
                  >
                    <option value="contains">{t.rules.types.contains}</option>
                    <option value="exact">{t.rules.types.exact}</option>
                    <option value="starts_with">{t.rules.types.starts_with}</option>
                    <option value="regex">{t.rules.types.regex}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4a5e51] mb-1">
                  {t.rules.targetCategory} *
                </label>
                <select
                  required
                  value={ruleTargetCat}
                  onChange={(e) => setRuleTargetCat(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-[#d6dfd0] rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#2f5c40]"
                >
                  {categoriesList.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="applyExisting"
                  checked={ruleApplyExisting}
                  onChange={(e) => setRuleApplyExisting(e.target.checked)}
                  className="rounded border-[#d6dfd0] text-[#2f5c40] focus:ring-[#2f5c40]"
                />
                <label htmlFor="applyExisting" className="text-xs text-[#4a5e51] cursor-pointer">
                  {t.rules.applyToExisting}
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#4a5e51] hover:text-[#1e2d24]"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#2f5c40] hover:bg-[#234530] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {submitting ? t.common.loading : t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
