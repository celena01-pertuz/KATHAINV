import { describe, expect, it } from 'vitest';
import { SalesOperationError } from '../errors';
import { resolveSalePayment } from '../payment-terms';

describe('mapeo de formas de pago', () => {
  it('mapea paga hoy cero a crédito', () => {
    expect(
      resolveSalePayment(
        { paymentType: 'credit', initialPayment: 0, paymentMethod: null },
        'customer_1',
        25000,
      ),
    ).toMatchObject({ paymentType: 'credit', initialPayment: 0 });
  });

  it('mapea un pago menor que el total al tipo interno partial', () => {
    expect(
      resolveSalePayment(
        { paymentType: 'credit', initialPayment: 5000, paymentMethod: 'efectivo' },
        'customer_1',
        25000,
      ),
    ).toMatchObject({ paymentType: 'partial', initialPayment: 5000 });
  });

  it('mapea el pago igual al total a contado y rechaza el exceso', () => {
    expect(
      resolveSalePayment(
        { paymentType: 'credit', initialPayment: 25000, paymentMethod: 'efectivo' },
        'customer_1',
        25000,
      ),
    ).toMatchObject({ paymentType: 'cash', treatedAsCash: true });

    expect(() =>
      resolveSalePayment(
        { paymentType: 'credit', initialPayment: 25001, paymentMethod: 'efectivo' },
        'customer_1',
        25000,
      ),
    ).toThrowError(SalesOperationError);
  });

  it('exige cliente y medio de pago solo cuando corresponde', () => {
    expect(() =>
      resolveSalePayment(
        { paymentType: 'credit', initialPayment: 0, paymentMethod: null },
        null,
        25000,
      ),
    ).toThrowError(SalesOperationError);

    expect(() =>
      resolveSalePayment(
        { paymentType: 'credit', initialPayment: 1000, paymentMethod: null },
        'customer_1',
        25000,
      ),
    ).toThrowError(SalesOperationError);
  });
});
