export function normalizeColombianPhone(value: string): string | null {
  const phone = value.trim();
  if (!phone || !/^[0-9\s()+.-]+$/.test(phone)) return null;

  const digits = phone.replace(/\D/g, '');
  const nationalNumber =
    digits.length === 12 && digits.startsWith('57') ? digits.slice(2) : digits;

  return /^3\d{9}$/.test(nationalNumber) ? `57${nationalNumber}` : null;
}
