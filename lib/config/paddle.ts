export type PaddleEnvironment = 'sandbox' | 'live';

export class PaddleConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaddleConfigError';
  }
}

export type PaddlePublicConfig = {
  environment: PaddleEnvironment;
  clientToken: string;
  priceIds: {
    pro_monthly: string;
    pro_yearly: string;
  };
};

export type PaddleServerConfig = PaddlePublicConfig & {
  apiKey: string;
  webhookSecret: string;
  apiVersion: string;
  apiBaseUrl: string;
};

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? '';
}

export function parsePaddleEnvironment(raw: string | undefined): PaddleEnvironment {
  const value = raw?.trim() || 'sandbox';
  if (value === 'sandbox' || value === 'live') return value;
  throw new PaddleConfigError('invalid_paddle_environment');
}

export function getPaddlePublicConfig(): PaddlePublicConfig {
  // Next.js inlines NEXT_PUBLIC_* in the browser only for static process.env.KEY access.
  return {
    environment: parsePaddleEnvironment(process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT),
    clientToken: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim() ?? '',
    priceIds: {
      pro_monthly: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY?.trim() ?? '',
      pro_yearly: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY?.trim() ?? '',
    },
  };
}

export function getPaddleServerConfig(): PaddleServerConfig {
  const publicConfig = getPaddlePublicConfig();
  const apiVersion = readEnv('PADDLE_API_VERSION') || '1';
  return {
    ...publicConfig,
    apiKey: readEnv('PADDLE_API_KEY'),
    webhookSecret: readEnv('PADDLE_WEBHOOK_SECRET'),
    apiVersion,
    apiBaseUrl:
      publicConfig.environment === 'live'
        ? 'https://api.paddle.com'
        : 'https://sandbox-api.paddle.com',
  };
}

export function assertPaddlePublicConfig(config: PaddlePublicConfig = getPaddlePublicConfig()): PaddlePublicConfig {
  if (!config.clientToken) {
    throw new PaddleConfigError('missing_paddle_client_token');
  }
  if (!config.priceIds.pro_monthly || !config.priceIds.pro_yearly) {
    throw new PaddleConfigError('missing_paddle_price_ids');
  }
  return config;
}

export function assertPaddleServerConfig(config: PaddleServerConfig = getPaddleServerConfig()): PaddleServerConfig {
  assertPaddlePublicConfig(config);
  if (!config.apiKey) {
    throw new PaddleConfigError('missing_paddle_api_key');
  }
  if (!config.webhookSecret) {
    throw new PaddleConfigError('missing_paddle_webhook_secret');
  }
  return config;
}
