import { NextRequest, NextResponse, connection } from "next/server";
import { getAuthContext, assertCanMutate } from "@/lib/auth";
import { db } from "@/db";
import { organizationMembers, organizationInvites } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  await connection();
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const members = await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.organizationId, auth.organizationId),
      orderBy: (table, { asc }) => [asc(table.createdAt)],
    });

    const invites = await db.query.organizationInvites.findMany({
      where: and(
        eq(organizationInvites.organizationId, auth.organizationId),
      ),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });

    const pendingInvites = invites.filter((inv) => !inv.acceptedAt);

    return NextResponse.json({
      members,
      pendingInvites,
      currentUserId: auth.userId,
      currentRole: auth.role,
      isAccountant: auth.isAccountant,
    });
  } catch (err: any) {
    console.error("Fetch organization members error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await connection();
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    assertCanMutate(auth);

    const { email, role, password } = await req.json();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    const targetRole = role === "accountant" ? "accountant" : "editor";
    const cleanEmail = email.trim().toLowerCase();

    // 1. If password is provided, attempt to provision or update user in Supabase Auth
    let supabaseUserId: string | null = null;
    let authNote = "";

    if (password && password.length >= 6) {
      const admin = getSupabaseAdmin();
      if (admin) {
        try {
          const { data: createData, error: createErr } = await admin.auth.admin.createUser({
            email: cleanEmail,
            password: password,
            email_confirm: true,
            user_metadata: { company_name: "CS Agil Workspace" },
          });

          if (createData?.user) {
            supabaseUserId = createData.user.id;
            authNote = " Password configured and auto-confirmed! User can log in immediately at /login.";
          } else if (createErr?.message?.toLowerCase().includes("already registered") || createErr?.message?.toLowerCase().includes("already exists")) {
            // Find existing user and update password
            const { data: listData } = await admin.auth.admin.listUsers();
            const existingUser = listData?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
            if (existingUser) {
              await admin.auth.admin.updateUserById(existingUser.id, {
                password: password,
                email_confirm: true,
              });
              supabaseUserId = existingUser.id;
              authNote = " Existing account updated with the new password and auto-confirmed!";
            }
          } else if (createErr) {
            console.warn("Supabase admin createUser warning:", createErr);
          }
        } catch (e: any) {
          console.warn("Supabase admin operation failed:", e.message);
        }
      } else {
        authNote = " (To enable direct password provisioning, add SUPABASE_SERVICE_ROLE_KEY in Vercel. Otherwise, the user can set their password under Register at /login).";
      }
    }

    // 2. Check if email is already an active member in this organization
    const existingMember = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, auth.organizationId),
        eq(organizationMembers.email, cleanEmail)
      ),
    });

    if (existingMember) {
      await db
        .update(organizationMembers)
        .set({
          role: targetRole,
          userId: supabaseUserId || existingMember.userId,
        })
        .where(
          and(
            eq(organizationMembers.organizationId, auth.organizationId),
            eq(organizationMembers.userId, existingMember.userId)
          )
        );

      return NextResponse.json({
        success: true,
        message: `Member ${cleanEmail} updated to ${targetRole}.${authNote}`,
        role: targetRole,
      });
    }

    // 3. Create an invitation record
    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days validity

    const inviteId = `inv-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    await db.insert(organizationInvites).values({
      id: inviteId,
      organizationId: auth.organizationId,
      email: cleanEmail,
      role: targetRole,
      token,
      expiresAt,
    }).onConflictDoNothing();

    // 4. Add to organizationMembers
    const finalUserId = supabaseUserId || `usr-${crypto.randomBytes(6).toString("hex")}`;
    await db.insert(organizationMembers).values({
      organizationId: auth.organizationId,
      userId: finalUserId,
      email: cleanEmail,
      role: targetRole,
    }).onConflictDoNothing();

    return NextResponse.json({
      success: true,
      message: `${targetRole === "accountant" ? "Accountant" : "User"} access granted to ${cleanEmail}.${authNote}`,
      token,
      role: targetRole,
    });
  } catch (err: any) {
    console.error("Add organization member error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  await connection();
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    assertCanMutate(auth);

    const { userId, role } = await req.json();
    if (!userId || !["owner", "editor", "accountant"].includes(role)) {
      return NextResponse.json({ error: "Invalid userId or role" }, { status: 400 });
    }

    await db
      .update(organizationMembers)
      .set({ role })
      .where(
        and(
          eq(organizationMembers.organizationId, auth.organizationId),
          eq(organizationMembers.userId, userId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Update member role error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  await connection();
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    assertCanMutate(auth);

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const inviteId = searchParams.get("inviteId");

    if (userId) {
      // Prevent deleting self if owner
      if (userId === auth.userId) {
        return NextResponse.json({ error: "Cannot delete your own active owner account." }, { status: 400 });
      }

      await db
        .delete(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, auth.organizationId),
            eq(organizationMembers.userId, userId)
          )
        );
    } else if (inviteId) {
      await db
        .delete(organizationInvites)
        .where(
          and(
            eq(organizationInvites.organizationId, auth.organizationId),
            eq(organizationInvites.id, inviteId)
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete member error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
