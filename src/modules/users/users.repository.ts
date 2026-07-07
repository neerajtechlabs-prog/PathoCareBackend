import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../../database/entities/tenant/user.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersRepository {
  private readonly logger = new Logger(UsersRepository.name);

  constructor(private readonly auditService: AuditService) {}

  /**
   * Find user by email in a specific tenant schema
   */
  async findByEmail(tenantDS: DataSource, email: string): Promise<User | null> {
    try {
      const user = await tenantDS.getRepository(User).findOne({
        where: { email },
      });
      return user || null;
    } catch (error) {
      this.logger.error(`Failed to find user by email ${email}:`, error);
      return null;
    }
  }

  /**
   * Find user by ID in a specific tenant schema
   */
  async findById(tenantDS: DataSource, id: string): Promise<User | null> {
    try {
      const user = await tenantDS.getRepository(User).findOne({
        where: { id },
      });
      return user || null;
    } catch (error) {
      this.logger.error(`Failed to find user by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Create a new user in a specific tenant schema
   */
  async create(
    tenantDS: DataSource,
    email: string,
    name: string,
    passwordHash: string,
    role: UserRole = UserRole.RECEPTIONIST,
  ): Promise<User> {
    try {
      const user = tenantDS.getRepository(User).create({
        email,
        name,
        passwordHash,
        role,
        isActive: true,
      });
      const createdUser = await tenantDS.getRepository(User).save(user);

      const tenantSlug = (tenantDS.options as { schema?: string }).schema?.replace('tenant_', '') || 'unknown';
      void this.auditService.logEvent({
        tenantSlug,
        action: 'users.created',
        entityType: 'users',
        entityId: createdUser.id,
        userId: createdUser.id,
        userEmail: createdUser.email,
        role: createdUser.role,
        newValues: { name, role },
      });

      return createdUser;
    } catch (error) {
      this.logger.error(`Failed to create user ${email}:`, error);
      throw error;
    }
  }

  /**
   * List all active users in a tenant schema
   */
  async findActive(tenantDS: DataSource): Promise<User[]> {
    try {
      return await tenantDS.getRepository(User).find({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error('Failed to list active users:', error);
      return [];
    }
  }
}
