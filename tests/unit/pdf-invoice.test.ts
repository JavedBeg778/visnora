import { describe, it, expect } from 'vitest';
import { generateInvoicePdfBuffer } from '../../packages/domain/billing/pdf-generator';

describe('PDF Invoice Generator', () => {
  it('generates a valid, compliant PDF binary buffer', () => {
    const mockInvoice = {
      invoiceNumber: 'VIS-2026-00042',
      subtotalPaise: 499900,
      taxPaise: 89982,
      totalPaise: 589882,
      billingPeriodStart: new Date('2026-11-01'),
      billingPeriodEnd: new Date('2026-11-30'),
      createdAt: new Date('2026-11-12'),
      status: 'PAID',
      customerName: 'Zomato Media Private Limited',
      customerEmail: 'finance@zomato.com',
      customerGstin: '07AABCZ1234F1Z8',
      customerStateCode: 'Delhi (07)',
    };

    const pdfBuffer = generateInvoicePdfBuffer(mockInvoice);

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(500);

    const pdfString = pdfBuffer.toString('utf8');

    // Standard PDF 1.4 header
    expect(pdfString.startsWith('%PDF-1.4')).toBe(true);

    // Standard PDF structure
    expect(pdfString).toContain('/Type /Catalog');
    expect(pdfString).toContain('/Type /Pages');
    expect(pdfString).toContain('/Type /Page');
    expect(pdfString).toContain('VIS-2026-00042');
    expect(pdfString).toContain('Zomato Media Private Limited');
    expect(pdfString).toContain('PAID');
    expect(pdfString).toContain('xref');
    expect(pdfString).toContain('trailer');
    expect(pdfString.trimEnd().endsWith('%%EOF')).toBe(true);
  });
});

