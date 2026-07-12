import { Job, Worker } from 'bullmq';
import { BaseProcessor } from '../../queue/processors/base.processor';
import { TenantDataSourceService } from '../../../database/datasources/tenant.datasource';
import { QueueService } from '../../queue/services/queue.service';
import { TestParameterResult } from '../../../database/entities/tenant/test-parameter-result.entity';
import { TestParameter } from '../../../database/entities/tenant/test-parameter.entity';
import { Booking } from '../../../database/entities/tenant/booking.entity';
import { Lab } from '../../lab/entities/lab.entity';

export class ResultsEvaluateProcessor extends BaseProcessor {
  constructor(private tenantDSService: TenantDataSourceService, private queueService: QueueService) {
    super(ResultsEvaluateProcessor.name);
  }

  async process(job: Job): Promise<any> {
    const { tenantSlug, resultId } = job.data || {};
    if (!tenantSlug || !resultId) return { ok: false, reason: 'missing data' };

    try {
      const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);

      const paramResultRepo = tenantDS.getRepository(TestParameterResult);
      const paramResults = await paramResultRepo.find({ where: { testResultId: resultId }, relations: ['parameter'] });

      const testResultRepo = tenantDS.getRepository('test_results');
      const testResultRow: any = await testResultRepo.findOne({ where: { id: resultId } });

      let anyCritical = false;
      for (const pr of paramResults) {
        const param = (pr.parameter as TestParameter) || (await tenantDS.getRepository(TestParameter).findOne({ where: { id: pr.parameterId } }));
        // parse numeric value if possible
        const numeric = Number(pr.value);
        let isAbnormal = false;
        let isCritical = false;

        if (!Number.isNaN(numeric) && param) {
          if (param.criticalMin !== null && numeric <= param.criticalMin) isCritical = true;
          if (param.criticalMax !== null && numeric >= param.criticalMax) isCritical = true;

          if (!isCritical) {
            if (param.normalMin !== null && numeric < param.normalMin) isAbnormal = true;
            if (param.normalMax !== null && numeric > param.normalMax) isAbnormal = true;
          }
        }

        pr.isAbnormal = isAbnormal;
        pr.isCritical = isCritical;
        await paramResultRepo.save(pr);

        if (isCritical) anyCritical = true;
      }

      if (anyCritical) {
        // Resolve recipients from booking and lab config
        try {
          const bookingRepo = tenantDS.getRepository(Booking);
          let bookingRecord: any = null;
          if (testResultRow?.bookingId) {
            bookingRecord = await bookingRepo.findOne({ where: { id: testResultRow.bookingId } });
          }

          const labRepo = tenantDS.getRepository(Lab as any);
          const lab = await labRepo.findOne({ where: { isActive: true } });

          // Prepare notification targets
          const emailTargets: string[] = [];
          const phoneTargets: string[] = [];

          if (bookingRecord?.email) emailTargets.push(bookingRecord.email);
          if (lab?.email) emailTargets.push(lab.email);
          if (bookingRecord?.phone) phoneTargets.push(bookingRecord.phone);
          if (lab?.phone) phoneTargets.push(lab.phone);

          // Enqueue email + SMS + WhatsApp to targets
          for (const to of Array.from(new Set(emailTargets))) {
            await this.queueService.enqueueEmail({
              tenantSlug,
              to,
              subject: 'Critical lab result detected',
              template: 'critical_result_alert',
              context: { resultId },
              referenceId: resultId,
            });
          }

          for (const phone of Array.from(new Set(phoneTargets))) {
            await this.queueService.enqueueSms({
              tenantSlug,
              phoneNumber: phone,
              message: `Critical lab result detected for result ${resultId}`,
              recipientType: 'patient',
              referenceId: resultId,
            });

            await this.queueService.enqueueWhatsapp({
              tenantSlug,
              phoneNumber: phone,
              templateId: 'critical_result_alert_whatsapp',
              parameters: { resultId },
              referenceId: resultId,
            });
          }
        } catch (err) {
          this.logger.warn(`Failed to enqueue critical result notification: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      return { ok: true, critical: anyCritical };
    } catch (error) {
      this.logger.error('Result evaluation failed:', error as Error);
      throw error;
    }
  }

  static createWorker(redisConfig: any, tenantDSService: TenantDataSourceService, queueService: QueueService): Worker {
    return new Worker(
      'notifications', // reuse notifications queue to enqueue outgoing notifications
      async job => {
        const processor = new ResultsEvaluateProcessor(tenantDSService, queueService);
        return processor.process(job as Job);
      },
      {
        connection: redisConfig,
        concurrency: 2,
      },
    );
  }
}
