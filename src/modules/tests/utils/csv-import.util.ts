export interface CsvImportRow {
  name?: string;
  code?: string;
  department?: string;
  description?: string;
  specimenType?: string;
  unit?: string;
}

export async function parseCsvImportRows(csvText: string): Promise<CsvImportRow[]> {
  const rows = csvText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (rows.length === 0) {
    return [];
  }

  const [headerLine, ...dataLines] = rows;
  const headers = headerLine
    .split(',')
    .map(header => header.trim().toLowerCase());

  return dataLines.map(line => {
    const values = line.split(',').map(value => value.trim());
    const record: CsvImportRow = {};

    headers.forEach((header, index) => {
      const value = values[index] ?? '';
      if (header === 'name') record.name = value;
      if (header === 'code') record.code = value;
      if (header === 'department') record.department = value;
      if (header === 'description') record.description = value;
      if (header === 'specimentype') record.specimenType = value;
      if (header === 'unit') record.unit = value;
    });

    return record;
  });
}
