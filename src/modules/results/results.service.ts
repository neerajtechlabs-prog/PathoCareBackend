import { Injectable, Logger } from '@nestjs/common';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';
import { AuditService } from '../audit/audit.service';
import { ResultsRepository } from './repositories/results.repository';
import { CreateTestResultDto } from './dto/create-result.dto';
import { QueueService } from '../queue/services/queue.service';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class ResultsService {
  private readonly logger = new Logger(ResultsService.name);

  constructor(
    private readonly tenantDSService: TenantDataSourceService,
    private readonly auditService: AuditService,
    private readonly resultsRepository: ResultsRepository,
    private readonly queueService: QueueService,
  ) {}

  async create(tenantSlug: string, dto: CreateTestResultDto, userId: string) {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);

    const testResult = await tenantDS.manager.transaction(async () => {
      const saved = await this.resultsRepository.createTestResult(tenantDS, {
        bookingId: dto.bookingId,
        testId: dto.testId,
        status: 'COMPLETED',
      } as any);

      for (const p of dto.parameters) {
        await this.resultsRepository.createParameterResult(tenantDS, {
          testResultId: saved.id,
          parameterId: p.parameterId,
          value: p.value,
        } as any);
      }

      return saved;
    });

    await this.auditService.logEvent({ tenantSlug, action: 'results.created', entityType: 'test_result', entityId: testResult.id, userId, newValues: { bookingId: dto.bookingId, testId: dto.testId } });

    // Enqueue evaluation for abnormal/critical detection & notifications
    try {
      await this.queueService.enqueueNotificationJob('results.evaluate', { tenantSlug, resultId: testResult.id });
    } catch (err) {
      this.logger.warn(`Failed to enqueue result evaluation: ${err instanceof Error ? err.message : 'unknown'}`);
    }

    return testResult;
  }

  async verify(tenantSlug: string, resultId: string, userId: string) {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const repo = tenantDS.getRepository('test_results');
    const existing: any = await repo.findOne({ where: { id: resultId } });
    if (!existing) throw new NotFoundException(`Test result ${resultId} not found`);

    existing.isVerified = true;
    existing.verifiedBy = userId;
    await repo.save(existing);

    await this.auditService.logEvent({ tenantSlug, action: 'results.verified', entityType: 'test_result', entityId: resultId, userId, oldValues: { isVerified: false }, newValues: { isVerified: true } });

    return existing;
  }
}
