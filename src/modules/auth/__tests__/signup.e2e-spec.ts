import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AuthModule } from '../auth.module';
import { AuthService } from '../auth.service';

describe('Signup endpoint', () => {
  let app: INestApplication;
  let authService: AuthService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    authService = moduleRef.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('exposes the signup route', async () => {
    jest.spyOn(authService, 'signup').mockResolvedValue({
      message: 'User created successfully',
      user: { id: 'u1', name: 'Test User', email: 'test@example.com', role: 'Receptionist' },
      password: 'Password123!',
    } as any);

    const response = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
        tenantName: 'Test Tenant',
      });

    expect(response.status).toBe(201);
  });
});
