import { describe, expect, it } from 'vitest';
import { daysSinceBogotaDate } from '../date-utils';

describe('daysSinceBogotaDate', () => {
  it('counts calendar days in Colombia rather than elapsed 24-hour intervals', () => {
    expect(
      daysSinceBogotaDate('2026-11-08T04:00:00.000Z', new Date('2026-11-09T04:59:00.000Z')),
    ).toBe(1);
    expect(
      daysSinceBogotaDate('2026-11-08T23:59:00.000Z', new Date('2026-11-09T01:00:00.000Z')),
    ).toBe(0);
  });
});
