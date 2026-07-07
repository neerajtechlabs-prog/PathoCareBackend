import { Injectable } from '@nestjs/common';

export interface LoginAttemptServiceOptions {
  maxFailuresPerWindow: number;
  windowMs: number;
}

interface AttemptOutcome {
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
export class LoginAttemptService {
  private readonly attempts = new Map<string, AttemptState>();

  constructor(private readonly options: LoginAttemptServiceOptions = DEFAULT_LOGIN_ATTEMPT_OPTIONS) {}

  getStatus(ip: string, email: string): AttemptOutcome {
    const key = this.buildKey(ip, email);
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

  recordFailure(ip: string, email: string): AttemptOutcome {
    const key = this.buildKey(ip, email);
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

  recordSuccess(ip: string, email: string): void {
    this.attempts.delete(this.buildKey(ip, email));
  }

  private buildKey(ip: string, email: string): string {
    return `${ip}:${email.toLowerCase()}`;
  }
}
