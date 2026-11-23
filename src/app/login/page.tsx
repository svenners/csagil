"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Mail, ArrowRight, Building, KeyRound, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup" | "magic">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const supabaseConfigured = isSupabaseConfigured();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      if (!supabaseConfigured) {
        // If Supabase credentials are not yet entered, sign in via dev bypass
        setMessage({
          text: "Supabase Anon Key is not yet configured. Redirecting to workspace in local/demo mode...",
          type: "success",
        });
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 1200);
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage({ text: error.message, type: "error" });
      } else {
        setMessage({ text: "Signed in successfully. Redirecting...", type: "success" });
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 800);
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      if (!supabaseConfigured) {
        setMessage({
          text: "Please configure NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel/environment to enable remote signups.",
          type: "error",
        });
        return;
      }

      const supabase = createClient();
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            company_name: companyName || "CS Agil Workspace",
          },
        },
      });

      if (error) {
        setMessage({ text: error.message, type: "error" });
      } else if (data?.user?.identities?.length === 0) {
        setMessage({
          text: "An account with this email already exists. Please sign in instead.",
          type: "error",
        });
      } else {
        setMessage({
          text: "Account registered! If confirmation is required, please check your inbox.",
          type: "success",
        });
        setMode("signin");
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      if (!supabaseConfigured) {
        setMessage({
          text: "Supabase configuration required for magic links.",
          type: "error",
        });
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });

      if (error) {
        setMessage({ text: error.message, type: "error" });
      } else {
        setMessage({
          text: "Magic link sent! Check your email to sign in directly.",
          type: "success",
        });
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#fdfdf9] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#2f5c40] text-white shadow-md mb-1">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#1a1d17]">CS AGIL FINANCE</h1>
          <p className="text-xs text-[#78897d] font-medium">
            Financial Ledger & Brazilian Fiscal Suite &bull; User & Accountant Access
          </p>
        </div>

        {/* Supabase Config Warning / Quick Demo Access */}
        {!supabaseConfigured && (
          <div className="p-4 bg-[#f8fae5] border border-[#bfcbbd] rounded-2xl text-xs space-y-2.5">
            <div className="flex items-start gap-2 text-[#2f5c40] font-bold">
              <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Supabase Production Auth Setup</span>
            </div>
            <p className="text-[#495a4f] text-[11px] leading-relaxed">
              Your PostgreSQL database is connected to Supabase (<code>vdrritbushmamplvzjbi</code>). To enable full password & magic link logins on Vercel, add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your Vercel Project Settings.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={handleDemoAccess}
                className="w-full py-2 px-3 bg-[#4a7c59] text-white rounded-xl font-bold text-xs hover:bg-[#2f5c40] transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <span>Continue into Workspace (Admin / Dev Mode)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Auth Box */}
        <div className="bg-white p-7 rounded-3xl border border-[#bfcbbd]/70 shadow-sm space-y-5">
          {/* Tabs */}
          <div className="flex bg-[#f6f8df] p-1 rounded-xl border border-[#bfcbbd]/60 text-xs font-bold">
            <button
              onClick={() => { setMode("signin"); setMessage(null); }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                mode === "signin" ? "bg-[#2f5c40] text-white shadow-2xs" : "text-[#495a4f] hover:text-[#11140e]"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode("signup"); setMessage(null); }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                mode === "signup" ? "bg-[#2f5c40] text-white shadow-2xs" : "text-[#495a4f] hover:text-[#11140e]"
              }`}
            >
              Register
            </button>
            <button
              onClick={() => { setMode("magic"); setMessage(null); }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                mode === "magic" ? "bg-[#2f5c40] text-white shadow-2xs" : "text-[#495a4f] hover:text-[#11140e]"
              }`}
            >
              Magic Link
            </button>
          </div>

          {/* Form */}
          {mode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#495a4f] uppercase mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#78897d] absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@company.com or contador@office.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#9cb19e] bg-white text-[#11140e] font-semibold text-xs shadow-2xs focus:border-[#2f5c40] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#495a4f] uppercase mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#78897d] absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#9cb19e] bg-white text-[#11140e] font-semibold text-xs shadow-2xs focus:border-[#2f5c40] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#2f5c40] text-white rounded-xl font-bold text-xs hover:bg-[#1f3e2b] transition-colors shadow-2xs disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <span>{loading ? "Signing in..." : "Sign In to CS Agil"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#495a4f] uppercase mb-1">
                  Company / Organization Name
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-[#78897d] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="My Company LTDA"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#9cb19e] bg-white text-[#11140e] font-semibold text-xs shadow-2xs focus:border-[#2f5c40] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#495a4f] uppercase mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#78897d] absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@company.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#9cb19e] bg-white text-[#11140e] font-semibold text-xs shadow-2xs focus:border-[#2f5c40] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#495a4f] uppercase mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#78897d] absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#9cb19e] bg-white text-[#11140e] font-semibold text-xs shadow-2xs focus:border-[#2f5c40] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#2f5c40] text-white rounded-xl font-bold text-xs hover:bg-[#1f3e2b] transition-colors shadow-2xs disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <span>{loading ? "Creating account..." : "Register Workspace"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {mode === "magic" && (
            <form onSubmit={handleMagicLink} className="space-y-4 text-xs">
              <p className="text-xs text-[#495a4f]">
                Enter your authorized email. We will send a secure one-click link to log you in directly without needing a password.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-[#495a4f] uppercase mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#78897d] absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@company.com or contador@office.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#9cb19e] bg-white text-[#11140e] font-semibold text-xs shadow-2xs focus:border-[#2f5c40] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#2f5c40] text-white rounded-xl font-bold text-xs hover:bg-[#1f3e2b] transition-colors shadow-2xs disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <span>{loading ? "Sending link..." : "Send Magic Link"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Feedback Messages */}
          {message && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-900 border border-emerald-300"
                  : "bg-rose-50 text-rose-900 border border-rose-300"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
