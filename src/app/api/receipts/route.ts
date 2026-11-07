import { NextRequest, NextResponse } from 'next/server';
import { authorizeReceiptRequest } from './access';
import { createReceiptLinkSchema } from '@/modules/receipts/schemas';
import { createReceiptLink } from '@/modules/receipts/service';

export async function POST(request: NextRequest) {
  const authorization = await authorizeReceiptRequest();
  if (authorization.response) return authorization.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'La solicitud no tiene un formato válido.' },
      { status: 400 },
    );
  }

  const parsed = createReceiptLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'La venta indicada no es válida.' },
      { status: 400 },
    );
  }

  try {
    const url = await createReceiptLink(
      parsed.data.saleId,
      authorization.email,
      request.nextUrl.origin,
    );
    return NextResponse.json({ success: true, data: { url } }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: 'No se pudo crear el enlace del comprobante.' },
      { status: 500 },
    );
  }
}
