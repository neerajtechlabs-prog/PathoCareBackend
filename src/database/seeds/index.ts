import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';

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

  // Insert seed_proof row
  await queryRunner.query(
    `
    INSERT INTO ${schemaName}.seed_proof (tenant_slug, note)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    `,
    [tenant.slug, `seeded for ${tenant.slug}`],
  );

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
      CREATE TABLE IF NOT EXISTS public.tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        schema_name VARCHAR(100) NOT NULL UNIQUE,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      `,
    );

    const tenants: TenantSeedConfig[] = [
      { slug: 'demo', name: 'Demo Pathcare Lab', schemaName: 'tenant_demo', status: 'active' },
      { slug: 'test2', name: 'Test Two Lab', schemaName: 'tenant_test2', status: 'active' },
    ];

    for (const tenant of tenants) {
      console.log(`\n📝 Ensuring tenant ${tenant.slug} exists...`);
      await queryRunner.query(
        `
        INSERT INTO public.tenants (slug, name, schema_name, status)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
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

