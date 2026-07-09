export function buildPatientUid(date: Date, sequence: number): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');

  return `PT-${year}${month}${day}-${seq}`;
}
