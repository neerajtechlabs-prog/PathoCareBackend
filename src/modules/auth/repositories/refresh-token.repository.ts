import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as argon2 from 'argon2';
import { RefreshToken } from '../../../database/entities/tenant/refresh-token.entity';

@Injectable()
export class RefreshTokenRepository {
  private readonly logger = new Logger(RefreshTokenRepository.name);

  constructor() {}

  /**
   * Create and store a new refresh token
   */
  async create(
    tenantDS: DataSource,
    userId: string,
    family: string,
    expiresAt: Date,
    tokenString: string,
  ): Promise<RefreshToken> {
    try {
      const tokenHash = await argon2.hash(tokenString, {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });

      const token = tenantDS.getRepository(RefreshToken).create({
        id: uuidv4(),
        userId,
        tokenHash,
        family,
        revoked: false,
        expiresAt,
      });

      return await tenantDS.getRepository(RefreshToken).save(token);
    } catch (error) {
      this.logger.error(`Failed to create refresh token for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Validate a refresh token against stored hash
   */
  async validate(tenantDS: DataSource, userId: string, tokenString: string): Promise<RefreshToken | null> {
    try {
      const token = await tenantDS.getRepository(RefreshToken).findOne({
        where: {
          userId,
          revoked: false,
        },
        order: {
          createdAt: 'DESC',
        },
      });

      if (!token) {
        return null;
      }

      // Check expiration
      if (token.expiresAt < new Date()) {
        return null;
      }

      // Verify token hash
      const isValid = await argon2.verify(token.tokenHash, tokenString);
      if (!isValid) {
        return null;
      }

      return token;
    } catch (error) {
      this.logger.error(`Failed to validate refresh token for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Revoke a refresh token and all tokens in its family (for rotation compromise)
   */
  async revoke(tenantDS: DataSource, tokenId: string): Promise<void> {
    try {
      const token = await tenantDS.getRepository(RefreshToken).findOne({
        where: { id: tokenId },
      });

      if (!token) {
        return;
      }

      // Revoke all tokens in the same family (rotation chain)
      await tenantDS.getRepository(RefreshToken).update(
        { family: token.family },
        {
          revoked: true,
          revokedAt: new Date(),
        },
      );

      this.logger.debug(`Revoked token family ${token.family} for user ${token.userId}`);
    } catch (error) {
      this.logger.error(`Failed to revoke refresh token ${tokenId}:`, error);
      throw error;
    }
  }

  /**
   * Revoke all tokens for a user (logout from all devices)
   */
  async revokeAllForUser(tenantDS: DataSource, userId: string): Promise<void> {
    try {
      await tenantDS.getRepository(RefreshToken).update(
        { userId },
        {
          revoked: true,
          revokedAt: new Date(),
        },
      );

      this.logger.debug(`Revoked all tokens for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to revoke all tokens for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get active refresh tokens for a user (for device management)
   */
  async findActiveForUser(tenantDS: DataSource, userId: string): Promise<RefreshToken[]> {
    try {
      return await tenantDS.getRepository(RefreshToken).find({
        where: {
          userId,
          revoked: false,
        },
        order: {
          createdAt: 'DESC',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to fetch active tokens for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpired(tenantDS: DataSource): Promise<number> {
    try {
      const result = await tenantDS
        .getRepository(RefreshToken)
        .createQueryBuilder()
        .delete()
        .where('expires_at < NOW()', {})
        .execute();
      const deleted = result.affected || 0;
      this.logger.debug(`Cleaned up ${deleted} expired refresh tokens`);
      return deleted;
    } catch (error) {
      this.logger.error('Failed to cleanup expired tokens:', error);
      return 0;
    }
  }
}
