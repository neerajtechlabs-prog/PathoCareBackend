/**
 * Queue job types and definitions
 */

export enum QueueName {
  REPORTS = 'reports',
  NOTIFICATIONS = 'notifications',
  EXPORTS = 'exports',
}

export enum JobType {
  // Report generation
  GENERATE_PDF_REPORT = 'generate-pdf-report',

  // Notifications
  SEND_SMS = 'send-sms',
  SEND_EMAIL = 'send-email',
  SEND_WHATSAPP = 'send-whatsapp',

  // Exports
  EXPORT_RESULTS_CSV = 'export-results-csv',
  EXPORT_MIS_EXCEL = 'export-mis-excel',
}

/**
 * Report generation job data
 */
export interface GeneratePdfReportJobData {
  tenantSlug: string;
  bookingId: string;
  reportTemplate: string;
  patientEmail?: string;
  patientPhone?: string;
}

/**
 * SMS notification job data
 */
export interface SendSmsJobData {
  tenantSlug: string;
  phoneNumber: string;
  message: string;
  recipientType: 'patient' | 'doctor' | 'staff';
  referenceId?: string;
}

/**
 * Email notification job data
 */
export interface SendEmailJobData {
  tenantSlug: string;
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
  referenceId?: string;
}

/**
 * WhatsApp notification job data
 */
export interface SendWhatsappJobData {
  tenantSlug: string;
  phoneNumber: string;
  templateId: string;
  parameters: Record<string, string>;
  referenceId?: string;
}

/**
 * CSV export job data
 */
export interface ExportResultsCsvJobData {
  tenantSlug: string;
  userId: string;
  filters: Record<string, any>;
  exportType: 'all' | 'today' | 'custom_range';
  startDate?: string;
  endDate?: string;
}

/**
 * MIS report export job data
 */
export interface ExportMisExcelJobData {
  tenantSlug: string;
  userId: string;
  reportType: 'daily' | 'weekly' | 'monthly';
  period: string; // e.g., "2026-07", "2026-W28"
}

/**
 * Generic job result for logging
 */
export interface JobResult {
  jobId: string;
  status: 'completed' | 'failed';
  data?: Record<string, any>;
  error?: string;
  duration: number; // ms
}
