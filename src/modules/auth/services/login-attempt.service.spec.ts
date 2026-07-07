import { LoginAttemptService } from './login-attempt.service';

describe('LoginAttemptService', () => {
  it('blocks an ip/email pair after repeated failures', () => {
    const service = new LoginAttemptService({
      maxFailuresPerWindow: 3,
      windowMs: 15 * 60 * 1000,
    });

    for (let index = 0; index < 3; index += 1) {
      const result = service.recordFailure('127.0.0.1', 'demo@pathcare.local');
      expect(result.allowed).toBe(true);
    }

    const blocked = service.recordFailure('127.0.0.1', 'demo@pathcare.local');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('locks an account after repeated failures', () => {
    const service = new LoginAttemptService({
      maxFailuresPerWindow: 5,
      windowMs: 15 * 60 * 1000,
    });

    let outcome = { allowed: true, retryAfterSeconds: 0 };
    for (let index = 0; index < 5; index += 1) {
      outcome = service.recordFailure('127.0.0.1', 'demo@pathcare.local');
    }

    expect(outcome.allowed).toBe(false);
    expect(outcome.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('resets counters after a successful login', () => {
    const service = new LoginAttemptService({
      maxFailuresPerWindow: 2,
      windowMs: 15 * 60 * 1000,
    });

    expect(service.recordFailure('127.0.0.1', 'demo@pathcare.local').allowed).toBe(true);
    service.recordSuccess('127.0.0.1', 'demo@pathcare.local');

    const nextAttempt = service.recordFailure('127.0.0.1', 'demo@pathcare.local');
    expect(nextAttempt.allowed).toBe(true);
  });
});
