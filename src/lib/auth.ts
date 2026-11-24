import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { db } from "@/db";
import { organizations, organizationMembers, organizationInvites, companySettings, categories, categoryRules } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export type UserRole = "owner" | "editor" | "accountant";

export interface WorkspaceSummary {
  id: string;
  name: string;
  role: UserRole;
}

export interface AuthContext {
  userId: string;
  email: string;
  organizationId: string;
  organizationName: string;
  role: UserRole;
  isAccountant: boolean; // Convenience flag: if true, all state mutations are blocked
  availableWorkspaces: WorkspaceSummary[];
}

const DEFAULT_DEV_ORG_ID = "org-default-csagil";
const DEFAULT_DEV_USER_ID = "usr-dev-local";

/**
 * Creates default seed categories and company settings for a new organization
 */
export async function seedDefaultOrganizationData(orgId: string) {
  // 1. Initial Company Settings
  await db
    .insert(companySettings)
    .values({
      organizationId: orgId,
      legalName: "CS AGIL SERVICOS FINANCEIROS LTDA",
      tradeName: "CS Agil Finance",
      cnpj: "12.345.678/0001-90",
      stateRegistration: "123.456.789.111",
      municipalRegistration: "9876543-2",
      taxRegime: "simples_nacional",
      email: "financeiro@csagil.com.br",
      phone: "(11) 98765-4321",
      street: "Avenida Paulista",
      number: "1000",
      complement: "Conjunto 1402",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP",
      zipCode: "01310-100",
      ibgeCode: "3550308",
      bankCode: "001",
      bankName: "001 - Banco do Brasil S.A.",
      agency: "1234",
      accountNumber: "56789",
      accountDigit: "0",
      accountType: "checking",
      pixKeyType: "cnpj",
      pixKey: "12.345.678/0001-90",
      defaultNfSeries: "1",
      nextNfNumber: 104,
      defaultServiceCode: "01.07",
      cnaePrincipal: "6202-3/00",
    })
    .onConflictDoNothing();

  // 2. Default Seed Categories
  const initialCategories = [
    { id: `cat-${orgId}-unassigned`, name: "Unassigned", icon: "help-circle", color: "#6b7280", bgColor: "#f3f4f6", textColor: "#374151" },
    { id: `cat-${orgId}-software`, name: "Software Subscriptions", icon: "laptop", color: "#4a7c59", bgColor: "#e8ead1", textColor: "#2f5c40" },
    { id: `cat-${orgId}-operations`, name: "Operations", icon: "briefcase", color: "#2563eb", bgColor: "#dbeafe", textColor: "#1e40af" },
    { id: `cat-${orgId}-revenue`, name: "Revenue", icon: "trending-up", color: "#16a34a", bgColor: "#dcfce7", textColor: "#15803d" },
    { id: `cat-${orgId}-payroll`, name: "Payroll", icon: "users", color: "#9333ea", bgColor: "#f3e8ff", textColor: "#7e22ce" },
    { id: `cat-${orgId}-housing`, name: "Housing & Utilities", icon: "home", color: "#ea580c", bgColor: "#ffedd5", textColor: "#c2410c" },
    { id: `cat-${orgId}-travel`, name: "Travel & Meals", icon: "plane", color: "#0891b2", bgColor: "#cffafe", textColor: "#0e7490" },
    { id: `cat-${orgId}-food`, name: "Food & Dining", icon: "coffee", color: "#d97706", bgColor: "#fef3c7", textColor: "#b45309" },
    { id: `cat-${orgId}-investments`, name: "Investments", icon: "piggy-bank", color: "#059669", bgColor: "#d1fae5", textColor: "#047857" },
  ];

  for (const cat of initialCategories) {
    await db
      .insert(categories)
      .values({
        id: cat.id,
        organizationId: orgId,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        bgColor: cat.bgColor,
        textColor: cat.textColor,
      })
      .onConflictDoNothing();
  }

  // 3. Default Category Rules
  const initialRules = [
    { keyword: "aws", categoryName: "Software Subscriptions" },
    { keyword: "google", categoryName: "Software Subscriptions" },
    { keyword: "github", categoryName: "Software Subscriptions" },
    { keyword: "claro", categoryName: "Software Subscriptions" },
    { keyword: "debito net", categoryName: "Software Subscriptions" },
    { keyword: "cred pix", categoryName: "Revenue" },
    { keyword: "rec pix", categoryName: "Revenue" },
    { keyword: "cred ted", categoryName: "Revenue" },
    { keyword: "payout", categoryName: "Revenue" },
    { keyword: "gusto", categoryName: "Payroll" },
    { keyword: "luz/gas", categoryName: "Housing & Utilities" },
    { keyword: "energia", categoryName: "Housing & Utilities" },
    { keyword: "starbucks", categoryName: "Food & Dining" },
    { keyword: "uber", categoryName: "Travel & Meals" },
    { keyword: "cesta", categoryName: "Operations" },
    { keyword: "tarifa", categoryName: "Operations" },
  ];

  for (let i = 0; i < initialRules.length; i++) {
    const r = initialRules[i];
    const targetCat = initialCategories.find((c) => c.name === r.categoryName);
    if (targetCat) {
      await db
        .insert(categoryRules)
        .values({
          id: `rule-${orgId}-${i + 1}`,
          organizationId: orgId,
          keyword: r.keyword,
          matchType: "contains",
          matchField: "all",
          targetCategoryId: targetCat.id,
          priority: i,
        })
        .onConflictDoNothing();
    }
  }
}

