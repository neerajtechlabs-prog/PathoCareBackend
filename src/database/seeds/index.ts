import { DataSource } from 'typeorm';

/**
 * Seed script for PathCare Labs
 * Creates the demo tenant and initializes public schema data
 *
 * Run with: npm run seed
 */

async function bootstrap(): Promise<void> {

  // Create public schema connection
  const publicDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'pathcare',
    password: process.env.DB_PASS || 'localpass',
    database: process.env.DB_NAME || 'pathcare_db',
    schema: 'public',
    synchronize: false,
    logging: true,
  });

  try {
    await publicDataSource.initialize();
    console.log('✅ Connected to public schema');

    // Query runner for executing SQL
    const queryRunner = publicDataSource.createQueryRunner();

    // Drop and recreate demo tenant schema (idempotent)
    console.log('🗑️  Dropping existing demo tenant schema if exists...');
    await queryRunner.query('DROP SCHEMA IF EXISTS tenant_demo CASCADE');
    console.log('✅ Demo schema cleaned');

    // Create demo tenant in public.tenants
    console.log('📝 Creating demo tenant...');
    await queryRunner.query(
      `
      INSERT INTO public.tenants (slug, name, schema_name, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (slug) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
      `,
      ['demo', 'Demo Pathcare Lab', 'tenant_demo', 'active']
    );
    console.log('✅ Demo tenant created');

    // Create demo tenant schema
    console.log('🏗️  Creating demo tenant schema...');
    await queryRunner.query('CREATE SCHEMA tenant_demo');
    console.log('✅ Demo schema created');

    // TODO: Week 3 - Create users table
    // TODO: Week 4 - Create lab_profile, departments, employees tables
    // TODO: Week 5 - Create tests, test_parameters tables
    // TODO: Week 6 - Create doctors, patients tables
    // TODO: Week 7 - Create bookings, booking_tests tables
    // TODO: Week 9 - Create results, test_results tables

    // Create audit_logs table (common to all tenants)
    console.log('📋 Creating audit_logs table...');
    await queryRunner.query(
      `
      CREATE TABLE IF NOT EXISTS tenant_demo.audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id VARCHAR(100),
        old_values JSONB,
        new_values JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON tenant_demo.audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON tenant_demo.audit_logs(entity_type);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON tenant_demo.audit_logs(created_at DESC);
      `
    );
    console.log('✅ Audit logs table created');

    // Create notification_logs table (for tracking SMS/WhatsApp/Email)
    console.log('📬 Creating notification_logs table...');
    await queryRunner.query(
      `
      CREATE TABLE IF NOT EXISTS tenant_demo.notification_logs (
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

      CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON tenant_demo.notification_logs(status);
      CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON tenant_demo.notification_logs(created_at DESC);
      `
    );
    console.log('✅ Notification logs table created');

    console.log('\n✅ Seed completed successfully!');
    console.log('\n📊 Demo Tenant Summary:');
    console.log('  Slug: demo');
    console.log('  Schema: tenant_demo');
    console.log('  Status: active');
    console.log('\n🎯 Next Week (Week 2):');
    console.log('  - Create users table + seed admin user');
    console.log('  - Set up TenantMiddleware');
    console.log('  - Implement multi-tenancy validation');
    console.log('  - Cross-check isolation between tenants');

    await queryRunner.release();
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    if (publicDataSource.isInitialized) {
      await publicDataSource.destroy();
      console.log('🔌 Disconnected from database');
    }
  }
}

// Run bootstrap
bootstrap().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
