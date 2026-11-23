import {
  pgTable,
  text,
  timestamp,
  bigint,
  integer,
  boolean,
  date,
  jsonb,
  uniqueIndex,
  index,
  primaryKey
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// 1. Organizations & Workspaces
export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(), // nanoid or uuid
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  currency: text("currency").default("BRL").notNull(), // BRL, USD, EUR, GBP, CAD
  locale: text("locale").default("pt-BR").notNull(), // 'pt-BR' | 'en'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Organization Roles: 'owner' (full control), 'editor' (can edit ledger/invoices), 'accountant' (strictly read-only + exports)
export const organizationMembers = pgTable(
  "organization_members",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(), // Supabase auth.users ID or local dev UID
    email: text("email").notNull(),
    role: text("role").$type<"owner" | "editor" | "accountant">().default("editor").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId] }),
    index("idx_members_user").on(table.userId),
  ]
);

export const organizationInvites = pgTable("organization_invites", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").$type<"owner" | "editor" | "accountant">().default("accountant").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. Categories & Auto-Assign Rules
export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: text("kind").$type<"expense" | "income" | "both">().default("both").notNull(),
    icon: text("icon").default("folder").notNull(),
    color: text("color").default("#4a7c59").notNull(),
    bgColor: text("bg_color").default("#e8ead1").notNull(),
    textColor: text("text_color").default("#2f5c40").notNull(),
    monthlyBudgetCents: bigint("monthly_budget_cents", { mode: "number" }).default(0).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_categories_org").on(table.organizationId),
    uniqueIndex("idx_categories_org_name").on(table.organizationId, table.name),
  ]
);

export const categoryRules = pgTable(
  "category_rules",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    keyword: text("keyword").notNull(),
    matchType: text("match_type").$type<"contains" | "exact" | "starts_with">().default("contains").notNull(),
    matchField: text("match_field").$type<"all" | "merchant" | "description" | "filename">().default("all").notNull(),
    targetCategoryId: text("target_category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    priority: integer("priority").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_rules_org").on(table.organizationId),
  ]
);

// 3. Bank Statements & Statement History
export const statements = pgTable(
  "statements",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").$type<"PDF" | "CSV" | "QBO" | "XLSX" | "XLS">().notNull(),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull(),
    storagePath: text("storage_path"), // Supabase Storage path if uploaded
    source: text("source").$type<"Manual" | "Google Drive" | "System">().default("Manual").notNull(),
    driveFileId: text("drive_file_id"),
    driveUrl: text("drive_url"),
    status: text("status").$type<"Uploaded" | "Processing" | "Pending" | "Failed">().default("Uploaded").notNull(),
    parsedCount: integer("parsed_count").default(0).notNull(),
    importedCount: integer("imported_count").default(0).notNull(),
    accountName: text("account_name"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_statements_org").on(table.organizationId),
    index("idx_statements_org_date").on(table.organizationId, table.uploadedAt),
  ]
);

// 4. Financial Transactions Ledger
export const transactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    statementId: text("statement_id").references(() => statements.id, { onDelete: "set null" }),
    txDate: date("tx_date").notNull(), // YYYY-MM-DD
    merchant: text("merchant").notNull(),
    description: text("description").notNull(),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(), // Positive = Credit, Negative = Debit
    type: text("type").$type<"credit" | "debit">().notNull(),
    status: text("status").$type<"Cleared" | "Pending" | "Flagged">().default("Cleared").notNull(),
    accountName: text("account_name").default("Conta Corrente").notNull(),
    notes: text("notes"),
    googleDriveUrl: text("google_drive_url"),
    googleDriveFileName: text("google_drive_file_name"),
    googleDriveFileId: text("google_drive_file_id"),
    receiptStoragePath: text("receipt_storage_path"),
    linkedInvoiceId: text("linked_invoice_id"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_tx_org_date").on(table.organizationId, table.txDate),
    index("idx_tx_org_cat").on(table.organizationId, table.categoryId),
    index("idx_tx_org_type").on(table.organizationId, table.type),
    index("idx_tx_org_statement").on(table.organizationId, table.statementId),
  ]
);

