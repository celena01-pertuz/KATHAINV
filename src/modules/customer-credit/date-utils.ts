function bogotaCalendarDay(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, Number(part.value)]));
  const year = values.get('year');
  const month = values.get('month');
  const day = values.get('day');
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error('No se pudo calcular la fecha de cartera.');
  }
  return Date.UTC(year, month - 1, day);
}

export function daysSinceBogotaDate(value: string, now = new Date()): number {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || !Number.isFinite(now.getTime())) {
    throw new Error('La fecha de cartera no es válida.');
  }
  return Math.max(0, Math.floor((bogotaCalendarDay(now) - bogotaCalendarDay(date)) / 86_400_000));
}
