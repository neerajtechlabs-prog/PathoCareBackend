type QueryRunnerLike = {
  query(query: string, params?: unknown[]): Promise<any>;
};

export async function ensureLabCrudTables(queryRunner: QueryRunnerLike, schemaName: string): Promise<void> {
  const schema = schemaName.replace(/[^a-zA-Z0-9_]/g, '_');

  await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);

  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.labs (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      address TEXT,
      phone VARCHAR(20),
      email VARCHAR(255),
      config JSONB DEFAULT '{}'::jsonb,
      "isActive" BOOLEAN DEFAULT true,
      "createdBy" UUID,
      "updatedBy" UUID,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.departments (
      id UUID PRIMARY KEY,
      "labId" UUID NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      "isActive" BOOLEAN DEFAULT true,
      "createdBy" UUID,
      "updatedBy" UUID,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_departments_lab FOREIGN KEY ("labId") REFERENCES ${schema}.labs(id)
    );
  `);

  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.sample_types (
      id UUID PRIMARY KEY,
      "labId" UUID NOT NULL,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(50) NOT NULL UNIQUE,
      container VARCHAR(100),
      preservative VARCHAR(100),
      "storageTemperature" VARCHAR(100),
      instructions JSONB DEFAULT '{}'::jsonb,
      "isActive" BOOLEAN DEFAULT true,
      "createdBy" UUID,
      "updatedBy" UUID,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_sample_types_lab FOREIGN KEY ("labId") REFERENCES ${schema}.labs(id)
    );
  `);

  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.tests (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(100),
      department VARCHAR(255),
      description TEXT,
      "specimenType" VARCHAR(100),
      unit VARCHAR(100),
      "isActive" BOOLEAN DEFAULT true,
      "createdBy" UUID,
      "updatedBy" UUID,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.test_parameters (
      id UUID PRIMARY KEY,
      "testId" UUID NOT NULL,
      name VARCHAR(255) NOT NULL,
      unit VARCHAR(100),
      "referenceRange" VARCHAR(100),
      "isActive" BOOLEAN DEFAULT true,
      "createdBy" UUID,
      "updatedBy" UUID,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_test_parameters_test FOREIGN KEY ("testId") REFERENCES ${schema}.tests(id)
    );
  `);

  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.doctors (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      specialization VARCHAR(255),
      phone VARCHAR(20),
      email VARCHAR(255),
      "licenseNumber" VARCHAR(100),
      "isActive" BOOLEAN DEFAULT true,
      "createdBy" UUID,
      "updatedBy" UUID,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.patients (
      id UUID PRIMARY KEY,
      uid VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      email VARCHAR(255),
      gender VARCHAR(20),
      "dateOfBirth" DATE,
      address TEXT,
      "isActive" BOOLEAN DEFAULT true,
      "createdBy" UUID,
      "updatedBy" UUID,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.bookings (
      id UUID PRIMARY KEY,
      "bookingNumber" VARCHAR(100) NOT NULL UNIQUE,
      "patientId" UUID NOT NULL,
      "doctorId" UUID,
      status VARCHAR(50) DEFAULT 'Pending',
      notes TEXT,
      email VARCHAR(255),
      phone VARCHAR(20),
      "paymentMode" VARCHAR(50),
      amount NUMERIC(10,2) DEFAULT 0,
      "paymentVerified" BOOLEAN DEFAULT false,
      "preferredDate" DATE,
      "createdBy" UUID,
      "updatedBy" UUID,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.booking_tests (
      id UUID PRIMARY KEY,
      "bookingId" UUID NOT NULL,
      "testId" UUID NOT NULL,
      "testCode" VARCHAR(100),
      amount NUMERIC(10,2) DEFAULT 0,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_booking_tests_booking FOREIGN KEY ("bookingId") REFERENCES ${schema}.bookings(id) ON DELETE CASCADE
    );
  `);
}
