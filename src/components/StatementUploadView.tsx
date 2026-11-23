"use client";

import React, { useState } from "react";
import { UploadCloud, CheckCircle2, AlertTriangle, FileText, Check, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

interface StatementUploadProps {
  isAccountant?: boolean;
}

export function StatementUploadView({ isAccountant = false }: StatementUploadProps) {
  const { t, formatMoney } = useLanguage();

  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedData, setParsedData] = useState<any | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setParsing(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("action", "parse");

      const res = await fetch("/api/statements", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        setParsedData(json);
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setParsing(false);
    }
  };

  const handleToggleSelect = (index: number) => {
    if (!parsedData) return;
    const updated = [...parsedData.items];
    updated[index].selected = !updated[index].selected;
    setParsedData({ ...parsedData, items: updated });
  };

  const handleConfirmImport = async () => {
    if (!parsedData) return;
    const selectedItems = parsedData.items.filter((i: any) => i.selected);
    if (selectedItems.length === 0) {
      alert("No entries selected for import.");
      return;
    }

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append("action", "confirm_import");
      formData.append("items", JSON.stringify(selectedItems));
      formData.append("fileName", parsedData.fileName);
      formData.append("fileSizeBytes", String(parsedData.fileSizeBytes || 0));
      formData.append("fileType", parsedData.fileType || "CSV");
      formData.append("accountName", parsedData.bankName || "Conta Corrente");

      const res = await fetch("/api/statements", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        alert(`Success: ${selectedItems.length} transactions imported into ledger!`);
        setParsedData(null);
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (e) {
      console.error("Import error:", e);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold text-[#1a1d17]">{t.upload.title}</h2>
        <p className="text-xs text-[#78897d]">{t.upload.formats}</p>
      </div>

      {/* Upload Zone */}
      {!parsedData && (
        <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-[#bfcbbd] hover:border-[#4a7c59] transition-colors text-center space-y-4 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-[#f0f2da] text-[#2f5c40] mx-auto flex items-center justify-center">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#1a1d17]">{t.upload.dragDrop}</h3>
            <p className="text-xs text-[#78897d] mt-1">Supports XLSX, CSV, OFX, and digital Caixa Econômica / Bank Statements</p>
          </div>
          <div>
            <label className="inline-flex items-center px-4 py-2 bg-[#4a7c59] text-white rounded-xl text-xs font-bold hover:bg-[#2f5c40] transition-colors cursor-pointer shadow-2xs">
              <span>{parsing ? "Parsing File..." : "Select File"}</span>
              <input type="file" onChange={handleFileUpload} accept=".csv,.xlsx,.xls,.txt,.pdf,.ofx" className="hidden" disabled={parsing || isAccountant} />
            </label>
          </div>
        </div>
      )}

      {/* Duplicate Audit Preview Section */}
      {parsedData && (
        <div className="bg-white rounded-2xl border border-[#bfcbbd]/60 shadow-2xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[#bfcbbd]/40">
            <div>
              <h3 className="font-bold text-base text-[#1a1d17]">{t.upload.duplicateAudit}</h3>
              <p className="text-xs text-[#78897d]">
                File: <span className="font-bold text-[#1a1d17]">{parsedData.fileName}</span> ({parsedData.totalParsed} parsed, {parsedData.duplicateCount} flagged as duplicates)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setParsedData(null)}
                className="px-3 py-1.5 border border-[#bfcbbd] rounded-xl text-xs font-bold text-[#495a4f]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={importing || isAccountant}
                className="px-4 py-1.5 bg-[#4a7c59] text-white rounded-xl text-xs font-bold hover:bg-[#2f5c40] shadow-2xs"
              >
                {importing ? "Importing..." : t.upload.confirmImport}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f0f2da] text-[#495a4f] font-bold text-[10px] uppercase">
                  <th className="py-2.5 px-3">Import</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Merchant</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Duplicate Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#bfcbbd]/30 font-medium">
                {parsedData.items.map((it: any, idx: number) => (
                  <tr key={it.id} className={it.isDuplicate ? "bg-amber-50/50" : ""}>
                    <td className="py-2.5 px-3">
                      <input
                        type="checkbox"
                        checked={it.selected}
                        onChange={() => handleToggleSelect(idx)}
                        className="w-4 h-4 rounded text-[#4a7c59]"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-[#495a4f]">{it.date}</td>
                    <td className="py-2.5 px-3 font-bold text-[#1a1d17]">{it.merchant}</td>
                    <td className="py-2.5 px-3 text-[#495a4f]">{it.description}</td>
                    <td className={`py-2.5 px-3 text-right font-black ${it.amountCents >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {formatMoney(it.amountCents)}
                    </td>
                    <td className="py-2.5 px-3">
                      {it.isDuplicate ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Potential Duplicate</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>New Entry</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
