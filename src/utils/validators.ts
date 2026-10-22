export function isNonEmptyString(value: any): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidDiscountPercent(value: any): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 90;
}

export function parseValidDate(value: any): Date | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

export function isValidAmount(value: any): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