/**
 * Ensures a default development organization exists and returns auth context
 */
async function getDevAuthContext(): Promise<AuthContext> {
  const cookieStore = await cookies();
  const simulatedRole = cookieStore.get("csagil_active_role")?.value as UserRole | undefined;

  const devOrgId = DEFAULT_DEV_ORG_ID;
  const devUserId = DEFAULT_DEV_USER_ID;
  const devEmail = process.env.DEV_USER_EMAIL || "dev@csagil.local";
  const defaultRole = (process.env.DEV_USER_ROLE as UserRole) || "owner";
  const devRole = (simulatedRole && ["owner", "editor", "accountant"].includes(simulatedRole))
    ? simulatedRole
    : defaultRole;

  // Ensure dev organization exists
  const existingOrg = await db.query.organizations.findFirst({
    where: eq(organizations.id, devOrgId),
  });

  if (!existingOrg) {
    await db.insert(organizations).values({
      id: devOrgId,
      name: "Charlton Shaw Agil Finance",
      slug: "csagil-default",
      currency: "BRL",
      locale: "pt-BR",
    }).onConflictDoNothing();

    await db.insert(organizationMembers).values({
      organizationId: devOrgId,
      userId: devUserId,
      email: devEmail,
      role: "owner",
    }).onConflictDoNothing();

    await seedDefaultOrganizationData(devOrgId);
  }

  return {
    userId: devUserId,
    email: devEmail,
    organizationId: devOrgId,
    organizationName: existingOrg?.name || "Charlton Shaw Agil Finance",
    role: devRole,
    isAccountant: devRole === "accountant",
    availableWorkspaces: [
      { id: devOrgId, name: existingOrg?.name || "Charlton Shaw Agil Finance", role: devRole },
    ],
  };
}

