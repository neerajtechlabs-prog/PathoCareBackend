# Queue Module Documentation

## Overview

The Queue Module provides asynchronous job processing using BullMQ (NestJS job queue library) with Redis as the message broker. This enables PathCare to handle long-running operations (PDF generation, notifications, exports) without blocking HTTP requests.

## Architecture

```
┌─────────────┐
│  HTTP Layer │ (Controllers, Services)
├─────────────┤
│QueueService │ (Enqueue jobs)
├─────────────┤
│ BullMQ SDK  │ (Job management)
├─────────────┤
│   Redis     │ (Message broker)
├─────────────┤
│  Processors │ (Workers, Job handlers)
└─────────────┘
```

## Components

### 1. Queue Types (`queue.types.ts`)
Defines all job types and data structures:
- `GeneratePdfReportJobData` - PDF report generation
- `SendSmsJobData` - SMS notifications
- `SendEmailJobData` - Email notifications
- `SendWhatsappJobData` - WhatsApp notifications
- `ExportResultsCsvJobData` - CSV exports
- `ExportMisExcelJobData` - Excel MIS reports

### 2. Processors
Worker classes that handle async jobs:

**ReportProcessor** (`report.processor.ts`)
- Generates PDF reports asynchronously
- Handles template rendering and S3 uploads
- Concurrent jobs: 2

**NotificationProcessor** (`notification.processor.ts`)
- Sends SMS, Email, WhatsApp notifications
- Integrates with Twilio, SendGrid, etc.
- Concurrent jobs: 5

**ExportProcessor** (`export.processor.ts`)
- Generates CSV and Excel exports
- Aggregates data and formats reports
- Concurrent jobs: 3

### 3. QueueService (`queue.service.ts`)
Central service for enqueueing jobs:
- Methods to enqueue each job type
- Automatic retries with exponential backoff
- Queue health statistics

### 4. QueueInitializer (`queue.initializer.ts`)
Bootstraps workers on application startup:
- Creates processor workers
- Manages lifecycle (init/destroy)
- Setup event listeners for job events

### 5. QueueModule (`queue.module.ts`)
NestJS module that:
- Configures BullModule with Redis connection
- Registers queues
- Provides QueueService and QueueInitializer

## Usage

### Enqueueing Jobs

```typescript
// In any service
constructor(private queueService: QueueService) {}

// Enqueue PDF report
await this.queueService.enqueuePdfReport({
  tenantSlug: 'demo',
  bookingId: 'booking-123',
  reportTemplate: 'standard',
  patientEmail: 'patient@example.com',
});

// Enqueue SMS notification
await this.queueService.enqueueSms({
  tenantSlug: 'demo',
  phoneNumber: '+919876543210',
  message: 'Your test results are ready',
  recipientType: 'patient',
});

// Enqueue email
await this.queueService.enqueueEmail({
  tenantSlug: 'demo',
  to: 'doctor@example.com',
  subject: 'New booking received',
  template: 'new-booking',
  context: { bookingId: 'booking-123' },
});

// Enqueue CSV export
await this.queueService.enqueueResultsCsvExport({
  tenantSlug: 'demo',
  userId: 'user-456',
  filters: { status: 'completed' },
  exportType: 'today',
});
```

### Checking Queue Health

```typescript
// In health controller
const stats = await this.queueService.getQueueStats();
console.log(stats);
/*
{
  queues: {
    reports: { name: 'reports', active: 2, waiting: 5, ... },
    notifications: { name: 'notifications', active: 3, waiting: 10, ... },
    exports: { name: 'exports', active: 1, waiting: 2, ... }
  },
  summary: {
    totalQueues: 3,
    totalActive: 6,
    totalPending: 17,
    totalFailed: 0
  }
}
*/
```

## Health Endpoints

Once integrated, the following endpoints are available:

```bash
# Queue health and statistics
GET /health/queues
# Returns: Queue counts (active, pending, failed, etc.) for all queues

# Database health
GET /health/db
# Returns: Database connection status

# Redis health
GET /health/redis
# Returns: Redis connection status and ping response
```

