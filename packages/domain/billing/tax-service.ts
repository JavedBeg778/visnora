// Visnora — Configurable Tax & GST Calculation Engine
// Reference: docs/TECHNICAL_BLUEPRINT.md & M4.9 Invoice and Tax Management

export interface TaxCalculationParams {
  subtotalPaise: number; // integer minor units
  customerCountry?: string; // default 'IN'
  customerStateCode?: string; // e.g. 'KA', 'DL', 'MH'
  supplierStateCode?: string; // default 'KA' (Karnataka / Visnora base)
  taxRatePercent?: number; // default 18.0
}

export interface TaxCalculationResult {
  subtotalPaise: number;
  taxRatePercent: number;
  taxAmountPaise: number;
  totalAmountPaise: number;
  isGstApplicable: boolean;
  gstType: 'IGST' | 'CGST_SGST' | 'ZERO_RATED_EXPORT';
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
}

export const DEFAULT_SAAS_GST_RATE = 18.0; // 18% standard Indian GST for cloud software
export const DEFAULT_SUPPLIER_STATE = 'KA'; // Karnataka base

/**
 * Calculates tax breakdown in integer minor currency units (paise)
 * ensuring exact precision without floating-point drift.
 */
export function calculateTax(params: TaxCalculationParams): TaxCalculationResult {
  const {
    subtotalPaise,
    customerCountry = 'IN',
    customerStateCode,
    supplierStateCode = DEFAULT_SUPPLIER_STATE,
    taxRatePercent = DEFAULT_SAAS_GST_RATE,
  } = params;

  // International customers outside India are zero-rated export of services
  if (customerCountry !== 'IN') {
    return {
      subtotalPaise,
      taxRatePercent: 0,
      taxAmountPaise: 0,
      totalAmountPaise: subtotalPaise,
      isGstApplicable: false,
      gstType: 'ZERO_RATED_EXPORT',
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
    };
  }

  // Calculate tax amount in integer paise: (subtotal * rate) / 100 rounded to nearest integer
  const taxAmountPaise = Math.round((subtotalPaise * taxRatePercent) / 100);
  const totalAmountPaise = subtotalPaise + taxAmountPaise;

  // Intra-state vs Inter-state determination
  const isIntraState = customerStateCode && customerStateCode.toUpperCase() === supplierStateCode.toUpperCase();

  if (isIntraState) {
    // 9% CGST + 9% SGST
    const cgstPaise = Math.round(taxAmountPaise / 2);
    const sgstPaise = taxAmountPaise - cgstPaise; // Exact remainder preservation

    return {
      subtotalPaise,
      taxRatePercent,
      taxAmountPaise,
      totalAmountPaise,
      isGstApplicable: true,
      gstType: 'CGST_SGST',
      cgstPaise,
      sgstPaise,
      igstPaise: 0,
    };
  }

  // Inter-state: 18% IGST
  return {
    subtotalPaise,
    taxRatePercent,
    taxAmountPaise,
    totalAmountPaise,
    isGstApplicable: true,
    gstType: 'IGST',
    cgstPaise: 0,
    sgstPaise: 0,
    igstPaise: taxAmountPaise,
  };
}

