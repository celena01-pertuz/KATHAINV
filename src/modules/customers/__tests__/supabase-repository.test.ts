import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createAdminSupabaseClientMock } = vi.hoisted(() => ({
  createAdminSupabaseClientMock: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: createAdminSupabaseClientMock,
}));

import { createCustomer, hasDuplicateCustomerPhone } from '../supabase-repository';

const queryBuilder = {
  eq: vi.fn(),
  insert: vi.fn(),
  limit: vi.fn(),
  maybeSingle: vi.fn(),
  neq: vi.fn(),
  select: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  queryBuilder.eq.mockReturnValue(queryBuilder);
  queryBuilder.insert.mockReturnValue(queryBuilder);
  queryBuilder.limit.mockReturnValue(queryBuilder);
  queryBuilder.neq.mockReturnValue(queryBuilder);
  queryBuilder.select.mockReturnValue(queryBuilder);
  createAdminSupabaseClientMock.mockReturnValue({
    from: vi.fn(() => queryBuilder),
  });
});

describe('detección de teléfono duplicado', () => {
  it('avisa cuando el teléfono ya pertenece a un cliente', async () => {
    queryBuilder.maybeSingle.mockResolvedValue({ data: { id: 'customer_other' }, error: null });

    await expect(hasDuplicateCustomerPhone('573001234567')).resolves.toBe(true);
    expect(queryBuilder.eq).toHaveBeenCalledWith('phone', '573001234567');
  });

  it('no cuenta al mismo cliente al editar', async () => {
    queryBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(hasDuplicateCustomerPhone('573001234567', 'customer_1')).resolves.toBe(false);
    expect(queryBuilder.neq).toHaveBeenCalledWith('id', 'customer_1');
  });

  it('no expone errores crudos de permisos de Postgres', async () => {
    queryBuilder.maybeSingle.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'permission denied for table customers' },
    });

    await expect(hasDuplicateCustomerPhone('573001234567')).rejects.toThrow(
      'No se pudo completar la operación de clientes.',
    );
  });

  it('envía null para documento vacío y los campos de autorización en snake_case', async () => {
    queryBuilder.single.mockResolvedValue({
      data: {
        id: 'customer_1',
        name: 'Cliente de prueba',
        phone: '573001234567',
        document: null,
        data_treatment_authorized_at: '2026-10-30T12:00:00.000Z',
        data_treatment_notice_version: '1.0',
        data_treatment_authorization_source: 'formulario',
        active: true,
        created_at: '2026-10-30T12:00:00.000Z',
        updated_at: '2026-10-30T12:00:00.000Z',
      },
      error: null,
    });

    await createCustomer({
      name: 'Cliente de prueba',
      phone: '573001234567',
      document: '   ',
      authorizedAt: '2026-10-30T12:00:00.000Z',
      noticeVersion: '1.0',
      authorizationSource: 'formulario',
    });

    expect(queryBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringMatching(/^customer_/),
        document: null,
        data_treatment_authorized_at: '2026-10-30T12:00:00.000Z',
        data_treatment_notice_version: '1.0',
        data_treatment_authorization_source: 'formulario',
      }),
    );
  });
});
