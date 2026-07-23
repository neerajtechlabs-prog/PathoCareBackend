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
      normal_min double precision,
      normal_max double precision,
      critical_min double precision,
      critical_max double precision,
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
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  "legacyId" integer NULL,                      -- preserves old DoctorID for FK remapping during migration
  "doctorCode" varchar(50) NULL,
  center varchar(100) NULL,
  initial varchar(20) NULL,
  "name" varchar(255) NOT NULL,
  "printName" varchar(255) NULL,
  "isPrint" bool DEFAULT true NULL,
  designation varchar(100) NULL,
  organisation varchar(255) NULL,
  "isOrg" bool DEFAULT false NULL,
  religion varchar(50) NULL,
  specialization varchar(255) NULL,
  "docLocation" varchar(255) NULL,
  address1 varchar(255) NULL,
  address2 varchar(255) NULL,
  email varchar(255) NULL,
  phone1 varchar(20) NULL,
  phone2 varchar(20) NULL,
  mobile1 varchar(20) NULL,
  mobile2 varchar(20) NULL,
  "userId" varchar(100) NULL,
  "password" varchar(255) NULL,                 -- store hashed only, never plaintext
  "bookingSMS" varchar(255) NULL,
  "isBooking" bool DEFAULT false NULL,
  "resultSMS" varchar(255) NULL,
  "isResult" bool DEFAULT false NULL,
  "dayReminder" varchar(255) NULL,
  "isReminder" bool DEFAULT false NULL,
  "isBdaySMS" bool DEFAULT false NULL,
  "isAnniversarySMS" bool DEFAULT false NULL,
  "birthDate" date NULL,
  anniversary date NULL,
  commission numeric(10, 2) NULL,
  pro varchar(100) NULL,
  "doctorType" varchar(100) NULL,
  "webRpt" bool DEFAULT false NULL,
  "internetRpt" bool DEFAULT false NULL,
  sms bool DEFAULT false NULL,
  whatsapp bool DEFAULT false NULL,
  "licenseNumber" varchar(100) NULL,
  "isActive" bool DEFAULT true NULL,
  "createdBy" uuid NULL,
  "updatedBy" uuid NULL,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NULL,
  "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NULL,
  CONSTRAINT doctors_pkey PRIMARY KEY (id),
  CONSTRAINT doctors_email_key UNIQUE (email),
  CONSTRAINT doctors_legacy_id_key UNIQUE ("legacyId")
);

