import { NextResponse, connection } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  await connection();
  try {
    const cookieStore = await cookies();
    cookieStore.delete("csagil_active_role");

    // Also clear standard Supabase auth cookie prefixes
    const allCookies = cookieStore.getAll();
    for (const c of allCookies) {
      if (c.name.startsWith("sb-") || c.name.includes("supabase")) {
        cookieStore.delete(c.name);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Logout error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
