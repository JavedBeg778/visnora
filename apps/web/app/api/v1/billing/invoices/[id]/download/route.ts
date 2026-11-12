// GET /api/v1/billing/invoices/[id]/download
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-handler';
import { prisma } from '@/database/src/client';
import { getInvoiceById, renderInvoiceHtml } from '@/domain/billing/invoice-generator';
import { generateInvoicePdfBuffer } from '@/domain/billing/pdf-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const inv = await prisma.invoice.findUnique({ where: { id } });

    if (!inv) {
      return new NextResponse('Invoice not found', { status: 404 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId: inv.organizationId,
        userId: user.id,
      },
    });

    if (!membership) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const invoice = await getInvoiceById(inv.organizationId, id);
    if (!invoice) {
      return new NextResponse('Invoice not found', { status: 404 });
    }

    const url = new URL(request.url);
    const format = url.searchParams.get('format')?.toLowerCase();

    if (format === 'html') {
      const html = renderInvoiceHtml(invoice);
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `inline; filename="visnora-invoice-${invoice.invoiceNumber}.html"`,
        },
      });
    }

    // Default to binary PDF download
    const pdfBuffer = generateInvoicePdfBuffer(invoice);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="visnora-invoice-${invoice.invoiceNumber}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (err: any) {
    return new NextResponse(err?.message || 'Internal server error', { status: 500 });
  }
}
