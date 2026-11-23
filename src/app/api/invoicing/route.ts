import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, assertCanMutate } from "@/lib/auth";
import { db } from "@/db";
import {
  invoices,
  invoiceItems,
  invoicePaymentTerms,
  companySettings,
  customers,
  providers,
  products,
  services,
  transactions,
  categories,
} from "@/db/schema";
import {
  calculateInvoiceTaxes,
  generatePixCopiaECola,
  generateNfeAccessKey,
} from "@/lib/brazilianFiscal";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope"); // 'all' | 'invoices_only' | 'catalogs_only'

    const settings = await db.query.companySettings.findFirst({
      where: eq(companySettings.organizationId, auth.organizationId),
    });

    const custList = await db.query.customers.findMany({
      where: eq(customers.organizationId, auth.organizationId),
      orderBy: (c, { asc }) => [asc(c.name)],
    });

    const provList = await db.query.providers.findMany({
      where: eq(providers.organizationId, auth.organizationId),
      orderBy: (p, { asc }) => [asc(p.name)],
    });

    const prodList = await db.query.products.findMany({
      where: eq(products.organizationId, auth.organizationId),
      orderBy: (p, { asc }) => [asc(p.name)],
    });

    const servList = await db.query.services.findMany({
      where: eq(services.organizationId, auth.organizationId),
      orderBy: (s, { asc }) => [asc(s.name)],
    });

    const invList = await db.query.invoices.findMany({
      where: eq(invoices.organizationId, auth.organizationId),
      orderBy: (i, { desc }) => [desc(i.issueDate), desc(i.createdAt)],
      with: {
        // We can fetch items or payment terms
      },
    });

    return NextResponse.json({
      success: true,
      companySettings: settings,
      customers: custList,
      providers: provList,
      products: prodList,
      services: servList,
      invoices: invList,
      isAccountant: auth.isAccountant,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch invoicing data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    assertCanMutate(auth);

    const body = await req.json();
    const { action } = body;

    // ACTION 1: Issue / Save Invoice
    if (action === "save_invoice") {
      const {
        type = "NFS-e",
        series = "1",
        number,
        issueDate,
        competenceDate,
        operationNature,
        customerId,
        status = "issued",
        items = [],
        installmentsCount = 1,
        paymentMethod = "PIX",
        fiscalNotes,
        customNotes,
      } = body;

      const customer = await db.query.customers.findFirst({
        where: and(eq(customers.id, customerId), eq(customers.organizationId, auth.organizationId)),
      });

      if (!customer) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }

      const settings = await db.query.companySettings.findFirst({
        where: eq(companySettings.organizationId, auth.organizationId),
      });

      if (!settings) {
        return NextResponse.json({ error: "Company settings not configured" }, { status: 400 });
      }

      // Calculate taxes & totals accurately
      const taxCalc = calculateInvoiceTaxes(
        items.map((it: any) => ({
          type: it.type || "service",
          unitPriceCents: it.unitPriceCents,
          quantity: it.quantity || 1,
          discountCents: it.discountCents || 0,
          issBps: it.issBps,
          issWithheld: it.issWithheld,
          pisBps: it.pisBps,
          cofinsBps: it.cofinsBps,
          csllBps: it.csllBps,
          irrfBps: it.irrfBps,
          inssBps: it.inssBps,
          icmsBps: it.icmsBps,
          ipiBps: it.ipiBps,
        }))
      );

      const invNumber = number ? String(number) : String(settings.nextNfNumber || 101).padStart(6, "0");

      // Generate access key or verification code
      const accessKey =
        type === "NF-e"
          ? generateNfeAccessKey({
              uf: settings.state,
              issueDate,
              cnpj: settings.cnpj,
              invoiceNumber: parseInt(invNumber, 10) || 101,
              series,
            })
          : undefined;

      const verificationCode =
        type === "NFS-e"
          ? `${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${settings.state}`
          : undefined;

      const invoiceId = `inv-${Date.now()}`;

      // Insert Invoice
      await db.insert(invoices).values({
        id: invoiceId,
        organizationId: auth.organizationId,
        number: invNumber,
        series,
        type,
        status,
        issueDate: issueDate || new Date().toISOString().split("T")[0],
        competenceDate: competenceDate || issueDate || new Date().toISOString().split("T")[0],
        operationNature: operationNature || "Prestação de Serviços no País",
        customerId,
        customerSnapshot: {
          name: customer.name,
          tradeName: customer.tradeName,
          document: customer.document,
          personType: customer.personType,
          email: customer.email,
          phone: customer.phone,
          street: customer.street,
          number: customer.number,
          city: customer.city,
          state: customer.state,
          zipCode: customer.zipCode,
        },
        issuerSnapshot: {
          legalName: settings.legalName,
          tradeName: settings.tradeName,
          cnpj: settings.cnpj,
          municipalRegistration: settings.municipalRegistration,
          stateRegistration: settings.stateRegistration,
          taxRegime: settings.taxRegime,
          city: settings.city,
          state: settings.state,
          street: settings.street,
          number: settings.number,
          zipCode: settings.zipCode,
          phone: settings.phone,
          email: settings.email,
          bankName: settings.bankName,
          pixKey: settings.pixKey,
        },
        totalGrossCents: taxCalc.totalGrossCents,
        totalDiscountCents: taxCalc.totalDiscountCents,
        totalWithheldCents: taxCalc.totalTaxesWithheldCents,
        totalNetCents: taxCalc.totalNetCents,
        taxSummary: taxCalc as any,
        fiscalNotes: fiscalNotes || "Documento emitido por ME ou EPP optante pelo Simples Nacional.",
        customNotes,
        verificationCode,
        accessKey,
      });

      // Insert Items
      for (const it of items) {
        await db.insert(invoiceItems).values({
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          invoiceId,
          type: it.type || "service",
          catalogItemId: it.catalogItemId || null,
          description: it.description || "Service item",
          ncmOrServiceCode: it.ncmOrServiceCode || "01.07",
          cfop: it.cfop || null,
          quantity: it.quantity || 1,
          unit: it.unit || "UN",
          unitPriceCents: it.unitPriceCents,
          discountCents: it.discountCents || 0,
          totalCents: it.unitPriceCents * (it.quantity || 1) - (it.discountCents || 0),
          taxes: it.taxes || {},
        });
      }

      // Generate PIX Payment Terms
      const installmentAmt = Math.round(taxCalc.totalNetCents / installmentsCount);
      for (let i = 1; i <= installmentsCount; i++) {
        let pixString = undefined;
        if (settings.pixKey) {
          pixString = generatePixCopiaECola({
            pixKey: settings.pixKey,
            merchantName: settings.tradeName || settings.legalName,
            merchantCity: settings.city,
            amountCents: installmentAmt,
            txId: `NF${invNumber.replace(/\D/g, "")}P${i}`,
          });
        }

        await db.insert(invoicePaymentTerms).values({
          id: `term-${Date.now()}-${i}`,
          invoiceId,
          installmentNumber: i,
          dueDate: issueDate,
          amountCents: i === installmentsCount ? taxCalc.totalNetCents - installmentAmt * (installmentsCount - 1) : installmentAmt,
          paymentMethod,
          status: status === "paid" ? "paid" : "pending",
          pixCopyPaste: pixString,
        });
      }

      // Auto-increment next invoice number
      await db
        .update(companySettings)
        .set({ nextNfNumber: (settings.nextNfNumber || 101) + 1 })
        .where(eq(companySettings.organizationId, auth.organizationId));

      return NextResponse.json({ success: true, id: invoiceId, number: invNumber });
    }

    // ACTION 2: Sync Issued Invoice into Transactions Ledger
    if (action === "sync_to_ledger") {
      const { invoiceId } = body;
      const invoice = await db.query.invoices.findFirst({
        where: and(eq(invoices.id, invoiceId), eq(invoices.organizationId, auth.organizationId)),
      });

      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }

      const txId = invoice.linkedTransactionId || `tx-inv-${invoice.id}`;

      // Check if revenue category exists
      let revCat = await db.query.categories.findFirst({
        where: and(eq(categories.organizationId, auth.organizationId), eq(categories.name, "Revenue")),
      });

      const custSnap: any = invoice.customerSnapshot;
      const txDesc = `${invoice.type} Nº ${invoice.number} - ${custSnap.name}`;

      if (invoice.linkedTransactionId) {
        // Update existing transaction
        await db
          .update(transactions)
          .set({
            txDate: invoice.issueDate,
            merchant: custSnap.name,
            description: txDesc,
            amountCents: invoice.totalNetCents,
            status: invoice.status === "paid" ? "Cleared" : "Pending",
            updatedAt: new Date(),
          })
          .where(eq(transactions.id, invoice.linkedTransactionId));
      } else {
        // Insert new revenue transaction
        await db.insert(transactions).values({
          id: txId,
          organizationId: auth.organizationId,
          txDate: invoice.issueDate,
          merchant: custSnap.name,
          description: txDesc,
          amountCents: invoice.totalNetCents, // Positive credit
          type: "credit",
          status: invoice.status === "paid" ? "Cleared" : "Pending",
          accountName: "Conta Corrente",
          categoryId: revCat?.id || null,
          linkedInvoiceId: invoice.id,
          notes: `Documento Fiscal ${invoice.type} Nº ${invoice.number}. Chave: ${invoice.accessKey || invoice.verificationCode || "Autorizada"} | Tomador: ${custSnap.name}`,
          createdBy: auth.email,
        });

        // Link back to invoice
        await db
          .update(invoices)
          .set({ linkedTransactionId: txId, updatedAt: new Date() })
          .where(eq(invoices.id, invoice.id));
      }

      return NextResponse.json({ success: true, transactionId: txId });
    }

    // ACTION 3: Create Customer
    if (action === "save_customer") {
      const { name, tradeName, document, email, phone, street, number, neighborhood, city, state, zipCode, personType = "PJ" } = body;
      const custId = `cust-${Date.now()}`;
      await db.insert(customers).values({
        id: custId,
        organizationId: auth.organizationId,
        name: name.trim(),
        tradeName,
        document: document.trim(),
        email: email || "",
        phone: phone || "",
        street: street || "",
        number: number || "",
        neighborhood: neighborhood || "",
        city: city || "São Paulo",
        state: state || "SP",
        zipCode: zipCode || "",
        personType,
      });
      return NextResponse.json({ success: true, id: custId });
    }

    // ACTION 4: Update Company Settings
    if (action === "update_company_settings") {
      const { legalName, tradeName, cnpj, stateRegistration, municipalRegistration, email, phone, street, number, neighborhood, city, state, zipCode, bankName, pixKey, pixKeyType, defaultNfSeries, nextNfNumber } = body;

      await db
        .update(companySettings)
        .set({
          legalName,
          tradeName,
          cnpj,
          stateRegistration,
          municipalRegistration,
          email,
          phone,
          street,
          number,
          neighborhood,
          city,
          state,
          zipCode,
          bankName,
          pixKey,
          pixKeyType,
          defaultNfSeries,
          nextNfNumber: Number(nextNfNumber) || 101,
          updatedAt: new Date(),
        })
        .where(eq(companySettings.organizationId, auth.organizationId));

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Invoicing POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to process invoice action" }, { status: 500 });
  }
}
