import { DataSource } from 'typeorm';
import { MisService } from '../mis.service';
import { TenantDataSourceService } from '../../../database/datasources/tenant.datasource';
import { ensureLabCrudTables } from '../../../database/seeds/lab-crud-bootstrap';

describe('MIS seed validation', () => {
  const tenantSlug = 'demo';
  const targetDate = '2026-07-12';
  const schemaName = `tenant_${tenantSlug}`;

  let publicDataSource: DataSource;
  let tenantService: TenantDataSourceService;

  beforeAll(async () => {
    publicDataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'pathcare',
      password: process.env.DB_PASS || 'localpass',
      database: process.env.DB_NAME || 'pathcare_db',
      schema: 'public',
      synchronize: false,
      logging: false,
    });

    await publicDataSource.initialize();
    await publicDataSource.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await publicDataSource.query(`
      CREATE TABLE IF NOT EXISTS public.tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        schema_name VARCHAR(100) NOT NULL UNIQUE,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await publicDataSource.query(
      `
      INSERT INTO public.tenants (slug, name, schema_name, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (slug) DO NOTHING
      `,
      [tenantSlug, 'Demo PathCare Lab', schemaName, 'active'],
    );

    const queryRunner = publicDataSource.createQueryRunner();
    await ensureLabCrudTables(queryRunner, schemaName);
    await queryRunner.release();

    tenantService = new TenantDataSourceService({
      get: (key: string) => process.env[key],
    } as any);
  });

  afterAll(async () => {
    if (publicDataSource?.isInitialized) {
      await publicDataSource.destroy();
    }
  });

  beforeEach(async () => {
    await publicDataSource.query(`DELETE FROM ${schemaName}.booking_receipts WHERE "receiptNumber" LIKE 'MIS-VAL-%'`);
    await publicDataSource.query(`DELETE FROM ${schemaName}.booking_tests WHERE "testCode" = 'MIS-VAL'`);
    await publicDataSource.query(`DELETE FROM ${schemaName}.bookings WHERE "bookingNumber" = 'MIS-VAL-001'`);
    await publicDataSource.query(`DELETE FROM ${schemaName}.patients WHERE uid = 'MIS-VAL-PT'`);
    await publicDataSource.query(`DELETE FROM ${schemaName}.tests WHERE code = 'MIS-VAL'`);
  });

  it('matches day collection totals against seeded booking, receipt, and test data', async () => {
    const patientResult = await publicDataSource.query(
      `
      INSERT INTO ${schemaName}.patients (id, uid, name, phone, email, gender, "dateOfBirth", address, "isActive", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, true, $8, $8)
      RETURNING id
      `,
      ['MIS-VAL-PT', 'Seed Validation Patient', '9123456789', 'seed@example.com', 'Female', '1990-01-01', 'Test Address', `${targetDate}T00:00:00.000Z`],
    );
    const patientId = patientResult[0].id;

    const testResult = await publicDataSource.query(
      `
      INSERT INTO ${schemaName}.tests (id, name, code, department, description, "specimenType", unit, "isActive", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, $7, $7)
      RETURNING id
      `,
      ['Seed Validation Test', 'MIS-VAL', 'Biochemistry', 'Validation test', 'Serum', 'mg/dL', `${targetDate}T00:00:00.000Z`],
    );
    const testId = testResult[0].id;

    const bookingResult = await publicDataSource.query(
      `
      INSERT INTO ${schemaName}.bookings (
        id, "bookingNumber", "patientId", amount, "paidAmount", "paymentMode", status, "preferredDate", "createdAt", "updatedAt"
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $8)
      RETURNING id
      `,
      ['MIS-VAL-001', patientId, '500.00', '300.00', 'Cash', 'Completed', targetDate, `${targetDate}T00:00:00.000Z`],
    );
    const bookingId = bookingResult[0].id;

    await publicDataSource.query(
      `
      INSERT INTO ${schemaName}.booking_receipts (
        id, "receiptNumber", "bookingId", amount, "paymentMode", remark, "createdAt", "updatedAt"
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $6)
      `,
      ['MIS-VAL-001', bookingId, '300.00', 'Cash', 'Seed validation', `${targetDate}T00:00:00.000Z`],
    );

    await publicDataSource.query(
      `
      INSERT INTO ${schemaName}.booking_tests (
        id, "bookingId", "testId", "testCode", amount, "createdAt", "updatedAt"
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $5)
      `,
      [bookingId, testId, 'MIS-VAL', '500.00', `${targetDate}T00:00:00.000Z`],
    );

    const service = new MisService(tenantService);
    const summary = await service.getDayCollection(tenantSlug, targetDate);
    const register = await service.getDayRegister(tenantSlug, targetDate);

    expect(summary.totalBookings).toBe(1);
    expect(summary.totalBilled).toBe(500);
    expect(summary.totalCollected).toBe(300);
    expect(summary.pendingBalance).toBe(200);
    expect(summary.modeWiseCollection).toEqual([
      expect.objectContaining({ paymentMode: 'Cash', totalCollected: 300 }),
    ]);
    expect(summary.testWiseCounts).toEqual([
      expect.objectContaining({ testName: 'Seed Validation Test', totalTests: 1 }),
    ]);
    expect(register.some((row: any) => row.bookingNumber === 'MIS-VAL-001')).toBe(true);
  });
});
