import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase Admin client with service_role privileges
 * Used for administrative user provisioning (e.g. creating users with pre-set passwords)
 */
export function getSupabaseAdmin() {
  let rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  if (rawUrl && !rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
    rawUrl = `https://${rawUrl}`;
  }

  const serviceRoleKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    ""
  ).trim();

  if (!rawUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(rawUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
