import { describe, it, expect } from 'vitest';
import { calculateTax } from '../../packages/domain/billing/tax-service';
import {
  generateInvoiceNumber,
  renderInvoiceHtml,
} from '../../packages/domain/billing/invoice-generator';

describe('M4.5 GST Tax Calculations & Invoice Generation', () => {
  describe('calculateTax()', () => {
    it('calculates 9% CGST and 9% SGST for intra-state transactions', () => {
      // Intra-state (Karnataka to Karnataka, state code KA)
      const result = calculateTax({
        subtotalPaise: 149900, // ₹1,499
        customerCountry: 'IN',
        customerStateCode: 'KA',
        supplierStateCode: 'KA',
      });

      expect(result.subtotalPaise).toBe(149900);
      expect(result.taxRatePercent).toBe(18);
      // 9% CGST = 13491, 9% SGST = 13491, total tax = 26982
      expect(result.cgstPaise).toBe(13491);
      expect(result.sgstPaise).toBe(13491);
      expect(result.igstPaise).toBe(0);
      expect(result.taxAmountPaise).toBe(26982);
      expect(result.totalAmountPaise).toBe(149900 + 26982);
    });

    it('calculates 18% IGST for inter-state transactions', () => {
      // Inter-state (Karnataka supplier KA to Maharashtra customer MH)
      const result = calculateTax({
        subtotalPaise: 399900, // ₹3,999
        customerCountry: 'IN',
        customerStateCode: 'MH',
        supplierStateCode: 'KA',
      });

      expect(result.subtotalPaise).toBe(399900);
      expect(result.taxRatePercent).toBe(18);
      // 18% IGST = 71982
      expect(result.cgstPaise).toBe(0);
      expect(result.sgstPaise).toBe(0);
      expect(result.igstPaise).toBe(71982);
      expect(result.taxAmountPaise).toBe(71982);
      expect(result.totalAmountPaise).toBe(399900 + 71982);
    });

    it('applies zero-rated export tax (0%) for non-Indian international customers', () => {
      const result = calculateTax({
        subtotalPaise: 999900, // ₹9,999
        customerCountry: 'US',
      });

      expect(result.subtotalPaise).toBe(999900);
      expect(result.taxRatePercent).toBe(0);
      expect(result.cgstPaise).toBe(0);
      expect(result.sgstPaise).toBe(0);
      expect(result.igstPaise).toBe(0);
      expect(result.taxAmountPaise).toBe(0);
      expect(result.totalAmountPaise).toBe(999900);
    });

    it('handles zero amount gracefully', () => {
      const result = calculateTax({ subtotalPaise: 0 });
      expect(result.subtotalPaise).toBe(0);
      expect(result.taxAmountPaise).toBe(0);
      expect(result.totalAmountPaise).toBe(0);
    });
  });

  describe('generateInvoiceNumber()', () => {
    it('generates standard sequential invoice numbers with year and 5-digit sequence', async () => {
      const currentYear = new Date().getFullYear();
      const inv1 = await generateInvoiceNumber(1);
      const inv42 = await generateInvoiceNumber(42);
      const inv9999 = await generateInvoiceNumber(9999);

      expect(inv1).toBe(`VIS-${currentYear}-00001`);
      expect(inv42).toBe(`VIS-${currentYear}-00042`);
      expect(inv9999).toBe(`VIS-${currentYear}-09999`);
    });
  });

  describe('renderInvoiceHtml()', () => {
    it('renders valid, self-contained HTML invoice with tax breakdown and line items', () => {
      const mockInvoice: any = {
        id: 'mock-inv-id',
        invoiceNumber: 'VIS-2026-00001',
        customerName: 'Acme Test Corp',
        customerEmail: 'billing@acme.com',
        customerAddress: '123 Tech Park, Bengaluru, KA',
        customerGstin: '29ABCDE1234F1Z5',
        currency: 'INR',
        subtotalPaise: 149900,
        taxPaise: 26982,
        totalPaise: 176882,
        taxRatePercent: 18,
        status: 'PAID',
        periodStart: new Date('2026-11-01'),
        periodEnd: new Date('2026-12-01'),
        createdAt: new Date('2026-11-12'),
      };

      const html = renderInvoiceHtml(mockInvoice);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('VIS-2026-00001');
      expect(html).toContain('Acme Test Corp');
      expect(html).toContain('billing@acme.com');
      expect(html).toContain('29ABCDE1234F1Z5');
      expect(html).toContain('Visnora AI Visibility Subscription');
      expect(html).toContain('₹1499.00'); // Subtotal
      expect(html).toContain('₹269.82');   // 18% Tax
      expect(html).toContain('₹1768.82'); // Total
      expect(html).toContain('PAID');
    });
  });
});