// 5. Invoicing & Brazilian Fiscal Entities
export const companySettings = pgTable("company_settings", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  legalName: text("legal_name").notNull(), // Razão Social
  tradeName: text("trade_name"), // Nome Fantasia
  cnpj: text("cnpj").notNull(),
  stateRegistration: text("state_registration"), // Inscrição Estadual (IE)
  municipalRegistration: text("municipal_registration"), // Inscrição Municipal (IM)
  taxRegime: text("tax_regime")
    .$type<"simples_nacional" | "simples_nacional_mei" | "lucro_presumido" | "lucro_real">()
    .default("simples_nacional")
    .notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  street: text("street").notNull(),
  number: text("number").notNull(),
  complement: text("complement"),
  neighborhood: text("neighborhood").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(), // UF (SP, RJ, etc)
  zipCode: text("zip_code").notNull(),
  ibgeCode: text("ibge_code"),
  bankCode: text("bank_code").default("001"),
  bankName: text("bank_name").default("Banco do Brasil"),
  agency: text("agency"),
  agencyDigit: text("agency_digit"),
  accountNumber: text("account_number"),
  accountDigit: text("account_digit"),
  accountType: text("account_type").$type<"checking" | "savings" | "payment">().default("checking"),
  pixKeyType: text("pix_key_type").$type<"cpf" | "cnpj" | "email" | "phone" | "random">().default("cnpj"),
  pixKey: text("pix_key"),
  pixQrCodePayload: text("pix_qr_code_payload"), // EMV Copia e Cola string
  pixQrStoragePath: text("pix_qr_storage_path"), // Path in Supabase storage instead of multi-MB base64
  defaultNfSeries: text("default_nf_series").default("1").notNull(),
  nextNfNumber: integer("next_nf_number").default(101).notNull(),
  defaultServiceCode: text("default_service_code").default("01.07"),
  cnaePrincipal: text("cnae_principal"),
  specialTaxRegime: text("special_tax_regime"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const customers = pgTable(
  "customers",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    personType: text("person_type").$type<"PJ" | "PF">().default("PJ").notNull(),
    name: text("name").notNull(),
    tradeName: text("trade_name"),
    document: text("document").notNull(), // CNPJ or CPF
    stateRegistration: text("state_registration"),
    stateRegistrationIndicator: text("state_registration_indicator").$type<"1" | "2" | "9">().default("9").notNull(),
    municipalRegistration: text("municipal_registration"),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    street: text("street").notNull(),
    number: text("number").notNull(),
    complement: text("complement"),
    neighborhood: text("neighborhood").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    zipCode: text("zip_code").notNull(),
    ibgeCode: text("ibge_code"),
    bankingDetails: jsonb("banking_details"),
    notes: text("notes"),
    status: text("status").$type<"active" | "inactive">().default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_customers_org").on(table.organizationId),
  ]
);

export const providers = pgTable(
  "providers",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    personType: text("person_type").$type<"PJ" | "PF">().default("PJ").notNull(),
    name: text("name").notNull(),
    tradeName: text("trade_name"),
    document: text("document").notNull(),
    stateRegistration: text("state_registration"),
    stateRegistrationIndicator: text("state_registration_indicator").$type<"1" | "2" | "9">().default("9"),
    municipalRegistration: text("municipal_registration"),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    street: text("street").notNull(),
    number: text("number").notNull(),
    complement: text("complement"),
    neighborhood: text("neighborhood").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    zipCode: text("zip_code").notNull(),
    ibgeCode: text("ibge_code"),
    bankingDetails: jsonb("banking_details"),
    category: text("category"),
    notes: text("notes"),
    status: text("status").$type<"active" | "inactive">().default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_providers_org").on(table.organizationId),
  ]
);

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sku: text("sku").notNull(),
    ncm: text("ncm").notNull(),
    cest: text("cest"),
    cfop: text("cfop").notNull(),
    unit: text("unit").default("UN").notNull(),
    unitPriceCents: bigint("unit_price_cents", { mode: "number" }).notNull(),
    costPriceCents: bigint("cost_price_cents", { mode: "number" }).default(0),
    origin: text("origin").default("0").notNull(),
    icmsPercent: integer("icms_percent_bps").default(1800).notNull(), // Basis points (1800 = 18.00%)
    ipiPercent: integer("ipi_percent_bps").default(0),
    pisPercent: integer("pis_percent_bps").default(65).notNull(), // 65 = 0.65%
    cofinsPercent: integer("cofins_percent_bps").default(300).notNull(), // 300 = 3.00%
    notes: text("notes"),
    status: text("status").$type<"active" | "inactive">().default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_products_org").on(table.organizationId),
  ]
);

export const services = pgTable(
  "services",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    serviceCode: text("service_code").notNull(), // LC 116/2003 (e.g., 01.07)
    cnae: text("cnae"),
    municipalTaxCode: text("municipal_tax_code"),
    unitPriceCents: bigint("unit_price_cents", { mode: "number" }).notNull(),
    issPercent: integer("iss_percent_bps").default(200).notNull(), // 200 = 2.00%
    issWithheld: boolean("iss_withheld").default(false).notNull(),
    pisPercent: integer("pis_percent_bps").default(65).notNull(),
    cofinsPercent: integer("cofins_percent_bps").default(300).notNull(),
    csllPercent: integer("csll_percent_bps").default(100).notNull(),
    irrfPercent: integer("irrf_percent_bps").default(150).notNull(),
    inssPercent: integer("inss_percent_bps").default(0).notNull(),
    description: text("description").notNull(),
    status: text("status").$type<"active" | "inactive">().default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_services_org").on(table.organizationId),
  ]
);

