import { describe, expect, it } from 'vitest';
import { normalizeColombianPhone } from '../phone-utils';

describe('normalización de teléfono colombiano', () => {
  it.each([
    ['3001234567', '573001234567'],
    ['+57 300 123 4567', '573001234567'],
    ['57 3001234567', '573001234567'],
    ['(300) 123-4567', '573001234567'],
  ])('normaliza %s', (input, expected) => {
    expect(normalizeColombianPhone(input)).toBe(expected);
  });

  it.each(['2001234567', '300123456', '+1 3001234567', 'teléfono 3001234567'])(
    'rechaza un teléfono inválido',
    (input) => {
      expect(normalizeColombianPhone(input)).toBeNull();
    },
  );
});
