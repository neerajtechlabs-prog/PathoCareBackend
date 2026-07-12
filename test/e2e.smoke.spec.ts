import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { bootstrap as seedBootstrap } from '../src/database/seeds';
import { TenantDataSourceService } from '../src/database/datasources/tenant.datasource';

const request = require('supertest') as any;

describe('E2E smoke flow', () => {
  let app: INestApplication;
  let accessToken: string;
  let tenantSlug: string;
  let tenantDS: DataSource;

  beforeAll(async () => {
    await seedBootstrap();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    tenantSlug = 'demo';
    const tenantDSService = moduleRef.get(TenantDataSourceService);
    tenantDS = await tenantDSService.getForTenant(tenantSlug);

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('x-tenant-slug', tenantSlug)
      .send({
        email: 'admin@demo.pathcare.local',
        password: 'Password123!',
      });

    expect(loginRes.status).toBe(201);
    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('supports the booking -> receipt -> report flow end to end', async () => {
    const patientRow = await tenantDS.query('SELECT id FROM patients ORDER BY "createdAt" ASC LIMIT 1');
    const testRow = await tenantDS.query('SELECT id FROM tests ORDER BY "createdAt" ASC LIMIT 1');

    const createBookingRes = await request(app.getHttpServer())
      .post('/api/bookings')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-tenant-slug', tenantSlug)
      .send({
        patientId: patientRow[0]?.id,
        amount: 1000,
        paymentMode: 'CASH',
        preferredDate: '2026-07-12',
        testIds: [testRow[0]?.id],
      });

    expect(createBookingRes.status).toBe(201);
    const bookingId = createBookingRes.body.id;

    const receiptRes = await request(app.getHttpServer())
      .post(`/api/bookings/${bookingId}/receipts`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-tenant-slug', tenantSlug)
      .send({ amount: 500, paymentMode: 'CASH', remark: 'partial payment' });

    expect(receiptRes.status).toBe(201);

    const reportRes = await request(app.getHttpServer())
      .post('/api/reports')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-tenant-slug', tenantSlug)
      .send({
        bookingId,
        reportType: 'RESULTS',
        patientEmail: 'patient@example.com',
        patientPhone: '+911234567890',
      });

    expect(reportRes.status).toBe(201);

    const notificationRes = await request(app.getHttpServer())
      .post('/api/notifications')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-tenant-slug', tenantSlug)
      .send({
        channel: 'email',
        recipient: 'patient@example.com',
        subject: 'Booking confirmed',
        message: 'Booking created successfully',
        referenceId: bookingId,
      });

    expect(notificationRes.status).toBe(201);
  });
});