/**
 * Resolves current user and their active organization from Supabase Auth cookies or DEV_AUTH_BYPASS
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  let rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  if (rawUrl && !rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
    rawUrl = `https://${rawUrl}`;
  }

  let isValidUrl = false;
  try {
    if (rawUrl) {
      const parsed = new URL(rawUrl);
      isValidUrl = (parsed.protocol === "http:" || parsed.protocol === "https:") && Boolean(parsed.hostname);
    }
  } catch {
    isValidUrl = false;
  }

  // 1. Check Dev Mode Bypass or invalid/missing Supabase URL
  if (process.env.DEV_AUTH_BYPASS === "true" || !isValidUrl || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return await getDevAuthContext();
  }

  // 2. Production Supabase Auth with SSR Cookie Store
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      rawUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Can be ignored in Server Component render
            }
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // If user has not signed in via Supabase yet, allow dev fallback
      return await getDevAuthContext();
    }

    // Query all organizations where user is a member
    let allMemberships = await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.userId, user.id),
    });

    if (user.email) {
      const invites = await db.query.organizationInvites.findMany({
        where: eq(organizationInvites.email, user.email),
      });

      for (const invite of invites) {
        if (!allMemberships.some((m) => m.organizationId === invite.organizationId)) {
          await db.insert(organizationMembers).values({
            organizationId: invite.organizationId,
            userId: user.id,
            email: user.email,
            role: invite.role,
          }).onConflictDoNothing();

          await db.update(organizationInvites).set({ acceptedAt: new Date() }).where(eq(organizationInvites.id, invite.id));
        }
      }

      allMemberships = await db.query.organizationMembers.findMany({
        where: eq(organizationMembers.userId, user.id),
      });
    }

    if (allMemberships.length === 0) {
      // If user has no organization or invite, create their default one
      const newOrgId = `org-${user.id.slice(0, 12)}`;
      await db.insert(organizations).values({
        id: newOrgId,
        name: user.user_metadata?.company_name || user.email?.split("@")[0] || "My Company",
        slug: `org-${Date.now()}`,
        currency: "BRL",
        locale: "pt-BR",
      }).onConflictDoNothing();

      await db.insert(organizationMembers).values({
        organizationId: newOrgId,
        userId: user.id,
        email: user.email || "",
        role: "owner",
      }).onConflictDoNothing();

      await seedDefaultOrganizationData(newOrgId);

      allMemberships = await db.query.organizationMembers.findMany({
        where: eq(organizationMembers.userId, user.id),
      });
    }

    // Determine active organization: check cookie csagil_active_org_id or default to first
    const activeOrgCookie = cookieStore.get("csagil_active_org_id")?.value;
    const activeMember = (activeOrgCookie && allMemberships.find((m) => m.organizationId === activeOrgCookie))
      || allMemberships[0];

    // Fetch org details for all memberships
    const allOrgIds = allMemberships.map((m) => m.organizationId);
    const orgsList = allOrgIds.length > 0
      ? await db.query.organizations.findMany({
          where: inArray(organizations.id, allOrgIds),
        })
      : [];

    const availableWorkspaces: WorkspaceSummary[] = allMemberships.map((m) => {
      const org = orgsList.find((o) => o.id === m.organizationId);
      return {
        id: m.organizationId,
        name: org?.name || "Workspace",
        role: m.role,
      };
    });

    const activeOrg = orgsList.find((o) => o.id === activeMember.organizationId);

    const simulatedRole = cookieStore.get("csagil_active_role")?.value as UserRole | undefined;
    const effectiveRole = (activeMember.role === "owner" && simulatedRole && ["owner", "editor", "accountant"].includes(simulatedRole))
      ? simulatedRole
      : activeMember.role;

    return {
      userId: user.id,
      email: user.email || activeMember.email,
      organizationId: activeMember.organizationId,
      organizationName: activeOrg?.name || "My Company",
      role: effectiveRole,
      isAccountant: effectiveRole === "accountant",
      availableWorkspaces,
    };
  } catch (err) {
    console.warn("Supabase auth resolution failed, falling back to dev context:", err);
    return await getDevAuthContext();
  }
}

/**
 * Enforces role access for API mutations.
 * Throws 403 error response if user is an accountant trying to mutate data.
 */
export function assertCanMutate(auth: AuthContext) {
  if (auth.isAccountant) {
    throw new Error("FORBIDDEN_ACCOUNTANT_READ_ONLY: The accountant role has read-only access and cannot modify financial records.");
  }
}