## Configuration

Queue settings are configured via environment variables:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

Job options (retries, backoff, removal):
```typescript
// Per queue in queue.service.ts
attempts: 3,              // Retry failed jobs 3 times
backoff: {
  type: 'exponential',
  delay: 2000,           // Start with 2s delay
},
removeOnComplete: true,  // Clean up completed jobs
removeOnFail: false,     // Keep failed jobs for inspection
```

## Event Listeners

Workers emit events for monitoring:

```typescript
worker.on('completed', job => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, error) => {
  console.log(`Job ${job.id} failed: ${error.message}`);
});

worker.on('stalled', job => {
  console.log(`Job ${job.id} stalled`);
});
```

## Error Handling

Failed jobs are retained in Redis for inspection:
- Automatic retry with exponential backoff
- After max retries exhausted, job is moved to failed set
- Failed jobs can be inspected via BullMQ UI or API

## Production Considerations

### Scaling Workers
Multiple instances of the application will each create workers. BullMQ ensures:
- Each job is processed exactly once
- Workers coordinate via Redis locks
- No duplicate processing

### Monitoring
For production, consider:
- BullMQ Dashboard (web UI for queue monitoring)
- CloudWatch/Datadog integration for metrics
- Alert on failed jobs exceeding threshold
- Regular cleanup of old completed jobs

### Performance Tuning
- `concurrency` parameter in worker configuration controls parallel job processing
- Reports: `concurrency: 2` (memory-intensive PDF generation)
- Notifications: `concurrency: 5` (lightweight, can handle more)
- Exports: `concurrency: 3` (moderate resource usage)

## Example: Complete Booking Flow with Queue

```typescript
@Injectable()
export class BookingService {
  constructor(private queueService: QueueService) {}

  async createBooking(bookingData: any): Promise<any> {
    // 1. Create booking in DB (synchronous)
    const booking = await this.bookingsRepository.create(bookingData);

    // 2. Enqueue async operations
    Promise.all([
      // Generate report asynchronously
      this.queueService.enqueuePdfReport({
        tenantSlug: booking.tenantSlug,
        bookingId: booking.id,
        reportTemplate: 'standard',
        patientEmail: booking.patientEmail,
      }),
      
      // Send notification to patient
      this.queueService.enqueueSms({
        tenantSlug: booking.tenantSlug,
        phoneNumber: booking.patientPhone,
        message: `Your booking ${booking.id} is confirmed`,
        recipientType: 'patient',
      }),
      
      // Notify lab staff
      this.queueService.enqueueEmail({
        tenantSlug: booking.tenantSlug,
        to: `lab@${booking.tenantSlug}.com`,
        subject: `New booking received: ${booking.id}`,
        template: 'new-booking',
        context: { booking },
      }),
    ]).catch(error => {
      // Log but don't fail the request if enqueueing fails
      this.logger.error('Failed to enqueue async jobs:', error);
    });

    // 3. Return booking immediately to client
    return booking;
  }
}
```

## Testing

Queue processors can be tested with mock jobs:

```typescript
import { Job } from 'bullmq';
import { ReportProcessor } from './report.processor';

describe('ReportProcessor', () => {
  it('should generate PDF report', async () => {
    const processor = new ReportProcessor();
    
    const mockJob = {
      id: 'job-123',
      name: 'generate-pdf-report',
      data: {
        tenantSlug: 'demo',
        bookingId: 'booking-456',
        reportTemplate: 'standard',
      },
    } as Job;

    const result = await processor.process(mockJob);
    
    expect(result.status).toBe('generated');
    expect(result.s3Path).toBeDefined();
  });
});
```

## Future Enhancements

- [ ] BullMQ Dashboard integration for web UI
- [ ] WebSocket integration for real-time job progress
- [ ] Job scheduling (cron-like recurring jobs)
- [ ] Dead letter queue for permanently failed jobs
- [ ] Rate limiting per tenant
- [ ] Job priority levels
- [ ] Custom retry strategies per job type
