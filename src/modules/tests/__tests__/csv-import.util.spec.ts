import { parseCsvImportRows } from '../utils/csv-import.util';

describe('parseCsvImportRows', () => {
  it('parses a simple CSV with test rows', async () => {
    const csvText = 'name,code,department,description,specimenType,unit\nCBC,CBC,Hematology,Routine blood count,Whole Blood,panel\nLipid Profile,LIPID,Biochemistry,Cholesterol panel,Serum,panel\n';

    const rows = await parseCsvImportRows(csvText);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      name: 'CBC',
      code: 'CBC',
      department: 'Hematology',
      specimenType: 'Whole Blood',
    });
  });
});
