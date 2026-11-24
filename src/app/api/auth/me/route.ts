import { NextResponse, connection } from "next/server";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  await connection();
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({
      authenticated: true,
      userId: auth.userId,
      email: auth.email,
      organizationId: auth.organizationId,
      organizationName: auth.organizationName || "CS Agil Finance",
      role: auth.role,
      isAccountant: auth.isAccountant,
      availableWorkspaces: auth.availableWorkspaces || [],
    });
  } catch (error: any) {
    console.error("Auth me error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
