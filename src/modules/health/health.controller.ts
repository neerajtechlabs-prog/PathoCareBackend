import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('queues')
  @ApiOperation({ summary: 'Check queue health - TODO: Full implementation in Week 4' })
  getQueuesHealth(): { queues: string; status: string } {
    return this.healthService.getQueuesHealth();
  }
}
