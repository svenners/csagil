import { NextRequest, NextResponse, connection } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { cookies } from "next/headers";
import { db } from "@/db";
import { organizationMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  await connection();
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId } = await req.json();
    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    // Verify user is a member of the requested organization
    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, auth.userId)
      ),
    });

    if (!membership && !process.env.DEV_AUTH_BYPASS) {
      return NextResponse.json({ error: "Access denied to target organization" }, { status: 403 });
    }

    const cookieStore = await cookies();
    cookieStore.set("csagil_active_org_id", organizationId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      sameSite: "lax",
    });

    return NextResponse.json({ success: true, activeOrgId: organizationId });
  } catch (err: any) {
    console.error("Switch organization error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
