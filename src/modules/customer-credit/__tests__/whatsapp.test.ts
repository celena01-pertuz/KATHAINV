import { describe, expect, it } from 'vitest';
import { buildCustomerCreditReminderUrl } from '../whatsapp';

describe('buildCustomerCreditReminderUrl', () => {
  it('creates a manual WhatsApp reminder with a Colombian phone and formatted balance', () => {
    const url = buildCustomerCreditReminderUrl('573001234567', 'Ana', 12500);
    expect(url).toContain('https://wa.me/573001234567?text=');
    expect(decodeURIComponent(url ?? '')).toContain(
      'Hola Ana, te escribimos de Katha Store. Tu saldo pendiente es de $ 12.500.',
    );
  });

  it('rejects invalid phones and empty balances', () => {
    expect(buildCustomerCreditReminderUrl('3001234567', 'Ana', 1000)).toBeNull();
    expect(buildCustomerCreditReminderUrl('573001234567', 'Ana', 0)).toBeNull();
  });
});
