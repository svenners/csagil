import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
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
      role: auth.role,
      isAccountant: auth.isAccountant,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
