import { NextRequest, NextResponse, connection } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  await connection();
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await req.json();
    const cookieStore = await cookies();

    if (role === "reset" || !role) {
      cookieStore.delete("csagil_active_role");
      return NextResponse.json({ success: true, activeRole: "owner", isAccountant: false });
    }

    if (role === "accountant" || role === "editor" || role === "owner") {
      cookieStore.set("csagil_active_role", role, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        sameSite: "lax",
      });
      return NextResponse.json({
        success: true,
        activeRole: role,
        isAccountant: role === "accountant",
      });
    }

    return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
  } catch (err: any) {
    console.error("Switch role error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
