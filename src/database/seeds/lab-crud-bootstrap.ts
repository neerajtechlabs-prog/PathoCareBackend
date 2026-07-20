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
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    ALTER TABLE ${schema}.tests
    ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS "TestID" INTEGER,
    ADD COLUMN IF NOT EXISTS "TestInitial" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "TestCode" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "TestName" VARCHAR(255),
    ADD COLUMN IF NOT EXISTS "Rate" NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS "ResultPass" TEXT,
    ADD COLUMN IF NOT EXISTS "ResultFail" TEXT,
    ADD COLUMN IF NOT EXISTS "ReportDays" INTEGER,
    ADD COLUMN IF NOT EXISTS "IsTest" BOOLEAN,
    ADD COLUMN IF NOT EXISTS "TestType" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "TestGroupID" INTEGER,
    ADD COLUMN IF NOT EXISTS "DeptID" INTEGER,
    ADD COLUMN IF NOT EXISTS "PrintRefValue" VARCHAR(10),
    ADD COLUMN IF NOT EXISTS "PrintSeparate" VARCHAR(10),
    ADD COLUMN IF NOT EXISTS "SpecialReport" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "GroupName" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "CompID" INTEGER,
    ADD COLUMN IF NOT EXISTS "TestSno" INTEGER,
    ADD COLUMN IF NOT EXISTS "TestSlip" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "PCODE" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "PrintNewPage" VARCHAR(10),
    ADD COLUMN IF NOT EXISTS "SampleMasterID" INTEGER,
    ADD COLUMN IF NOT EXISTS "SampleDetail" VARCHAR(255),
    ADD COLUMN IF NOT EXISTS "TCode" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "Analyzer" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "ShowInList" BOOLEAN,
    ADD COLUMN IF NOT EXISTS "IsNABL" BOOLEAN,
    ADD COLUMN IF NOT EXISTS "NABLSym" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "IsBlankStructure" BOOLEAN,
    ADD COLUMN IF NOT EXISTS "ResultForm" INTEGER;
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
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "doctorCode" VARCHAR(50),
      center VARCHAR(100),
      initial VARCHAR(20),
      name VARCHAR(255) NOT NULL,
      "printName" VARCHAR(255),
      "isPrint" BOOLEAN DEFAULT true,
      designation VARCHAR(100),
      organisation VARCHAR(255),
      "isOrg" BOOLEAN DEFAULT false,
      religion VARCHAR(50),
      specialization VARCHAR(255),
      "docLocation" VARCHAR(255),
      address1 VARCHAR(255),
      address2 VARCHAR(255),
      email VARCHAR(255),
      phone1 VARCHAR(20),
      phone2 VARCHAR(20),
      mobile1 VARCHAR(20),
      mobile2 VARCHAR(20),
      "userId" VARCHAR(100),
      password VARCHAR(255),
      "bookingSMS" VARCHAR(255),
      "isBooking" BOOLEAN DEFAULT false,
      "resultSMS" VARCHAR(255),
      "isResult" BOOLEAN DEFAULT false,
      "dayReminder" VARCHAR(255),
      "isReminder" BOOLEAN DEFAULT false,
      "isBdaySMS" BOOLEAN DEFAULT false,
      "isAnniversarySMS" BOOLEAN DEFAULT false,
      "birthDate" DATE,
      anniversary DATE,
      commission NUMERIC(10,2),
      pro VARCHAR(100),
      "doctorType" VARCHAR(100),
      "webRpt" BOOLEAN DEFAULT false,
      "internetRpt" BOOLEAN DEFAULT false,
      sms BOOLEAN DEFAULT false,
      whatsapp BOOLEAN DEFAULT false,
      "licenseNumber" VARCHAR(100),
      "isActive" BOOLEAN DEFAULT true,
      "createdBy" UUID,
      "updatedBy" UUID,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await queryRunner.query(`
    ALTER TABLE ${schema}.doctors
    ADD COLUMN IF NOT EXISTS "doctorCode" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS center VARCHAR(100),
    ADD COLUMN IF NOT EXISTS initial VARCHAR(20),
    ADD COLUMN IF NOT EXISTS "printName" VARCHAR(255),
    ADD COLUMN IF NOT EXISTS "isPrint" BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS designation VARCHAR(100),
    ADD COLUMN IF NOT EXISTS organisation VARCHAR(255),
    ADD COLUMN IF NOT EXISTS "isOrg" BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS religion VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "docLocation" VARCHAR(255),
    ADD COLUMN IF NOT EXISTS address1 VARCHAR(255),
    ADD COLUMN IF NOT EXISTS address2 VARCHAR(255),
    ADD COLUMN IF NOT EXISTS phone1 VARCHAR(20),
    ADD COLUMN IF NOT EXISTS phone2 VARCHAR(20),
    ADD COLUMN IF NOT EXISTS mobile1 VARCHAR(20),
    ADD COLUMN IF NOT EXISTS mobile2 VARCHAR(20),
    ADD COLUMN IF NOT EXISTS "userId" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS password VARCHAR(255),
    ADD COLUMN IF NOT EXISTS "bookingSMS" VARCHAR(255),
    ADD COLUMN IF NOT EXISTS "isBooking" BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS "resultSMS" VARCHAR(255),
    ADD COLUMN IF NOT EXISTS "isResult" BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS "dayReminder" VARCHAR(255),
    ADD COLUMN IF NOT EXISTS "isReminder" BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS "isBdaySMS" BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS "isAnniversarySMS" BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS "birthDate" DATE,
    ADD COLUMN IF NOT EXISTS anniversary DATE,
    ADD COLUMN IF NOT EXISTS commission NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS pro VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "doctorType" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "webRpt" BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS "internetRpt" BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS sms BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS whatsapp BOOLEAN DEFAULT false;
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
      "cancellationRemark" TEXT,
      email VARCHAR(255),
      phone VARCHAR(20),
      "paymentMode" VARCHAR(50),
      amount NUMERIC(10,2) DEFAULT 0,
      "paidAmount" NUMERIC(10,2) DEFAULT 0,
      "paymentVerified" BOOLEAN DEFAULT false,
      "preferredDate" DATE,
      "createdBy" UUID,
      "updatedBy" UUID,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await queryRunner.query(`
    ALTER TABLE ${schema}.bookings
    ADD COLUMN IF NOT EXISTS "cancellationRemark" TEXT,
    ADD COLUMN IF NOT EXISTS "paidAmount" NUMERIC(10,2) DEFAULT 0;
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

  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.booking_receipts (
      id UUID PRIMARY KEY,
      "receiptNumber" VARCHAR(100) NOT NULL UNIQUE,
      "bookingId" UUID NOT NULL,
      amount NUMERIC(10,2) DEFAULT 0,
      "paymentMode" VARCHAR(50) NOT NULL,
      remark TEXT,
      "createdBy" UUID,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_booking_receipts_booking FOREIGN KEY ("bookingId") REFERENCES ${schema}.bookings(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_${schema}_booking_receipts_booking_id ON ${schema}.booking_receipts("bookingId");
    CREATE INDEX IF NOT EXISTS idx_${schema}_booking_receipts_created_at ON ${schema}.booking_receipts("createdAt" DESC);
  `);
}
