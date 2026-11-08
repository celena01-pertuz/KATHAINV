import type { ProductRecord } from '@/modules/products/types';
import { getBogotaDate } from '@/modules/reports/date-range';

export type ColombiaGreeting = 'Buenos días' | 'Buenas tardes' | 'Buenas noches';

export function getColombiaGreeting(now: Date): ColombiaGreeting {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Bogota',
      hour: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .find((part) => part.type === 'hour')?.value,
  );

  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function getGreetingName(displayName: string | null, email: string | null): string {
  const sessionName = displayName?.trim();
  const name =
    (sessionName && !sessionName.includes('@') ? sessionName : null) ||
    email?.split('@')[0]?.trim() ||
    '';
  if (!name) return '';
  return name[0].toLocaleUpperCase('es-CO') + name.slice(1);
}

export function getPreviousBogotaDate(today: string): string {
  const [year, month, day] = today.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

export function getDayDescription(selectedDate: string, today: string): string {
  if (selectedDate === today) return 'Este es tu reporte de hoy';
  if (selectedDate === getPreviousBogotaDate(today)) return 'Este es tu reporte de ayer';

  const date = new Date(`${selectedDate}T12:00:00.000Z`);
  const formattedDate = new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Bogota',
  }).format(date);
  return `Este es tu reporte del ${formattedDate}`;
}

export function getColombiaToday(now = new Date()): string {
  return getBogotaDate(now);
}

export function getProductsToRestock(products: ProductRecord[]): ProductRecord[] {
  return products
    .filter(
      (product) => product.active && (product.stock === 0 || product.stock <= product.minStock),
    )
    .sort(
      (left, right) =>
        Number(right.stock === 0) - Number(left.stock === 0) ||
        left.stock - right.stock ||
        left.name.localeCompare(right.name, 'es-CO'),
    )
    .slice(0, 5);
}
