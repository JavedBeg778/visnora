// Pure Node.js standard PDF 1.4 generator for Visnora Invoices

function escapePdfText(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function generateInvoicePdfBuffer(invoice: any, organizationName = 'Visnora Client'): Buffer {
  const subtotalInr = (Number(invoice.subtotalPaise || 0) / 100).toFixed(2);
  const taxInr = (Number(invoice.taxPaise || 0) / 100).toFixed(2);
  const totalInr = (Number(invoice.totalPaise || 0) / 100).toFixed(2);
  const periodStart = invoice.billingPeriodStart ? new Date(invoice.billingPeriodStart).toLocaleDateString('en-IN') : 'N/A';
  const periodEnd = invoice.billingPeriodEnd ? new Date(invoice.billingPeriodEnd).toLocaleDateString('en-IN') : 'N/A';
  const dateIssued = invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
  const invNumber = invoice.invoiceNumber || 'VIS-2026-00001';
  const customerName = invoice.customerName || organizationName;
  const customerEmail = invoice.customerEmail || 'billing@customer.com';
  const customerGstin = invoice.customerGstin ? `GSTIN: ${invoice.customerGstin}` : 'Consumer / Unregistered';

  // Construct PDF content stream (coordinates: 0,0 at bottom-left, page is 595 x 842 pt A4)
  const streamCommands: string[] = [];

  // Background header band (Dark Blue / Slate #0F172A)
  streamCommands.push('0.06 0.09 0.16 rg'); // #0F172A
  streamCommands.push('40 730 515 72 re f');

  // Visnora Title in Header
  streamCommands.push('BT');
  streamCommands.push('/F1 22 Tf');
  streamCommands.push('1 1 1 rg'); // White text
  streamCommands.push('60 762 Td');
  streamCommands.push(`(${escapePdfText('VISNORA')}) Tj`);
  streamCommands.push('ET');

  streamCommands.push('BT');
  streamCommands.push('/F2 10 Tf');
  streamCommands.push('0.8 0.85 0.95 rg');
  streamCommands.push('60 745 Td');
  streamCommands.push(`(${escapePdfText('AI Visibility & Marketing Intelligence SaaS')}) Tj`);
  streamCommands.push('ET');

  // INVOICE text top right
  streamCommands.push('BT');
  streamCommands.push('/F1 18 Tf');
  streamCommands.push('1 1 1 rg');
  streamCommands.push('430 758 Td');
  streamCommands.push(`(${escapePdfText('TAX INVOICE')}) Tj`);
  streamCommands.push('ET');

  // Status Badge (PAID - Green)
  streamCommands.push('0.13 0.65 0.35 rg'); // Green
  streamCommands.push('430 738 75 16 re f');
  streamCommands.push('BT');
  streamCommands.push('/F1 9 Tf');
  streamCommands.push('1 1 1 rg');
  streamCommands.push('448 743 Td');
  streamCommands.push(`(${escapePdfText(invoice.status || 'PAID')}) Tj`);
  streamCommands.push('ET');

  // Details Meta Box (Left: Billed To, Right: Invoice Meta)
  // Left: Customer details
  streamCommands.push('BT');
  streamCommands.push('/F1 11 Tf');
  streamCommands.push('0.15 0.2 0.3 rg');
  streamCommands.push('40 690 Td');
  streamCommands.push(`(${escapePdfText('BILLED TO:')}) Tj`);
  streamCommands.push('ET');

  streamCommands.push('BT');
  streamCommands.push('/F2 10 Tf');
  streamCommands.push('0.2 0.25 0.35 rg');
  streamCommands.push('40 672 Td');
  streamCommands.push(`(${escapePdfText(customerName)}) Tj`);
  streamCommands.push('T*');
  streamCommands.push(`(${escapePdfText(customerEmail)}) Tj`);
  streamCommands.push('T*');
  streamCommands.push(`(${escapePdfText(customerGstin)}) Tj`);
  streamCommands.push('ET');

  // Right: Invoice Meta
  streamCommands.push('BT');
  streamCommands.push('/F1 10 Tf');
  streamCommands.push('0.15 0.2 0.3 rg');
  streamCommands.push('360 690 Td');
  streamCommands.push(`(${escapePdfText('Invoice No: ' + invNumber)}) Tj`);
  streamCommands.push('T*');
  streamCommands.push('/F2 10 Tf');
  streamCommands.push('0.2 0.25 0.35 rg');
  streamCommands.push(`(${escapePdfText('Issue Date: ' + dateIssued)}) Tj`);
  streamCommands.push('T*');
  streamCommands.push(`(${escapePdfText('Billing Period: ' + periodStart + ' - ' + periodEnd)}) Tj`);
  streamCommands.push('T*');
  streamCommands.push(`(${escapePdfText('Place of Supply: ' + (invoice.customerStateCode || 'Karnataka (29)'))}) Tj`);
  streamCommands.push('ET');

  // Table Header
  streamCommands.push('0.94 0.96 0.98 rg'); // Light slate table header
  streamCommands.push('40 600 515 24 re f');
  streamCommands.push('0.85 0.88 0.92 RG'); // Border
  streamCommands.push('0.75 w');
  streamCommands.push('40 600 515 24 re S');

  streamCommands.push('BT');
  streamCommands.push('/F1 9 Tf');
  streamCommands.push('0.15 0.2 0.3 rg');
  streamCommands.push('50 608 Td');
  streamCommands.push(`(${escapePdfText('DESCRIPTION')}) Tj`);
  streamCommands.push('260 0 Td');
  streamCommands.push(`(${escapePdfText('PERIOD')}) Tj`);
  streamCommands.push('140 0 Td');
  streamCommands.push(`(${escapePdfText('AMOUNT (INR)')}) Tj`);
  streamCommands.push('ET');

  // Table Row 1
  streamCommands.push('BT');
  streamCommands.push('/F1 10 Tf');
  streamCommands.push('0.15 0.2 0.3 rg');
  streamCommands.push('50 575 Td');
  streamCommands.push(`(${escapePdfText('Visnora SaaS Subscription')}) Tj`);
  streamCommands.push('ET');

  streamCommands.push('BT');
  streamCommands.push('/F2 9 Tf');
  streamCommands.push('0.4 0.45 0.55 rg');
  streamCommands.push('50 560 Td');
  streamCommands.push(`(${escapePdfText('Full AI Visibility & Competitor Ad Intelligence')}) Tj`);
  streamCommands.push('ET');

  streamCommands.push('BT');
  streamCommands.push('/F2 9 Tf');
  streamCommands.push('0.2 0.25 0.35 rg');
  streamCommands.push('310 575 Td');
  streamCommands.push(`(${escapePdfText(periodStart + ' - ' + periodEnd)}) Tj`);
  streamCommands.push('ET');

  streamCommands.push('BT');
  streamCommands.push('/F1 10 Tf');
  streamCommands.push('0.15 0.2 0.3 rg');
  streamCommands.push('460 575 Td');
  streamCommands.push(`(${escapePdfText('INR ' + subtotalInr)}) Tj`);
  streamCommands.push('ET');

  // Divider line
  streamCommands.push('0.85 0.88 0.92 RG');
  streamCommands.push('40 545 m 555 545 l S');

  // Summary Table (Right aligned)
  const summaryX = 330;
  streamCommands.push('BT');
  streamCommands.push('/F2 10 Tf');
  streamCommands.push('0.3 0.35 0.45 rg');
  streamCommands.push(`${summaryX} 520 Td`);
  streamCommands.push(`(${escapePdfText('Subtotal:')}) Tj`);
  streamCommands.push('T*');
  streamCommands.push(`(${escapePdfText('GST (18%):')}) Tj`);
  streamCommands.push('ET');

  streamCommands.push('BT');
  streamCommands.push('/F2 10 Tf');
  streamCommands.push('0.15 0.2 0.3 rg');
  streamCommands.push(`470 520 Td`);
  streamCommands.push(`(${escapePdfText('INR ' + subtotalInr)}) Tj`);
  streamCommands.push('T*');
  streamCommands.push(`(${escapePdfText('INR ' + taxInr)}) Tj`);
  streamCommands.push('ET');

  // Total Row Highlight
  streamCommands.push('0.94 0.96 0.98 rg');
  streamCommands.push(`${summaryX - 10} 468 235 26 re f`);
  streamCommands.push('0.85 0.88 0.92 RG');
  streamCommands.push(`${summaryX - 10} 468 235 26 re S`);

  streamCommands.push('BT');
  streamCommands.push('/F1 11 Tf');
  streamCommands.push('0.09 0.38 0.92 rg'); // Brand Blue
  streamCommands.push(`${summaryX} 477 Td`);
  streamCommands.push(`(${escapePdfText('Total Paid:')}) Tj`);
  streamCommands.push('ET');

  streamCommands.push('BT');
  streamCommands.push('/F1 12 Tf');
  streamCommands.push('0.09 0.38 0.92 rg');
  streamCommands.push(`460 477 Td`);
  streamCommands.push(`(${escapePdfText('INR ' + totalInr)}) Tj`);
  streamCommands.push('ET');

  // Footer notes & tax compliance declaration
  streamCommands.push('BT');
  streamCommands.push('/F1 9 Tf');
  streamCommands.push('0.2 0.25 0.35 rg');
  streamCommands.push('40 380 Td');
  streamCommands.push(`(${escapePdfText('Tax Information & Declarations:')}) Tj`);
  streamCommands.push('ET');

  streamCommands.push('BT');
  streamCommands.push('/F2 8 Tf');
  streamCommands.push('0.4 0.45 0.55 rg');
  streamCommands.push('40 365 Td');
  streamCommands.push(`(${escapePdfText('This is a computer-generated tax invoice and requires no physical signature.')}) Tj`);
  streamCommands.push('T*');
  streamCommands.push(`(${escapePdfText('Visnora Technologies Private Limited â€¢ GSTIN: 29AABCU9603R1ZM â€¢ SAC Code: 998313 (IT Software Hosting & SaaS Services)')}) Tj`);
  streamCommands.push('T*');
  streamCommands.push(`(${escapePdfText('Registered Address: Koramangala 4th Block, Bengaluru, Karnataka 560034, India')}) Tj`);
  streamCommands.push('T*');
  streamCommands.push(`(${escapePdfText('For billing questions or corporate invoicing support, contact: billing@visnora.com')}) Tj`);
  streamCommands.push('ET');

  const contentStream = streamCommands.join('\n');
  const streamLength = Buffer.byteLength(contentStream, 'utf8');

  // Build the complete PDF document
  const objects: string[] = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objects.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n');
  objects.push(`4 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`);
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');
  objects.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

  let output = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const xrefOffsets: number[] = [];
  xrefOffsets.push(0);

  for (let i = 0; i < objects.length; i++) {
    xrefOffsets.push(Buffer.byteLength(output, 'utf8'));
    output += objects[i];
  }

  const xrefStart = Buffer.byteLength(output, 'utf8');
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    const offsetStr = String(xrefOffsets[i]).padStart(10, '0');
    output += `${offsetStr} 00000 n \n`;
  }

  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(output, 'utf8');
}

