export type CookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge?: number;
  domain?: string;
};

const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeDomain(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === 'localhost' || trimmed === '127.0.0.1') {
    return undefined;
  }

  return trimmed;
}

export function getRefreshCookieOptions(env: NodeJS.ProcessEnv = process.env): CookieOptions {
  const isProduction = env.NODE_ENV === 'production';
  const domain = normalizeDomain(env.COOKIE_DOMAIN);

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: DEFAULT_MAX_AGE_MS,
    ...(domain ? { domain } : {}),
  };
}

export function clearRefreshCookieOptions(env: NodeJS.ProcessEnv = process.env): CookieOptions {
  const options = getRefreshCookieOptions(env);
  delete options.maxAge;
  return options;
}