CREATE INDEX IF NOT EXISTS idx_${schema}_doctors_doctor_code ON ${schema}.doctors ("doctorCode");
CREATE INDEX IF NOT EXISTS idx_${schema}_doctors_legacy_id ON ${schema}.doctors ("legacyId");
CREATE INDEX IF NOT EXISTS idx_${schema}_doctors_is_active ON ${schema}.doctors ("isActive");
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
    CREATE TABLE IF NOT EXISTS ${schema}.panels (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      code VARCHAR(100),
      description TEXT,
      "isActive" BOOLEAN DEFAULT true,
      "createdBy" UUID,
      "updatedBy" UUID,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.bookings (
	id uuid NOT NULL DEFAULT gen_random_uuid(),
	"bookingNumber" varchar(100) NOT NULL,
	"centreId" uuid NULL,
	"barcode" varchar(50) NULL,
	"barcodeNo" int4 NULL,
	"regNo" varchar(50) NULL,
	"recordNo" varchar(50) NULL,
	"patientId" uuid NOT NULL,
	"uid" varchar(50) NULL,
	"bookingAge" int4 NULL,
	"doctorId" uuid NULL,
	"doctorPrintName" varchar(255) NULL,
	"doctorType" varchar(50) NULL,
	"drCut" numeric(10, 2) DEFAULT 0 NULL,
	"isDoctorAccount" bool DEFAULT false NULL,
	"sample" varchar(255) NULL,
	"sampleBy" varchar(100) NULL,
	"panelId" uuid NULL,
	"fileNumber" varchar(100) NULL,
	status varchar(50) DEFAULT 'Pending'::character varying NULL,
	"bookingType" varchar(50) NULL,
	"reportType" varchar(50) NULL,
	"userRate" varchar(100) NULL,
	notes text NULL,
	"resultRemark" text NULL,
	email varchar(255) NULL,
	phone varchar(20) NULL,
	"paymentMode" varchar(50) NULL,
	amount numeric(10, 2) DEFAULT 0 NULL,
	"extraCharges" numeric(10, 2) DEFAULT 0 NULL,
	"chargeDescription" varchar(255) NULL,
	"totalAmount" numeric(10, 2) DEFAULT 0 NULL,
	"paidAmount" numeric(10, 2) DEFAULT 0 NULL,
	"paymentVerified" bool DEFAULT false NULL,
	"isFree" bool DEFAULT false NULL,
	"preferredDate" date NULL,
	"bookingDate" date NULL,
	"bookingTime" time NULL,
	"digitalId" varchar(100) NULL,
	"referenceInfoId" uuid NULL,
	"accountForId" uuid NULL,
	"sessionId" varchar(100) NULL,
	"isCancelled" bool DEFAULT false NULL,
	"cancellationRemark" text NULL,
	"cancelledBy" uuid NULL,
	"cancelReason" varchar(255) NULL,
	"isLocked" bool DEFAULT false NULL,
	"lockedByUserId" uuid NULL,
	"isDeleted" bool DEFAULT false NULL,
	"isValidated" bool DEFAULT false NULL,
	"createdBy" uuid NULL,
	"updatedBy" uuid NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT "bookings_bookingNumber_key" UNIQUE ("bookingNumber"),
	CONSTRAINT bookings_pkey PRIMARY KEY (id),
	CONSTRAINT "bookings_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES ${schema}.patients(id),
	CONSTRAINT "bookings_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES ${schema}.doctors(id),
	CONSTRAINT "bookings_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES ${schema}.panels(id)
);
  `);

  await queryRunner.query(`
    ALTER TABLE ${schema}.bookings
    ADD COLUMN IF NOT EXISTS "cancellationRemark" TEXT,
    ADD COLUMN IF NOT EXISTS "paidAmount" NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS centre VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "regNo" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS barcode VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "recordNo" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS uid VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "patientName" VARCHAR(255),
    ADD COLUMN IF NOT EXISTS "patientTitle" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS age INTEGER,
    ADD COLUMN IF NOT EXISTS "ageUnit" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS sex VARCHAR(20),
    ADD COLUMN IF NOT EXISTS mobile VARCHAR(20),
    ADD COLUMN IF NOT EXISTS area VARCHAR(255),
    ADD COLUMN IF NOT EXISTS "doctorPrintName" VARCHAR(255),
    ADD COLUMN IF NOT EXISTS "doctorEmail" VARCHAR(255),
    ADD COLUMN IF NOT EXISTS "doctorType" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "bookingType" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS sample VARCHAR(255),
    ADD COLUMN IF NOT EXISTS "takenBy" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS panel VARCHAR(255),
    ADD COLUMN IF NOT EXISTS "fileNo" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "userRate" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "resultType" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "moveAllColumns" BOOLEAN,
    ADD COLUMN IF NOT EXISTS "bookingPlusResult" BOOLEAN,
    ADD COLUMN IF NOT EXISTS "bookingPlusReceipt" BOOLEAN,
    ADD COLUMN IF NOT EXISTS "printWorkingSlip" BOOLEAN,
    ADD COLUMN IF NOT EXISTS "extraBy" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "discountBy" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "discountPercent" NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "totalAmount" NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS net NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS paid NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "bookingDate" DATE,
    ADD COLUMN IF NOT EXISTS "bookingTime" VARCHAR(50);
  `);

  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.booking_tests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
