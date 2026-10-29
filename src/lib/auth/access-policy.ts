export type InventoryUser = {
  email?: string | null;
  email_confirmed_at?: string | null;
} | null;

export function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? '';
}

export function isEmailAllowed(
  email: string | null | undefined,
  allowedEmails = process.env.ALLOWED_EMAILS,
): boolean {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !allowedEmails) return false;

  const allowed = new Set(allowedEmails.split(',').map(normalizeEmail).filter(Boolean));
  return allowed.has(normalizedEmail);
}

export function canAccessInventory(
  user: InventoryUser,
  allowedEmails = process.env.ALLOWED_EMAILS,
): boolean {
  return Boolean(user?.email_confirmed_at) && isEmailAllowed(user?.email, allowedEmails);
}
