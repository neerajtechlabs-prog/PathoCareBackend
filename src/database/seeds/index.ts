import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { ensureLabCrudTables } from './lab-crud-bootstrap';

/**
 * Seed script for PathCare Labs
 * Creates the demo and secondary tenant schemas and initializes users with JWT auth setup.
 *
 * Run with: npm run seed
 */

type TenantSeedConfig = {
  slug: string;
  name: string;
  schemaName: string;
  status: string;
};

type UserSeed = {
  email: string;
  name: string;
  password: string; // Will be hashed
  role: 'SuperAdmin' | 'LabAdmin' | 'Receptionist' | 'LabTechnician' | 'Doctor';
};

/**
 * Hash password using Argon2id (same as AuthService)
 */
async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

async function getTableColumnNames(queryRunner: any, schemaName: string, tableName: string): Promise<Set<string>> {
  const rows = await queryRunner.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2`,
    [schemaName, tableName],
  );

  const columnNames = (rows ?? [])
    .map((row: { column_name?: string }) => row.column_name)
    .filter((value: string | undefined): value is string => Boolean(value));

  return new Set(columnNames);
}

function buildDoctorSeedInsert(schemaName: string, columns: Set<string>, doctor: Record<string, any>): { sql: string; params: unknown[] } {
  const quote = (name: string): string => (name === 'id' || name === 'name' ? name : `"${name}"`);
  const fields: string[] = [quote('id'), quote('name')];
  const placeholders: string[] = ['gen_random_uuid()', '$1'];
  const params: unknown[] = [doctor.name];

  if (columns.has('specialization')) {
    fields.push(quote('specialization'));
    placeholders.push('$2');
    params.push(doctor.specialization);
  }

  if (columns.has('doctorCode')) {
    fields.push(quote('doctorCode'));
    placeholders.push('$3');
    params.push(doctor.doctorCode);
  }

  if (columns.has('designation')) {
    fields.push(quote('designation'));
    placeholders.push('$4');
    params.push(doctor.designation);
  }

  const phoneColumn = columns.has('phone1') ? 'phone1' : columns.has('phone') ? 'phone' : null;
  if (phoneColumn) {
    fields.push(quote(phoneColumn));
    placeholders.push(`$${params.length + 1}`);
    params.push(doctor.phone1 ?? doctor.phone ?? null);
  }

  if (columns.has('email')) {
    fields.push(quote('email'));
    placeholders.push(`$${params.length + 1}`);
    params.push(doctor.email);
  }

  if (columns.has('licenseNumber')) {
    fields.push(quote('licenseNumber'));
    placeholders.push(`$${params.length + 1}`);
    params.push(doctor.licenseNumber);
  }

  if (columns.has('isActive')) {
    fields.push(quote('isActive'));
    placeholders.push(`$${params.length + 1}`);
    params.push(doctor.isActive ?? true);
  }

  if (columns.has('createdBy')) {
    fields.push(quote('createdBy'));
    placeholders.push(`$${params.length + 1}`);
    params.push(null);
  }

  if (columns.has('updatedBy')) {
    fields.push(quote('updatedBy'));
    placeholders.push(`$${params.length + 1}`);
    params.push(null);
  }

  return {
    sql: `INSERT INTO ${schemaName}.doctors (${fields.join(', ')}) VALUES (${placeholders.join(', ')}) ON CONFLICT (id) DO NOTHING`,
    params,
  };
}

/**
 * Seed data per tenant - one user per role
 */
function getUserSeedsForTenant(tenantSlug: string): UserSeed[] {
  return [
    {
      email: `admin@${tenantSlug}.pathcare.local`,
      name: 'Super Admin',
      password: 'Password123!',
      role: 'SuperAdmin',
    },
    {
      email: `labadmin@${tenantSlug}.pathcare.local`,
      name: 'Lab Administrator',
      password: 'Password123!',
      role: 'LabAdmin',
    },
    {
      email: `receptionist@${tenantSlug}.pathcare.local`,
      name: 'Front Desk Receptionist',
      password: 'Password123!',
      role: 'Receptionist',
    },
    {
      email: `technician@${tenantSlug}.pathcare.local`,
      name: 'Lab Technician',
      password: 'Password123!',
      role: 'LabTechnician',
    },
    {
      email: `doctor@${tenantSlug}.pathcare.local`,
      name: 'Dr. Medical Professional',
      password: 'Password123!',
      role: 'Doctor',
    },
  ];
}

async function ensureTenantSeedData(queryRunner: any, tenant: TenantSeedConfig): Promise<void> {
  const schemaName = tenant.schemaName;

  await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);

  // Create seed_proof table
  await queryRunner.query(
    `
    CREATE TABLE IF NOT EXISTS ${schemaName}.seed_proof (
      id SERIAL PRIMARY KEY,
      tenant_slug VARCHAR(50) UNIQUE NOT NULL,
      note TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `,
  );

  // Create audit_logs table
  await queryRunner.query(
    `
    CREATE TABLE IF NOT EXISTS ${schemaName}.audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(100) NOT NULL,
      entity_id VARCHAR(100),
      old_values JSONB,
      new_values JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_${schemaName}_audit_logs_user_id ON ${schemaName}.audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_${schemaName}_audit_logs_entity_type ON ${schemaName}.audit_logs(entity_type);
    CREATE INDEX IF NOT EXISTS idx_${schemaName}_audit_logs_created_at ON ${schemaName}.audit_logs(created_at DESC);
    `,
  );

  // Create notification_logs table
  await queryRunner.query(
    `
    CREATE TABLE IF NOT EXISTS ${schemaName}.notification_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      recipient_phone VARCHAR(20),
      recipient_email VARCHAR(255),
      notification_type VARCHAR(50) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      message TEXT,
      provider_response JSONB,
      attempts INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_${schemaName}_notification_logs_status ON ${schemaName}.notification_logs(status);
    CREATE INDEX IF NOT EXISTS idx_${schemaName}_notification_logs_created_at ON ${schemaName}.notification_logs(created_at DESC);
    `,
  );

  // Create users table (new for Phase 2)
  await queryRunner.query(
    `
    CREATE TABLE IF NOT EXISTS ${schemaName}.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'Receptionist',
      is_active BOOLEAN DEFAULT true,
      phone VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_${schemaName}_users_email ON ${schemaName}.users(email);
    CREATE INDEX IF NOT EXISTS idx_${schemaName}_users_role ON ${schemaName}.users(role);
    CREATE INDEX IF NOT EXISTS idx_${schemaName}_users_is_active ON ${schemaName}.users(is_active);
    `,
  );

  // Create refresh_tokens table (persisted token validation)
  await queryRunner.query(
    `
    CREATE TABLE IF NOT EXISTS ${schemaName}.refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      token_hash VARCHAR(255) NOT NULL,
      family VARCHAR(50) NOT NULL,
      revoked BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      revoked_at TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_${schemaName}_refresh_tokens_user_id ON ${schemaName}.refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_${schemaName}_refresh_tokens_family ON ${schemaName}.refresh_tokens(family);
    CREATE INDEX IF NOT EXISTS idx_${schemaName}_refresh_tokens_revoked ON ${schemaName}.refresh_tokens(revoked);
    CREATE INDEX IF NOT EXISTS idx_${schemaName}_refresh_tokens_expires_at ON ${schemaName}.refresh_tokens(expires_at);
    `,
  );

  await ensureLabCrudTables(queryRunner, schemaName);

  const seedTests = [
    {
      name: 'Complete Blood Count',
      code: 'CBC',
      department: 'Hematology',
      description: 'Routine blood count panel',
      specimenType: 'Whole Blood',
      unit: 'panel',
      parameters: [
        { name: 'Hemoglobin', unit: 'g/dL', referenceRange: '12.0-16.0' },
        { name: 'WBC Count', unit: '10^3/uL', referenceRange: '4.0-11.0' },
        { name: 'Platelet Count', unit: '10^3/uL', referenceRange: '150-450' },
      ],
    },
    {
      name: 'Lipid Profile',
      code: 'LIPID',
      department: 'Biochemistry',
      description: 'Cholesterol and triglyceride panel',
      specimenType: 'Serum',
      unit: 'panel',
      parameters: [
        { name: 'Total Cholesterol', unit: 'mg/dL', referenceRange: '<200' },
        { name: 'Triglycerides', unit: 'mg/dL', referenceRange: '<150' },
        { name: 'HDL', unit: 'mg/dL', referenceRange: '>40' },
      ],
    },
    {
      name: 'Urine Routine Examination',
      code: 'URINE',
      department: 'Pathology',
      description: 'Routine urine analyte examination',
      specimenType: 'Urine',
      unit: 'panel',
      parameters: [
        { name: 'pH', unit: '', referenceRange: '4.5-8.0' },
        { name: 'Protein', unit: 'mg/dL', referenceRange: 'Negative' },
      ],
    },
  ];

  for (const seedTest of seedTests) {
    const testInsert = await queryRunner.query(
      `
      INSERT INTO ${schemaName}.tests (id, name, code, department, description, "specimenType", unit, "isActive", "createdBy", "updatedBy")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, NULL, NULL)
      ON CONFLICT (id) DO NOTHING
      RETURNING id
      `,
      [seedTest.name, seedTest.code, seedTest.department, seedTest.description, seedTest.specimenType, seedTest.unit],
    );

    const testId = testInsert?.[0]?.id;
    if (!testId) continue;

    for (const parameter of seedTest.parameters) {
      await queryRunner.query(
        `
        INSERT INTO ${schemaName}.test_parameters (id, "testId", name, unit, "referenceRange", "isActive", "createdBy", "updatedBy")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NULL, NULL)
        ON CONFLICT (id) DO NOTHING
        `,
        [testId, parameter.name, parameter.unit, parameter.referenceRange],
      );
    }
  }

  // Insert seed_proof row
  await queryRunner.query(
    `
    INSERT INTO ${schemaName}.seed_proof (tenant_slug, note)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    `,
    [tenant.slug, `seeded for ${tenant.slug}`],
  );

  const doctorSeeds = [
    {
      name: 'Dr. Asha Verma',
      specialization: 'Pathology',
      phone1: '9876543210',
      email: 'asha.verma@pathcare.local',
      licenseNumber: 'DOC-001',
      doctorCode: 'DOC-001',
      designation: 'MD',
      isActive: true,
    },
    {
      name: 'Dr. Rohan Shah',
      specialization: 'Biochemistry',
      phone1: '9876543211',
      email: 'rohan.shah@pathcare.local',
      licenseNumber: 'DOC-002',
      doctorCode: 'DOC-002',
      designation: 'MBBS',
      isActive: true,
    },
  ];

  const doctorColumns = await getTableColumnNames(queryRunner, schemaName, 'doctors');

  for (const doctor of doctorSeeds) {
    const doctorInsert = buildDoctorSeedInsert(schemaName, doctorColumns, doctor);
    console.log('[seed] doctor insert SQL:', doctorInsert.sql);
    await queryRunner.query(doctorInsert.sql, doctorInsert.params);
  }

  const patientSeeds = [
    {
      name: 'Priya Mehta',
      phone: '9123456780',
      email: 'priya.mehta@example.com',
      gender: 'Female',
      dateOfBirth: '1990-04-12',
      address: 'Sector 15, Gurgaon',
    },
    {
      name: 'Amit Kumar',
      phone: '9123456781',
      email: 'amit.kumar@example.com',
      gender: 'Male',
      dateOfBirth: '1985-08-20',
      address: 'Noida, Uttar Pradesh',
    },
  ];

  for (const patient of patientSeeds) {
    const uid = `PT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await queryRunner.query(
      `
      INSERT INTO ${schemaName}.patients (id, uid, name, phone, email, gender, "dateOfBirth", address, "isActive", "createdBy", "updatedBy")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, true, NULL, NULL)
      ON CONFLICT (uid) DO NOTHING
      `,
      [uid, patient.name, patient.phone, patient.email, patient.gender, patient.dateOfBirth, patient.address],
    );
  }

  // Seed users per role (Phase 2 auth setup)
  const userSeeds = getUserSeedsForTenant(tenant.slug);
  for (const user of userSeeds) {
    const passwordHash = await hashPassword(user.password);
    await queryRunner.query(
      `
      INSERT INTO ${schemaName}.users (email, name, password_hash, role, is_active)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        updated_at = CURRENT_TIMESTAMP
      `,
      [user.email, user.name, passwordHash, user.role, true],
    );
    console.log(`    ✅ Seeded user: ${user.email} (${user.role})`);
  }
}

