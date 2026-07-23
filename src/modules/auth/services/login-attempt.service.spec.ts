import { LoginAttemptService } from './login-attempt.service';

describe('LoginAttemptService', () => {
  it('blocks a tenant/ip/email pair after repeated failures', async () => {
    const service = new LoginAttemptService({
      maxFailuresPerWindow: 3,
      windowMs: 15 * 60 * 1000,
    });

    for (let index = 0; index < 2; index += 1) {
      const result = await service.recordFailure('demo', '127.0.0.1', 'demo@pathcare.local');
      expect(result.allowed).toBe(true);
    }

    const blocked = await service.recordFailure('demo', '127.0.0.1', 'demo@pathcare.local');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('locks an account after repeated failures', async () => {
    const service = new LoginAttemptService({
      maxFailuresPerWindow: 5,
      windowMs: 15 * 60 * 1000,
    });

    let outcome = { allowed: true, retryAfterSeconds: 0 };
    for (let index = 0; index < 5; index += 1) {
      outcome = await service.recordFailure('demo', '127.0.0.1', 'demo@pathcare.local');
    }

    expect(outcome.allowed).toBe(false);
    expect(outcome.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('resets counters after a successful login', async () => {
    const service = new LoginAttemptService({
      maxFailuresPerWindow: 2,
      windowMs: 15 * 60 * 1000,
    });

    expect((await service.recordFailure('demo', '127.0.0.1', 'demo@pathcare.local')).allowed).toBe(true);
    await service.recordSuccess('demo', '127.0.0.1', 'demo@pathcare.local');

    const nextAttempt = await service.recordFailure('demo', '127.0.0.1', 'demo@pathcare.local');
    expect(nextAttempt.allowed).toBe(true);
  });
});
