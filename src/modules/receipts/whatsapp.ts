import { STORE_NAME } from '@/config/store';

export function buildWhatsAppUrl(
  phone: string | null | undefined,
  saleNumber: string,
  receiptUrl: string,
): string | null {
  if (!phone || !/^57\d{10}$/.test(phone)) return null;

  const message = `¡Hola! Gracias por tu compra en ${STORE_NAME}. Tu comprobante de la venta ${saleNumber} está disponible aquí: ${receiptUrl}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
