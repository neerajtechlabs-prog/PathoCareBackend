import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';
import { Report } from '../../database/entities/tenant/report.entity';
import { AuditService } from '../audit/audit.service';
import { QueueService } from '../queue/services/queue.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  private readonly tenantDataSourceService: TenantDataSourceService;

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly queueService: QueueService,
  ) {
    this.tenantDataSourceService = new TenantDataSourceService(this.configService);
  }

  async requestReport(tenantSlug: string, dto: CreateReportDto, userId: string) {
    const tenantDS = await this.tenantDataSourceService.getForTenant(tenantSlug);
    const repo = tenantDS.getRepository(Report);

    const report = repo.create({
      bookingId: dto.bookingId,
      reportType: dto.reportType || 'RESULTS',
      status: 'PENDING',
      publicToken: uuidv4(),
      requestedBy: userId,
    });

    const saved = await repo.save(report);

    try {
      await this.queueService.enqueuePdfReport({
        tenantSlug,
        bookingId: dto.bookingId,
        reportTemplate: saved.reportType,
        patientEmail: dto.patientEmail,
        patientPhone: dto.patientPhone,
        reportId: saved.id,
        publicToken: saved.publicToken || undefined,
      });

      saved.status = 'PENDING';
      await repo.save(saved);
    } catch (error) {
      saved.status = 'FAILED';
      saved.errorMessage = error instanceof Error ? error.message : 'Failed to enqueue PDF generation';
      await repo.save(saved);
    }

    await this.auditService.logEvent({
      tenantSlug,
      action: 'reports.requested',
      entityType: 'report',
      entityId: saved.id,
      userId,
      newValues: { bookingId: dto.bookingId, reportType: saved.reportType },
    });

    return saved;
  }

  async getReportStatus(tenantSlug: string, reportId: string) {
    const tenantDS = await this.tenantDataSourceService.getForTenant(tenantSlug);
    const report = await tenantDS.getRepository(Report).findOne({ where: { id: reportId } });

    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    return report;
  }

  async getPublicReportStatus(tenantSlug: string, publicToken: string) {
    const tenantDS = await this.tenantDataSourceService.getForTenant(tenantSlug);
    const report = await tenantDS.getRepository(Report).findOne({ where: { publicToken } });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return {
      id: report.id,
      bookingId: report.bookingId,
      reportType: report.reportType,
      status: report.status,
      publicToken: report.publicToken,
      downloadUrl: report.downloadUrl,
      filePath: report.filePath,
      generatedAt: report.generatedAt,
      errorMessage: report.errorMessage,
    };
  }
}
