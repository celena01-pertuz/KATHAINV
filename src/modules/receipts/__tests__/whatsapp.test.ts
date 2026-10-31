import { describe, expect, it } from 'vitest';
import { STORE_NAME } from '@/config/store';
import { buildWhatsAppUrl } from '../whatsapp';

describe('enlace de WhatsApp para comprobantes', () => {
  it('codifica un mensaje amable con la tienda, venta y enlace', () => {
    const url = buildWhatsAppUrl('573001112233', 'V-000014', 'https://katha.test/receipt/token');

    expect(url).not.toBeNull();
    const parsedUrl = new URL(url!);
    expect(parsedUrl.origin + parsedUrl.pathname).toBe('https://wa.me/573001112233');
    expect(parsedUrl.searchParams.get('text')).toBe(
      `¡Hola! Gracias por tu compra en ${STORE_NAME}. Tu comprobante de la venta V-000014 está disponible aquí: https://katha.test/receipt/token`,
    );
  });

  it('no construye WhatsApp para teléfonos que no tengan el formato colombiano guardado', () => {
    expect(buildWhatsAppUrl('3001112233', 'V-1', 'https://katha.test/receipt/token')).toBeNull();
    expect(buildWhatsAppUrl(null, 'V-1', 'https://katha.test/receipt/token')).toBeNull();
  });
});
