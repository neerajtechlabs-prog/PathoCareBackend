import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as redis from 'redis';

type LoginAttemptRedisClient = ReturnType<typeof redis.createClient>;

export interface LoginAttemptServiceOptions {
  maxFailuresPerWindow: number;
  windowMs: number;
}

export interface AttemptOutcome {
  allowed: boolean;
  retryAfterSeconds: number;
}

interface AttemptState {
  failures: number;
  firstFailureAt: number;
}

const DEFAULT_LOGIN_ATTEMPT_OPTIONS: LoginAttemptServiceOptions = {
  maxFailuresPerWindow: 5,
  windowMs: 15 * 60 * 1000,
};

@Injectable()
export class LoginAttemptService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LoginAttemptService.name);
  private readonly attempts = new Map<string, AttemptState>();

  constructor(
    private readonly options: LoginAttemptServiceOptions = DEFAULT_LOGIN_ATTEMPT_OPTIONS,
    private readonly redisClient?: LoginAttemptRedisClient,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.redisClient || this.redisClient.isOpen) {
      return;
    }

    this.redisClient.on('error', (error) => {
      this.logger.warn(`Login attempt Redis error: ${error instanceof Error ? error.message : 'unknown error'}`);
    });

    try {
      await this.redisClient.connect();
      this.logger.log('Login attempt lockout connected to Redis');
    } catch (error) {
      this.logger.warn(`Login attempt Redis connection unavailable: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redisClient?.isOpen) {
      await this.redisClient.quit();
    }
  }

  async getStatus(tenantSlug: string, ip: string, email: string): Promise<AttemptOutcome> {
    if (this.redisClient?.isReady) {
      return this.getRedisStatus(tenantSlug, ip, email);
    }

    return this.getMemoryStatus(tenantSlug, ip, email);
  }

  async recordFailure(tenantSlug: string, ip: string, email: string): Promise<AttemptOutcome> {
    if (this.redisClient?.isReady) {
      try {
        const key = this.buildKey(tenantSlug, ip, email);
        const failures = await this.redisClient.incr(key);
        if (failures === 1) {
          await this.redisClient.expire(key, Math.ceil(this.options.windowMs / 1000));
        }

        const ttl = await this.redisClient.ttl(key);
        return this.buildOutcome(failures, ttl);
      } catch (error) {
        this.logger.warn(`Login attempt Redis write failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }

    return this.recordMemoryFailure(tenantSlug, ip, email);
  }

  async recordSuccess(tenantSlug: string, ip: string, email: string): Promise<void> {
    if (this.redisClient?.isReady) {
      try {
        await this.redisClient.del(this.buildKey(tenantSlug, ip, email));
        return;
      } catch (error) {
        this.logger.warn(`Login attempt Redis delete failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }

    this.attempts.delete(this.buildKey(tenantSlug, ip, email));
  }

  private async getRedisStatus(tenantSlug: string, ip: string, email: string): Promise<AttemptOutcome> {
    try {
      const key = this.buildKey(tenantSlug, ip, email);
      const failures = Number(await this.redisClient!.get(key) || 0);
      const ttl = await this.redisClient!.ttl(key);
      return this.buildOutcome(failures, ttl);
    } catch (error) {
      this.logger.warn(`Login attempt Redis read failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      return this.getMemoryStatus(tenantSlug, ip, email);
    }
  }

  private getMemoryStatus(tenantSlug: string, ip: string, email: string): AttemptOutcome {
    const key = this.buildKey(tenantSlug, ip, email);
    const now = Date.now();
    const current = this.attempts.get(key);

    if (!current) {
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (now - current.firstFailureAt > this.options.windowMs) {
      this.attempts.delete(key);
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (current.failures >= this.options.maxFailuresPerWindow) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((this.options.windowMs - (now - current.firstFailureAt)) / 1000),
      };
    }

    const remaining = this.options.maxFailuresPerWindow - current.failures;
    return { allowed: true, retryAfterSeconds: Math.max(0, remaining) };
  }

  private recordMemoryFailure(tenantSlug: string, ip: string, email: string): AttemptOutcome {
    const key = this.buildKey(tenantSlug, ip, email);
    const now = Date.now();
    const current = this.attempts.get(key);

    if (!current) {
      this.attempts.set(key, { failures: 1, firstFailureAt: now });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (now - current.firstFailureAt > this.options.windowMs) {
      this.attempts.set(key, { failures: 1, firstFailureAt: now });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    const failures = current.failures + 1;
    this.attempts.set(key, { failures, firstFailureAt: current.firstFailureAt });

    if (failures >= this.options.maxFailuresPerWindow) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((this.options.windowMs - (now - current.firstFailureAt)) / 1000),
      };
    }

    const remaining = this.options.maxFailuresPerWindow - failures;
    return { allowed: true, retryAfterSeconds: Math.max(0, remaining) };
  }

  private buildOutcome(failures: number, retryAfterSeconds: number): AttemptOutcome {
    if (failures >= this.options.maxFailuresPerWindow) {
      return { allowed: false, retryAfterSeconds: Math.max(0, retryAfterSeconds) };
    }

    return {
      allowed: true,
      retryAfterSeconds: Math.max(0, this.options.maxFailuresPerWindow - failures),
    };
  }

  private buildKey(tenantSlug: string, ip: string, email: string): string {
    return `auth:login-attempt:${tenantSlug}:${ip}:${email.toLowerCase()}`;
  }
}
