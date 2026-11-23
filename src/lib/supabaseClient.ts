import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

  const formattedUrl = url && !url.startsWith("http://") && !url.startsWith("https://")
    ? `https://${url}`
    : url;

  return createBrowserClient(
    formattedUrl || "https://placeholder.supabase.co",
    anonKey || "placeholder-anon-key"
  );
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && anonKey && url.includes(".supabase.co"));
}
