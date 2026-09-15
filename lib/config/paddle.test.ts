import { afterEach, describe, expect, it } from 'vitest';
import {
  PaddleConfigError,
  assertPaddlePublicConfig,
  assertPaddleServerConfig,
  getPaddlePublicConfig,
  getPaddleServerConfig,
  parsePaddleEnvironment,
} from '@/lib/config/paddle';

const KEYS = [
  'NEXT_PUBLIC_PADDLE_ENVIRONMENT',
  'NEXT_PUBLIC_PADDLE_CLIENT_TOKEN',
  'NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY',
  'NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY',
  'PADDLE_API_KEY',
  'PADDLE_WEBHOOK_SECRET',
  'PADDLE_API_VERSION',
] as const;

const snapshot: Record<string, string | undefined> = {};

function stash() {
  for (const key of KEYS) snapshot[key] = process.env[key];
}

function restore() {
  for (const key of KEYS) {
    if (snapshot[key] === undefined) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
}

function setValidPublic() {
  process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT = 'sandbox';
  process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN = 'test_token';
  process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY = 'pri_month';
  process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY = 'pri_year';
}

describe('paddle config', () => {
  stash();
  afterEach(restore);

  it('defaults to sandbox', () => {
    delete process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT;
    expect(parsePaddleEnvironment(undefined)).toBe('sandbox');
  });

  it('parses live', () => {
    expect(parsePaddleEnvironment('live')).toBe('live');
  });

  it('rejects invalid environment', () => {
    expect(() => parsePaddleEnvironment('prod')).toThrow(PaddleConfigError);
  });

  it('uses sandbox API URL', () => {
    setValidPublic();
    process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT = 'sandbox';
    expect(getPaddleServerConfig().apiBaseUrl).toBe('https://sandbox-api.paddle.com');
  });

  it('uses live API URL', () => {
    setValidPublic();
    process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT = 'live';
    expect(getPaddleServerConfig().apiBaseUrl).toBe('https://api.paddle.com');
  });

  it('rejects missing client token', () => {
    setValidPublic();
    delete process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    expect(() => assertPaddlePublicConfig(getPaddlePublicConfig())).toThrow(/missing_paddle_client_token/);
  });

  it('rejects missing server secrets', () => {
    setValidPublic();
    delete process.env.PADDLE_API_KEY;
    delete process.env.PADDLE_WEBHOOK_SECRET;
    expect(() => assertPaddleServerConfig(getPaddleServerConfig())).toThrow(/missing_paddle_api_key/);
  });
});
