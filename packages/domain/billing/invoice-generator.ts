// Visnora — Invoice Generation & Document Rendering Service
// Reference: docs/TECHNICAL_BLUEPRINT.md & M4.9 Invoice and Tax Management

import { prisma } from '../../database/src/client';
import { calculateTax } from './tax-service';

export interface CreateInvoiceParams {
  organizationId: string;
  subscriptionId?: string;
  subtotalPaise: number;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  customerName?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerGstin?: string;
  customerStateCode?: string;
  taxRatePercent?: number;
}

/**
 * Generates an immutable, sequential invoice number.
 * Format: VIS-YYYY-NNNNN
 */
export async function generateInvoiceNumber(sequence?: number): Promise<string> {
  const currentYear = new Date().getFullYear();
  let count = sequence;
  if (count === undefined) {
    try {
      count = (await prisma.invoice.count()) + 1;
    } catch {
      count = 1;
    }
  }
  const sequential = String(count).padStart(5, '0');
  return `VIS-${currentYear}-${sequential}`;
}

/**
 * Creates and stores an invoice in the database.
 */
export async function createInvoice(params: CreateInvoiceParams) {
  const {
    organizationId,
    subscriptionId,
    subtotalPaise,
    billingPeriodStart,
    billingPeriodEnd,
    customerName,
    customerEmail,
    customerAddress,
    customerGstin,
    customerStateCode,
    taxRatePercent = 18.0,
  } = params;

  const tax = calculateTax({
    subtotalPaise,
    customerStateCode,
    taxRatePercent,
  });

  const invoiceNumber = await generateInvoiceNumber();

  const invoice = await prisma.invoice.create({
    data: {
      organizationId,
      subscriptionId,
      invoiceNumber,
      billingPeriodStart,
      billingPeriodEnd,
      subtotalPaise: BigInt(tax.subtotalPaise),
      taxPaise: BigInt(tax.taxAmountPaise),
      totalPaise: BigInt(tax.totalAmountPaise),
      currency: 'INR',
      status: 'PAID',
      customerName,
      customerEmail,
      customerAddress,
      customerGstin,
      taxRatePercent,
    },
  });

  return invoice;
}

/**
 * Lists invoices belonging to an organization.
 */
export async function getOrganizationInvoices(organizationId: string) {
  const invoices = await prisma.invoice.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });

  return invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    billingPeriodStart: inv.billingPeriodStart,
    billingPeriodEnd: inv.billingPeriodEnd,
    subtotalPaise: Number(inv.subtotalPaise),
    taxPaise: Number(inv.taxPaise),
    totalPaise: Number(inv.totalPaise),
    currency: inv.currency,
    status: inv.status,
    createdAt: inv.createdAt,
    customerName: inv.customerName,
    customerGstin: inv.customerGstin,
  }));
}

/**
 * Retrieves a single invoice with tenant isolation verification.
 */
export async function getInvoiceById(organizationId: string, invoiceId: string) {
  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
  });

  if (!inv) return null;

  return {
    ...inv,
    subtotalPaise: Number(inv.subtotalPaise),
    taxPaise: Number(inv.taxPaise),
    totalPaise: Number(inv.totalPaise),
  };
}

/**
 * Renders a clean, print-ready HTML template for invoice download/PDF rendering.
 */
export function renderInvoiceHtml(invoice: any, organizationName = 'Visnora Client'): string {
  const subtotalInr = (invoice.subtotalPaise / 100).toFixed(2);
  const taxInr = (invoice.taxPaise / 100).toFixed(2);
  const totalInr = (invoice.totalPaise / 100).toFixed(2);
  const periodStart = new Date(invoice.billingPeriodStart).toLocaleDateString('en-IN');
  const periodEnd = new Date(invoice.billingPeriodEnd).toLocaleDateString('en-IN');
  const dateIssued = new Date(invoice.createdAt).toLocaleDateString('en-IN');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber} — Visnora</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #172033; background: #ffffff; padding: 40px; margin: 0; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #E2E8F0; padding-bottom: 24px; margin-bottom: 32px; }
    .logo { font-size: 24px; font-weight: 800; color: #2563EB; letter-spacing: -0.5px; }
    .invoice-title { font-size: 28px; font-weight: 700; color: #172033; margin: 0 0 4px 0; text-align: right; }
    .invoice-meta { font-size: 13px; color: #64748B; text-align: right; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 36px; font-size: 14px; }
    .section-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748B; margin-bottom: 8px; letter-spacing: 0.5px; }
    .party-name { font-weight: 700; font-size: 16px; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 36px; font-size: 14px; }
    th { text-align: left; padding: 12px 16px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; }
    td { padding: 16px; border-bottom: 1px solid #F1F5F9; }
    .totals { width: 320px; margin-left: auto; font-size: 14px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; color: #475569; }
    .totals-row.grand-total { border-top: 2px solid #172033; margin-top: 8px; padding-top: 12px; font-size: 18px; font-weight: 800; color: #172033; }
    .footer { margin-top: 60px; padding-top: 24px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 12px; color: #94A3B8; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; background: #DCFCE7; color: #166534; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Visnora</div>
      <div style="font-size: 13px; color: #64748B; margin-top: 4px;">AI Visibility & Intelligence SaaS</div>
    </div>
    <div>
      <h1 class="invoice-title">INVOICE</h1>
      <div class="invoice-meta">#${invoice.invoiceNumber}</div>
      <div class="invoice-meta">Date: ${dateIssued}</div>
      <div style="margin-top: 8px;"><span class="badge">${invoice.status}</span></div>
    </div>
  </div>

  <div class="parties">
    <div>
      <div class="section-label">Billed By</div>
      <div class="party-name">Visnora SaaS Technologies</div>
      <div style="color: #64748B; line-height: 1.5;">
        Bangalore, Karnataka, India<br>
        GSTIN: 29AABCV1234F1Z8<br>
        billing@visnora.com
      </div>
    </div>
    <div>
      <div class="section-label">Billed To</div>
      <div class="party-name">${invoice.customerName || organizationName}</div>
      <div style="color: #64748B; line-height: 1.5;">
        ${invoice.customerEmail ? invoice.customerEmail + '<br>' : ''}
        ${invoice.customerAddress ? invoice.customerAddress + '<br>' : ''}
        ${invoice.customerGstin ? 'GSTIN: ' + invoice.customerGstin : ''}
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Service Period</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <strong>Visnora AI Visibility Subscription</strong><br>
          <span style="font-size: 12px; color: #64748B;">Automated AI search prompt monitoring and visibility intelligence.</span>
        </td>
        <td>${periodStart} – ${periodEnd}</td>
        <td style="text-align: right; font-weight: 600;">₹${subtotalInr}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Subtotal:</span>
      <span>₹${subtotalInr}</span>
    </div>
    <div class="totals-row">
      <span>GST (${invoice.taxRatePercent}%):</span>
      <span>₹${taxInr}</span>
    </div>
    <div class="totals-row grand-total">
      <span>Total Paid:</span>
      <span>₹${totalInr}</span>
    </div>
  </div>

  <div class="footer">
    Thank you for building AI search visibility with Visnora. For billing support, contact support@visnora.com.
  </div>
</body>
</html>`;
}
