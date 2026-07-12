import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

const request = require('supertest');

describe('API contract routes', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('exposes the core documented auth, booking, report, and notification routes', async () => {
    const authRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('x-tenant-slug', 'demo')
      .send({
        email: 'admin@demo.pathcare.local',
        password: 'Password123!',
      });
    expect(authRes.status).not.toBe(404);

    const bookingRes = await request(app.getHttpServer())
      .get('/api/bookings')
      .set('x-tenant-slug', 'demo');
    expect(bookingRes.status).not.toBe(404);

    const reportRes = await request(app.getHttpServer())
      .get('/api/reports/does-not-exist')
      .set('x-tenant-slug', 'demo');
    expect(reportRes.status).not.toBe(404);

    const notificationRes = await request(app.getHttpServer())
      .get('/api/notifications')
      .set('x-tenant-slug', 'demo');
    expect(notificationRes.status).not.toBe(404);
  });
});
