import { NextResponse } from 'next/server';
import { authorizeReceiptRequest } from '../access';
import { saleIdSchema } from '@/modules/receipts/schemas';
import { revokeReceiptLinks } from '@/modules/receipts/service';

interface RouteContext {
  params: Promise<{ saleId: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authorization = await authorizeReceiptRequest();
  if (authorization.response) return authorization.response;

  const params = await context.params;
  const saleId = saleIdSchema.safeParse(params.saleId);
  if (!saleId.success) {
    return NextResponse.json(
      { success: false, error: 'La venta indicada no es válida.' },
      { status: 400 },
    );
  }

  try {
    const revokedCount = await revokeReceiptLinks(saleId.data, authorization.email);
    return NextResponse.json({
      success: true,
      data: { revoked: revokedCount > 0 },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'No se pudo revocar el enlace del comprobante.' },
      { status: 500 },
    );
  }
}