export const invoices = pgTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    series: text("series").default("1").notNull(),
    type: text("type").$type<"NFS-e" | "NF-e" | "FATURA" | "RECIBO">().notNull(),
    status: text("status").$type<"draft" | "issued" | "paid" | "cancelled">().default("issued").notNull(),
    issueDate: date("issue_date").notNull(),
    competenceDate: date("competence_date").notNull(),
    operationNature: text("operation_nature").notNull(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    providerId: text("provider_id").references(() => providers.id),
    // Snapshots of issuer and customer without massive base64 image strings
    customerSnapshot: jsonb("customer_snapshot").notNull(),
    issuerSnapshot: jsonb("issuer_snapshot").notNull(),
    totalGrossCents: bigint("total_gross_cents", { mode: "number" }).notNull(),
    totalDiscountCents: bigint("total_discount_cents", { mode: "number" }).default(0).notNull(),
    totalWithheldCents: bigint("total_withheld_cents", { mode: "number" }).default(0).notNull(),
    totalNetCents: bigint("total_net_cents", { mode: "number" }).notNull(),
    taxSummary: jsonb("tax_summary").notNull(), // Detailed breakdown of all computed taxes
    fiscalNotes: text("fiscal_notes"),
    customNotes: text("custom_notes"),
    verificationCode: text("verification_code"),
    accessKey: text("access_key"),
    protocolNumber: text("protocol_number"),
    linkedTransactionId: text("linked_transaction_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_invoices_org").on(table.organizationId),
    index("idx_invoices_org_date").on(table.organizationId, table.issueDate),
    uniqueIndex("idx_invoices_org_num_type").on(table.organizationId, table.type, table.series, table.number),
  ]
);

export const invoiceItems = pgTable("invoice_items", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  type: text("type").$type<"service" | "product">().notNull(),
  catalogItemId: text("catalog_item_id"),
  description: text("description").notNull(),
  ncmOrServiceCode: text("ncm_or_service_code").notNull(),
  cfop: text("cfop"),
  quantity: integer("quantity").default(1).notNull(),
  unit: text("unit").default("UN").notNull(),
  unitPriceCents: bigint("unit_price_cents", { mode: "number" }).notNull(),
  discountCents: bigint("discount_cents", { mode: "number" }).default(0).notNull(),
  totalCents: bigint("total_cents", { mode: "number" }).notNull(),
  taxes: jsonb("taxes").notNull(),
});

export const invoicePaymentTerms = pgTable("invoice_payment_terms", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  installmentNumber: integer("installment_number").notNull(),
  dueDate: date("due_date").notNull(),
  amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
  paymentMethod: text("payment_method")
    .$type<"PIX" | "BOLETO" | "TRANSFER" | "CREDIT_CARD" | "DEBIT_CARD" | "CASH">()
    .default("PIX")
    .notNull(),
  status: text("status").$type<"pending" | "paid" | "overdue">().default("pending").notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  pixCopyPaste: text("pix_copy_paste"),
});

// 6. Period Locks (Fechamento Mensal) & Audit Logs
export const periodLocks = pgTable(
  "period_locks",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1 - 12
    lockedBy: text("locked_by").notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }).defaultNow().notNull(),
    notes: text("notes"),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.year, table.month] }),
  ]
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    actorId: text("actor_id").notNull(),
    actorEmail: text("actor_email").notNull(),
    action: text("action").notNull(), // 'create' | 'update' | 'delete' | 'sync' | 'import'
    entityType: text("entity_type").notNull(), // 'transaction' | 'invoice' | 'category' | 'period_lock'
    entityId: text("entity_id").notNull(),
    diffJson: jsonb("diff_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_audit_org_date").on(table.organizationId, table.createdAt),
  ]
);

// 7. Google Drive Connection Settings (AES-256 encrypted refresh token)
export const driveConnections = pgTable("drive_connections", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  encryptedRefreshToken: text("encrypted_refresh_token").notNull(),
  connectedEmail: text("connected_email").notNull(),
  defaultReceiptFolderId: text("default_receipt_folder_id"),
  defaultReceiptFolderName: text("default_receipt_folder_name"),
  excludedFolderNames: jsonb("excluded_folder_names").$type<string[]>().default([]).notNull(),
  excludedFolderIds: jsonb("excluded_folder_ids").$type<string[]>().default([]).notNull(),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
