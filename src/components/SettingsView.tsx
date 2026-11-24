"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Upload,
  Download,
  Globe,
  HardDrive,
  CheckCircle2,
  ShieldAlert,
  Users,
  UserCheck,
  ShieldCheck,
  UserPlus,
  Trash2,
  ArrowRightLeft,
  Mail,
  Copy,
  Check
} from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

interface SettingsViewProps {
  isAccountant?: boolean;
}

interface Member {
  userId: string;
  email: string;
  role: "owner" | "editor" | "accountant";
  createdAt: string;
}

interface Invite {
  id: string;
  email: string;
  role: "owner" | "editor" | "accountant";
  token: string;
  createdAt: string;
}

export function SettingsView({ isAccountant = false }: SettingsViewProps) {
  const { t, locale, setLocale, currency, setCurrency } = useLanguage();
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  // Members state
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentRole, setCurrentRole] = useState<string>("owner");

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "accountant">("accountant");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Role switching
  const [switchingRole, setSwitchingRole] = useState(false);

  const fetchMembers = async () => {
    try {
      setLoadingMembers(true);
      const res = await fetch("/api/organization/members");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setPendingInvites(data.pendingInvites || []);
        setCurrentUserId(data.currentUserId || "");
        setCurrentRole(data.currentRole || "owner");
      }
    } catch (e) {
      console.error("Failed to load members:", e);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    try {
      setInviting(true);
      setInviteSuccessMsg(null);
      const res = await fetch("/api/organization/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          password: invitePassword || undefined,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setInviteSuccessMsg(json.message);
        setInviteEmail("");
        setInvitePassword("");
        fetchMembers();
      } else {
        const err = await res.json();
        alert(`Error granting access: ${err.error}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: "editor" | "accountant") => {
    try {
      const res = await fetch("/api/organization/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) {
        fetchMembers();
      } else {
        const err = await res.json();
        alert(`Failed to update role: ${err.error}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    }
  };

  const handleDeleteMember = async (userId: string, email: string) => {
    if (!confirm(`Remove access for ${email}?`)) return;
    try {
      const res = await fetch(`/api/organization/members?userId=${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchMembers();
      } else {
        const err = await res.json();
        alert(`Failed to remove member: ${err.error}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/organization/members?inviteId=${inviteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchMembers();
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    }
  };

  const handleSwitchSimulatedRole = async (targetRole: "accountant" | "reset") => {
    try {
      setSwitchingRole(true);
      const res = await fetch("/api/auth/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole }),
      });
      if (res.ok) {
        // Refresh page to apply new role context everywhere
        window.location.reload();
      }
    } catch (err: any) {
      alert(`Failed to switch role: ${err.message}`);
      setSwitchingRole(false);
    }
  };

  const handleCsfinanceBackupRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const text = await file.text();
      const json = JSON.parse(text);

      const res = await fetch("/api/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });

      if (res.ok) {
        const result = await res.json();
        setImportMessage(result.message);
      } else {
        const err = await res.json();
        alert(`Migration error: ${err.error}`);
      }
    } catch (e: any) {
      alert(`Invalid backup JSON file: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold text-[#1a1d17]">{t.settings.title}</h2>
        <p className="text-xs text-[#78897d]">
          Manage organization members, accountant audit access, language, currency, and data backups.
        </p>
      </div>

      {/* Accountant Active Notice / Return to Owner Banner */}
      {isAccountant && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-900 shadow-2xs">
          <div className="flex items-center gap-3 font-semibold">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold block">{t.common.readOnlyBadge}</span>
              <span className="text-[11px] text-emerald-800">{t.common.readOnlyNotice}</span>
            </div>
          </div>
          <button
            onClick={() => handleSwitchSimulatedRole("reset")}
            disabled={switchingRole}
            className="px-3 py-1.5 bg-[#2f5c40] text-white rounded-xl font-bold text-xs hover:bg-[#1f3e2b] transition-colors shrink-0 shadow-2xs"
          >
            {switchingRole ? "Switching..." : t.settings.returnToOwner}
          </button>
        </div>
      )}

      {/* Role Simulator for Testing (Only visible when signed in as Owner) */}
      {!isAccountant && (
        <div className="bg-[#f6f8df] p-4 rounded-2xl border border-[#bfcbbd]/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-bold text-[#2f5c40] text-sm flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" />
              Role Access Simulator
            </span>
            <p className="text-[#495a4f] text-xs mt-0.5">
              Instantly test and verify what an invited Accountant sees (read-only audit banner, disabled edit buttons, closing pack exports).
            </p>
          </div>
          <button
            onClick={() => handleSwitchSimulatedRole("accountant")}
            disabled={switchingRole}
            className="px-4 py-2 bg-[#2f5c40] text-white rounded-xl font-bold text-xs hover:bg-[#1f3e2b] transition-colors shadow-2xs shrink-0 flex items-center gap-1.5"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-300" />
            <span>{switchingRole ? "Switching..." : t.settings.simulateAccountant}</span>
          </button>
        </div>
      )}

      {/* User & Accountant Access Management */}
      <div className="bg-white p-6 rounded-2xl border border-[#bfcbbd]/60 shadow-2xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#4a7c59]" />
            <div>
              <h3 className="font-bold text-sm text-[#1a1d17]">{t.settings.teamTitle}</h3>
              <p className="text-xs text-[#78897d]">{t.settings.teamSubtitle}</p>
            </div>
          </div>
        </div>

        {/* Invite New User or Accountant Form */}
        {!isAccountant && (
          <form onSubmit={handleInvite} className="p-4 bg-[#fdfdf9] rounded-xl border border-[#bfcbbd]/50 space-y-3">
            <h4 className="text-xs font-bold text-[#1a1d17] uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-[#4a7c59]" />
              {t.settings.addMember}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
              <div className="sm:col-span-4">
                <input
                  type="email"
                  placeholder={t.settings.emailPlaceholder}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#9cb19e] bg-white text-[#11140e] font-semibold text-xs shadow-2xs focus:border-[#2f5c40] focus:outline-none"
                  required
                />
              </div>

              <div className="sm:col-span-3">
                <input
                  type="password"
                  placeholder="Initial Password (min 6 chars)"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#9cb19e] bg-white text-[#11140e] font-semibold text-xs shadow-2xs focus:border-[#2f5c40] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-[#9cb19e] bg-white text-[#11140e] font-semibold text-xs shadow-2xs focus:border-[#2f5c40] focus:outline-none"
                >
                  <option value="accountant" className="text-[#11140e] bg-white">
                    {t.settings.roleAccountant}
                  </option>
                  <option value="editor" className="text-[#11140e] bg-white">
                    {t.settings.roleUser}
                  </option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={inviting}
                  className="w-full py-2 px-3 bg-[#4a7c59] text-white rounded-xl font-bold text-xs hover:bg-[#2f5c40] transition-colors shadow-2xs disabled:opacity-50"
                >
                  {inviting ? "Saving..." : t.settings.inviteBtn}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-[#78897d]">
              Tip: Provide an initial password so the user or accountant can log in directly at <code>/login</code> without needing email links.
            </p>

            {inviteSuccessMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{inviteSuccessMsg}</span>
              </div>
            )}
          </form>
        )}

        {/* Members List Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-[#78897d] uppercase tracking-wider">
            Active Workspace Accounts ({members.length})
          </h4>

          {loadingMembers ? (
            <div className="py-6 text-center text-xs text-[#78897d]">Loading team members...</div>
          ) : members.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#78897d]">No members found.</div>
          ) : (
            <div className="divide-y divide-[#bfcbbd]/30 border border-[#bfcbbd]/40 rounded-xl overflow-hidden bg-white">
              {members.map((member) => (
                <div
                  key={member.userId}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#fcfdf7] transition-colors text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#f0f2da] text-[#2f5c40] font-bold flex items-center justify-center shrink-0 border border-[#bfcbbd]/60">
                      {member.email.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-[#1a1d17] flex items-center gap-2">
                        <span>{member.email}</span>
                        {member.userId === currentUserId && (
                          <span className="text-[10px] bg-[#f0f2da] text-[#2f5c40] px-1.5 py-0.5 rounded-md font-bold">
                            You
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#78897d]">
                        Added: {new Date(member.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Role Badge */}
                    {member.role === "owner" ? (
                      <span className="px-2.5 py-1 bg-[#2f5c40] text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-2xs">
                        <UserCheck className="w-3 h-3" />
                        Owner (Admin)
                      </span>
                    ) : member.role === "accountant" ? (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg font-bold text-[11px] flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                        Accountant (Read-Only)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg font-bold text-[11px]">
                        User / Operator (Full)
                      </span>
                    )}

                    {/* Role Modifier Dropdown for non-owner members */}
                    {!isAccountant && member.role !== "owner" && (
                      <select
                        value={member.role}
                        onChange={(e) => handleChangeRole(member.userId, e.target.value as any)}
                        className="px-2 py-1 rounded-lg border border-[#9cb19e] bg-white text-[#11140e] font-semibold text-xs shadow-2xs focus:border-[#2f5c40] focus:outline-none"
                      >
                        <option value="accountant" className="text-[#11140e] bg-white">
                          Accountant (Read-Only)
                        </option>
                        <option value="editor" className="text-[#11140e] bg-white">
                          User (Editor)
                        </option>
                      </select>
                    )}

                    {/* Remove Member Button */}
                    {!isAccountant && member.role !== "owner" && (
                      <button
                        onClick={() => handleDeleteMember(member.userId, member.email)}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remove Member Access"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Language & Currency Preferences */}
      <div className="bg-white p-6 rounded-2xl border border-[#bfcbbd]/60 shadow-2xs space-y-4">
        <h3 className="font-bold text-sm text-[#1a1d17]">Preferences & Display</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-[#495a4f] mb-1">{t.settings.language}</label>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-[#9cb19e] bg-white text-[#11140e] font-semibold"
            >
              <option value="pt-BR" className="text-[#11140e] bg-white">Português (Brasil)</option>
              <option value="en" className="text-[#11140e] bg-white">English (US)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-[#495a4f] mb-1">{t.settings.currency}</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#9cb19e] bg-white text-[#11140e] font-semibold"
            >
              <option value="BRL" className="text-[#11140e] bg-white">R$ BRL - Brazilian Real</option>
              <option value="USD" className="text-[#11140e] bg-white">$ USD - United States Dollar</option>
              <option value="EUR" className="text-[#11140e] bg-white">€ EUR - Euro</option>
              <option value="GBP" className="text-[#11140e] bg-white">£ GBP - British Pound</option>
            </select>
          </div>
        </div>
      </div>

      {/* Migration & Backup Section */}
      {!isAccountant && (
        <div className="bg-white p-6 rounded-2xl border border-[#bfcbbd]/60 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-[#4a7c59]" />
            <h3 className="font-bold text-sm text-[#1a1d17]">Database Migration from csfinance</h3>
          </div>
          <p className="text-xs text-[#495a4f]">
            Easily import your previous <code>ProfitLedger_Database_Backup_*.json</code> or <code>Finflow_AppData.json</code> backup from csfinance into PostgreSQL.
          </p>

          <div className="pt-2">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#4a7c59] text-white rounded-xl text-xs font-bold hover:bg-[#2f5c40] transition-colors cursor-pointer shadow-2xs">
              <Upload className="w-4 h-4" />
              <span>{importing ? "Importing Data..." : t.settings.restoreDatabase}</span>
              <input type="file" accept=".json" onChange={handleCsfinanceBackupRestore} className="hidden" disabled={importing} />
            </label>

            {importMessage && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{importMessage}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
