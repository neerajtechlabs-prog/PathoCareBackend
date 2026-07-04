import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS configuration (will be enhanced with dynamic tenant-based CORS in TenantModule)
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? false : true,
    credentials: true,
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Global filters
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('PathCare Labs API')
    .setDescription('Backend API for PathCare diagnostic lab management system')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('tenants', 'Tenant management')
    .addTag('users', 'User management')
    .addTag('patients', 'Patient management')
    .addTag('doctors', 'Doctor management')
    .addTag('tests', 'Lab tests catalog')
    .addTag('bookings', 'Booking management')
    .addTag('results', 'Result entry and workload')
    .addTag('reports', 'PDF report generation')
    .addTag('notifications', 'Notification delivery')
    .addTag('lab-profile', 'Lab configuration')
    .addTag('health', 'Health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);
  SwaggerModule.setup('api-docs-json', app, document); // For OpenAPI codegen

  const port = parseInt(process.env.API_PORT || '3001', 10);
  await app.listen(port);

  console.log(`✅ PathCare API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api-docs`);
  console.log(`🔗 OpenAPI JSON: http://localhost:${port}/api-docs-json`);
}

bootstrap().catch((error) => {
  console.error('Bootstrap error:', error);
  process.exit(1);
});
