export function buildReceiptNumber(tenantSlug: string, date: string, sequence: number): string {
  const normalizedTenant = tenantSlug
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
  const normalizedDate = date.replace(/-/g, '');
  const normalizedSequence = String(sequence).padStart(4, '0');

  return `${normalizedTenant}-RCPT-${normalizedDate}-${normalizedSequence}`;
}
