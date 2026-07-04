import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getQueuesHealth(): { queues: string; status: string } {
    return {
      queues: 'report-generation, notifications',
      status: 'ready',
    };
  }
}
