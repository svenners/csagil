"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Printer,
  Copy,
  Check,
  Building2,
  Calendar,
  DollarSign,
  QrCode,
  X,
  ShieldCheck,
  CheckCircle2,
  Download
} from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { formatDocument, formatAccessKey } from "@/lib/brazilianFiscal";

interface InvoicingViewProps {
  isAccountant?: boolean;
}

export function InvoicingView({ isAccountant = false }: InvoicingViewProps) {
  const { t, formatMoney } = useLanguage();

  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Preview Modal
  const [previewInvoice, setPreviewInvoice] = useState<any | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  // New Invoice Modal
  const [showEmitModal, setShowEmitModal] = useState(false);
  const [emitType, setEmitType] = useState("NFS-e");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [serviceDesc, setServiceDesc] = useState("Prestação de Serviços em Tecnologia e Desenvolvimento");
  const [serviceAmount, setServiceAmount] = useState("1000.00");
  const [issPercent, setIssPercent] = useState("2.0");
  const [issWithheld, setIssWithheld] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/invoicing");
      if (res.ok) {
        const json = await res.json();
        setInvoices(json.invoices || []);
        setCustomers(json.customers || []);
        setCompanySettings(json.companySettings || null);
        if (json.customers?.length > 0) {
          setSelectedCustomerId(json.customers[0].id);
        }
      }
    } catch (e) {
      console.error("Invoicing fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !serviceAmount) return;

    const amtFloat = parseFloat(serviceAmount.replace(",", "."));
    const unitPriceCents = Math.round(amtFloat * 100);
    const issBps = Math.round(parseFloat(issPercent) * 100);

    const payload = {
      action: "save_invoice",
      type: emitType,
      customerId: selectedCustomerId,
      issueDate: new Date().toISOString().split("T")[0],
      competenceDate: new Date().toISOString().split("T")[0],
      items: [
        {
          type: "service",
          description: serviceDesc,
          unitPriceCents,
          quantity: 1,
          issBps,
          issWithheld,
          pisBps: 65,
          cofinsBps: 300,
          csllBps: 100,
          irrfBps: 150,
        },
      ],
    };

    const res = await fetch("/api/invoicing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowEmitModal(false);
      fetchData();
    } else {
      const err = await res.json();
      alert(`Error: ${err.error}`);
    }
  };

  const handleSyncToLedger = async (invId: string) => {
    const res = await fetch("/api/invoicing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync_to_ledger", invoiceId: invId }),
    });

    if (res.ok) {
      fetchData();
      alert("Nota Fiscal lançada com sucesso no Livro Caixa como Receita!");
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1a1d17]">{t.invoicing.title}</h2>
          <p className="text-xs text-[#78897d]">
            Emit, preview, print, and audit Brazilian fiscal documents (NFS-e, NF-e, Faturas, Recibos) with BACEN PIX.
          </p>
        </div>

        {!isAccountant && (
          <button
            onClick={() => setShowEmitModal(true)}
            className="py-2 px-3 bg-[#4a7c59] text-white rounded-xl text-xs font-bold hover:bg-[#2f5c40] transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>{t.invoicing.emitInvoice}</span>
          </button>
        )}
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-2xl border border-[#bfcbbd]/60 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f0f2da] border-b border-[#bfcbbd]/60 text-[#495a4f] font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Number</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Client / Tomador</th>
                <th className="py-3 px-4 text-right">Gross Total</th>
                <th className="py-3 px-4 text-right">Withholdings</th>
                <th className="py-3 px-4 text-right">Net Payable</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#bfcbbd]/30 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#78897d]">
                    Loading fiscal documents...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#78897d]">
                    No invoices issued yet. Click "Emit Fiscal Document" to create your first NFS-e or Fatura.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#f8fae5]/50 transition-colors">
                    <td className="py-3 px-4 font-black text-[#1a1d17]">Nº {inv.number}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-[#4a7c59]/15 text-[#2f5c40] font-bold text-[10px]">
                        {inv.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-[#495a4f]">{inv.issueDate}</td>
                    <td className="py-3 px-4 font-bold text-[#1a1d17]">{inv.customerSnapshot?.name}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatMoney(inv.totalGrossCents)}</td>
                    <td className="py-3 px-4 text-right font-medium text-rose-700">
                      -{formatMoney(inv.totalWithheldCents)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-800">
                      {formatMoney(inv.totalNetCents)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setPreviewInvoice(inv)}
                          className="px-2.5 py-1 bg-white border border-[#bfcbbd] rounded-lg text-xs font-bold text-[#1a1d17] hover:bg-[#f6f8df] flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#4a7c59]" />
                          <span>PDF</span>
                        </button>

                        {!isAccountant && (
                          <button
                            onClick={() => handleSyncToLedger(inv.id)}
                            disabled={!!inv.linkedTransactionId}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                              inv.linkedTransactionId
                                ? "bg-gray-100 text-gray-500 border border-gray-300"
                                : "bg-[#4a7c59] text-white hover:bg-[#2f5c40]"
                            }`}
                            title={inv.linkedTransactionId ? "Already in ledger" : "Sync to Transactions Ledger"}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{inv.linkedTransactionId ? "Synced" : "Sync"}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Fiscal Preview Modal */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden my-auto border border-gray-300">
            {/* Control Bar (hidden when printing) */}
            <div className="px-6 py-3 bg-[#eef1d8] border-b border-[#bfcbbd] flex items-center justify-between print:hidden">
              <span className="text-xs font-bold text-[#2f5c40]">
                {previewInvoice.type} Nº {previewInvoice.number}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-[#4a7c59] text-white rounded-xl text-xs font-bold hover:bg-[#2f5c40] flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / Salvar PDF</span>
                </button>
                <button onClick={() => setPreviewInvoice(null)} className="p-1.5 text-gray-500 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Brazilian Fiscal Document Printable Sheet */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 print:p-0 print:bg-white text-black text-[11px] leading-tight space-y-3 font-sans">
              <div className="border-2 border-black p-4 space-y-3 bg-white">
                <div className="border border-black p-2 flex items-center justify-between bg-gray-50">
                  <div className="text-left w-1/4">
                    <span className="font-bold text-[10px] uppercase block">PREFEITURA DE {previewInvoice.issuerSnapshot?.city?.toUpperCase()}</span>
                    <span className="text-[9px] text-gray-600 block">TRIBUTAÇÃO MUNICIPAL / ISSQN</span>
                  </div>
                  <div className="w-2/4 text-center">
                    <h1 className="font-black text-sm tracking-tight">{previewInvoice.type} - DOCUMENTO FISCAL</h1>
                    <span className="text-[10px] font-semibold text-gray-700 block">SIMPLES NACIONAL</span>
                  </div>
                  <div className="text-right w-1/4">
                    <span className="font-bold text-xs block">NÚMERO: {previewInvoice.number}</span>
                    <span className="text-[9px] block">Emissão: {previewInvoice.issueDate}</span>
                  </div>
                </div>

                {/* Issuer */}
                <div className="border border-black p-2.5 space-y-0.5">
                  <span className="text-[9px] font-black uppercase text-gray-600 block">PRESTADOR / EMITENTE</span>
                  <div className="font-black text-xs">{previewInvoice.issuerSnapshot?.legalName}</div>
                  <div>CNPJ: {previewInvoice.issuerSnapshot?.cnpj} | IM: {previewInvoice.issuerSnapshot?.municipalRegistration}</div>
                  <div>{previewInvoice.issuerSnapshot?.street}, {previewInvoice.issuerSnapshot?.number} - {previewInvoice.issuerSnapshot?.city}/{previewInvoice.issuerSnapshot?.state}</div>
                </div>

                {/* Customer */}
                <div className="border border-black p-2.5 space-y-0.5">
                  <span className="text-[9px] font-black uppercase text-gray-600 block">TOMADOR / CLIENTE</span>
                  <div className="font-black text-xs">{previewInvoice.customerSnapshot?.name}</div>
                  <div>Documento: {previewInvoice.customerSnapshot?.document}</div>
                  <div>{previewInvoice.customerSnapshot?.street}, {previewInvoice.customerSnapshot?.number} - {previewInvoice.customerSnapshot?.city}/{previewInvoice.customerSnapshot?.state}</div>
                </div>

                {/* Totals & Tax Summary */}
                <div className="border border-black p-3 bg-gray-50 grid grid-cols-4 gap-2 text-center">
                  <div>
                    <span className="text-[9px] font-bold text-gray-600 block">TOTAL BRUTO</span>
                    <span className="font-black text-xs">{formatMoney(previewInvoice.totalGrossCents)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-600 block">RETENÇÕES</span>
                    <span className="font-black text-xs text-rose-700">-{formatMoney(previewInvoice.totalWithheldCents)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-600 block">DESCONTOS</span>
                    <span className="font-black text-xs">{formatMoney(previewInvoice.totalDiscountCents)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-emerald-800 block">LÍQUIDO A PAGAR</span>
                    <span className="font-black text-sm text-emerald-900">{formatMoney(previewInvoice.totalNetCents)}</span>
                  </div>
                </div>

                {/* PIX Key and Coordinates */}
                {previewInvoice.issuerSnapshot?.pixKey && (
                  <div className="border border-black p-2.5 bg-emerald-50 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[10px] text-emerald-900 block">PAGAMENTO VIA PIX (CHAVE OFICIAL)</span>
                      <span className="font-mono text-xs font-black">{previewInvoice.issuerSnapshot.pixKey}</span>
                    </div>
                    <span className="text-[10px] text-emerald-800 font-semibold">Banco do Brasil</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Emit Invoice Modal */}
      {showEmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-[#bfcbbd] shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#bfcbbd]/40">
              <h3 className="font-bold text-base text-[#1a1d17]">Emitir Documento Fiscal / Nota</h3>
              <button onClick={() => setShowEmitModal(false)} className="p-1 text-[#78897d] hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEmitInvoice} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-[#495a4f] mb-1">Tipo de Documento</label>
                  <select
                    value={emitType}
                    onChange={(e) => setEmitType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#bfcbbd]"
                  >
                    <option value="NFS-e">NFS-e (Serviços)</option>
                    <option value="NF-e">NF-e (Mercadorias/DANFE)</option>
                    <option value="FATURA">Fatura Comercial</option>
                    <option value="RECIBO">Recibo de Pagamento</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#495a4f] mb-1">Cliente / Tomador</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#bfcbbd]"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#495a4f] mb-1">Descrição dos Serviços / Itens</label>
                <input
                  type="text"
                  value={serviceDesc}
                  onChange={(e) => setServiceDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#bfcbbd]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-[#495a4f] mb-1">Valor Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={serviceAmount}
                    onChange={(e) => setServiceAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#bfcbbd]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#495a4f] mb-1">Alíquota ISS (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={issPercent}
                    onChange={(e) => setIssPercent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#bfcbbd]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="issWithheldCheck"
                  checked={issWithheld}
                  onChange={(e) => setIssWithheld(e.target.checked)}
                  className="w-4 h-4 rounded text-[#4a7c59]"
                />
                <label htmlFor="issWithheldCheck" className="font-semibold text-[#1a1d17]">
                  ISS Retido pelo Tomador do Serviço
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#bfcbbd]/40">
                <button
                  type="button"
                  onClick={() => setShowEmitModal(false)}
                  className="px-4 py-2 border border-[#bfcbbd] rounded-xl font-bold text-[#495a4f]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4a7c59] text-white rounded-xl font-bold hover:bg-[#2f5c40]"
                >
                  Gerar Documento Fiscal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
