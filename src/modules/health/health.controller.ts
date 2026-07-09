import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { QueueService } from '../queue/services/queue.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly queueService: QueueService,
  ) {}

  @Get('db')
  @ApiOperation({ summary: 'Check database health' })
  async getDbHealth(): Promise<any> {
    return this.healthService.getDbHealth();
  }

  @Get('queues')
  @ApiOperation({ summary: 'Check all queue health and statistics' })
  async getQueuesHealth(): Promise<any> {
    return this.queueService.getQueueStats();
  }

  @Get('redis')
  @ApiOperation({ summary: 'Check Redis connection health' })
  async getRedisHealth(): Promise<any> {
    return this.healthService.getRedisHealth();
  }
}
