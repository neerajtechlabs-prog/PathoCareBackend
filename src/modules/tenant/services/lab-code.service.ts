import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PublicDataSourceService } from '../../../database/datasources/public.datasource';

/**
 * Lab Code Service
 * Generates unique lab codes for tenants with collision retry logic.
 * Format: 'PCL' prefix + 6 random alphanumeric uppercase (excludes 0, O, 1, I for clarity)
 * Total: 9 characters
 * Collision handling: Retries up to 5 times before throwing ConflictException
 */
@Injectable()
export class LabCodeService {
  private readonly logger = new Logger(LabCodeService.name);
  private readonly PREFIX = 'PCL';
  private readonly CODE_LENGTH = 6;
  private readonly ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes 0, O, 1, I
  private readonly MAX_RETRIES = 5;

  constructor(private readonly publicDataSourceService: PublicDataSourceService) {}

  /**
   * Generate a unique lab code
   * Retries up to MAX_RETRIES times if collision occurs
   * @returns Generated lab code (e.g., 'PCL12AB3C')
   * @throws ConflictException if max retries exceeded
   */
  async generateUniqueLabCode(): Promise<string> {
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      const labCode = this.generateLabCodeSync();

      const ds = this.publicDataSourceService.getDataSource();
      const existing = await ds.query<{ id: string }[]>(
        'SELECT id FROM public.tenants WHERE lab_code = $1 LIMIT 1',
        [labCode],
      );

      if (existing.length === 0) {
        this.logger.log(`Generated unique lab code: ${labCode} (attempt ${attempt})`);
        return labCode;
      }

      this.logger.warn(`Lab code collision for ${labCode}, retrying (attempt ${attempt}/${this.MAX_RETRIES})`);
    }

    throw new ConflictException(
      `Failed to generate unique lab code after ${this.MAX_RETRIES} attempts. Please try again.`,
    );
  }

  /**
   * Synchronously generate a random lab code (without collision checking)
   * Format: PCL + 6 random alphanumeric
   * @returns Random lab code string
   */
  private generateLabCodeSync(): string {
    let code = '';
    for (let i = 0; i < this.CODE_LENGTH; i++) {
      const randomIndex = randomBytes(1)[0] % this.ALPHABET.length;
      code += this.ALPHABET[randomIndex];
    }
    return this.PREFIX + code;
  }

  /**
   * Validate lab code format
   * @param labCode Lab code to validate
   * @returns true if valid format
   */
  validateLabCodeFormat(labCode: string): boolean {
    if (!labCode || typeof labCode !== 'string') {
      return false;
    }
    const labCodeRegex = new RegExp(`^${this.PREFIX}[${this.ALPHABET}]{${this.CODE_LENGTH}}$`);
    return labCodeRegex.test(labCode);
  }
}