export async function bootstrap(): Promise<void> {
  const publicDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'pathcare',
    password: process.env.DB_PASS || 'localpass',
    database: process.env.DB_NAME || 'pathcare_db',
    schema: 'public',
    synchronize: false,
    logging: false,
  });

  try {
    await publicDataSource.initialize();
    console.log('✅ Connected to public schema');

    const queryRunner = publicDataSource.createQueryRunner();

    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await queryRunner.query(
      `
      CREATE TABLE public.tenants (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	slug varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	email varchar(255) NULL,
	schema_name varchar(100) NOT NULL,
	status varchar(20) DEFAULT 'active'::character varying NULL,
	lab_code varchar(50) NULL,
	registration_number varchar(100) NULL,
	gst_number varchar(20) NULL,
	mobile_number varchar(20) NULL,
	country varchar(100) NULL,
	state varchar(100) NULL,
	city varchar(100) NULL,
	pin_code varchar(20) NULL,
	complete_address text NULL,
	plan varchar(50) DEFAULT 'Starter'::character varying NULL,
	terms_accepted bool DEFAULT false NULL,
	privacy_accepted bool DEFAULT false NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT tenants_pkey PRIMARY KEY (id),
	CONSTRAINT tenants_schema_name_key UNIQUE (schema_name),
	CONSTRAINT tenants_slug_key UNIQUE (slug),
	CONSTRAINT tenants_lab_code_key UNIQUE (lab_code)
);
      `
    );

    const tenants: TenantSeedConfig[] = [
      { slug: 'demo', name: 'Demo Pathcare Lab', schemaName: 'tenant_demo', status: 'active' },
      { slug: 'test2', name: 'Test Two Lab', schemaName: 'tenant_test2', status: 'active' },
    ];

    for (const tenant of tenants) {
      console.log(`\n📝 Ensuring tenant ${tenant.slug} exists...`);
      await queryRunner.query(
        `
        INSERT INTO public.tenants (slug, name, email, schema_name, status)
        VALUES ($1, $2, NULL, $3, $4)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          schema_name = EXCLUDED.schema_name,
          status = EXCLUDED.status,
          updated_at = CURRENT_TIMESTAMP
        `,
        [tenant.slug, tenant.name, tenant.schemaName, tenant.status],
      );

      await ensureTenantSeedData(queryRunner, tenant);
      console.log(`✅ Tenant ${tenant.slug} ready in schema ${tenant.schemaName}`);
    }

    console.log('\n✅ Seed completed successfully!');
    console.log('\n📊 Seed summary:');
    for (const tenant of tenants) {
      const seedProofRows = await queryRunner.query(
        `SELECT tenant_slug, note FROM ${tenant.schemaName}.seed_proof`,
      );
      const userRows = await queryRunner.query(
        `SELECT email, role FROM ${tenant.schemaName}.users ORDER BY role`,
      );
      console.log(`  - Tenant: ${tenant.slug}`);
      console.log(`    - Isolation proof rows: ${seedProofRows.length}`);
      console.log(`    - Users seeded: ${userRows.length}`);
      userRows.forEach((u: { email: string; role: string }) => console.log(`      • ${u.email} (${u.role})`));
    }

    await queryRunner.release();
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    if (publicDataSource.isInitialized) {
      await publicDataSource.destroy();
      console.log('\n🔌 Disconnected from database');
    }
  }
}

if (require.main === module) {
  bootstrap().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

