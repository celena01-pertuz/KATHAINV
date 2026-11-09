import { describe, expect, it } from 'vitest';
import { createCustomerCreditPaymentSchema, voidCustomerCreditPaymentSchema } from '../schemas';

describe('validación de abonos', () => {
  it('acepta solo monto entero positivo y una clave idempotente', () => {
    const validPayment = {
      customerId: 'customer_1',
      amount: 1000,
      paymentMethod: 'efectivo',
      requestKey: '9c77dcc1-6f9c-4581-8cde-7c75d5bc9908',
    };
    expect(createCustomerCreditPaymentSchema.safeParse(validPayment).success).toBe(true);
    expect(
      createCustomerCreditPaymentSchema.safeParse({ ...validPayment, amount: 0 }).success,
    ).toBe(false);
    expect(
      createCustomerCreditPaymentSchema.safeParse({ ...validPayment, amount: 1000.5 }).success,
    ).toBe(false);
  });

  it('exige motivo de anulación', () => {
    expect(
      voidCustomerCreditPaymentSchema.safeParse({ paymentId: 3, reason: 'Error al registrar' })
        .success,
    ).toBe(true);
    expect(voidCustomerCreditPaymentSchema.safeParse({ paymentId: 3, reason: '  ' }).success).toBe(
      false,
    );
  });
});
