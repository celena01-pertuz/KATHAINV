import { CUSTOMER_CREDIT_LABELS } from './labels';

export function buildCustomerCreditReminderUrl(
  phone: string,
  customerName: string,
  balance: number,
): string | null {
  if (!/^57\d{10}$/.test(phone) || !Number.isSafeInteger(balance) || balance <= 0) {
    return null;
  }
  const formattedBalance = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(balance);
  const message = CUSTOMER_CREDIT_LABELS.reminderMessage(customerName, formattedBalance);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
