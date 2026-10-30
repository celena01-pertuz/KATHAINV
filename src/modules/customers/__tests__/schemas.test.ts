import { describe, expect, it } from 'vitest';
import { CUSTOMER_DATA_NOTICE_VERSION } from '../consent-notice';
import { customerCreateSchema } from '../schemas';

const customerInput = {
  name: 'Cliente de prueba',
  phone: '3001234567',
  document: '',
  authorization: {
    accepted: true,
    noticeVersion: CUSTOMER_DATA_NOTICE_VERSION,
    source: 'formulario',
  },
};

describe('validación de clientes', () => {
  it('normaliza el teléfono antes de guardar el cliente', () => {
    expect(customerCreateSchema.parse(customerInput).phone).toBe('573001234567');
  });

  it.each(['', '   '])('convierte el documento vacío %j a null', (document) => {
    expect(customerCreateSchema.parse({ ...customerInput, document }).document).toBeNull();
  });

  it('exige autorización de tratamiento de datos al crear', () => {
    const withoutAuthorization = { ...customerInput, authorization: undefined };
    expect(customerCreateSchema.safeParse(withoutAuthorization).success).toBe(false);
  });

  it('rechaza una autorización que no fue aceptada', () => {
    expect(
      customerCreateSchema.safeParse({
        ...customerInput,
        authorization: { ...customerInput.authorization, accepted: false },
      }).success,
    ).toBe(false);
  });
});
