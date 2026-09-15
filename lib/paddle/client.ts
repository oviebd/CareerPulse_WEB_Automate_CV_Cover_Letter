import { Environment, Paddle } from '@paddle/paddle-node-sdk';
import {
  assertPaddleServerConfig,
  getPaddleServerConfig,
} from '@/lib/config/paddle';
import { paddleLog } from '@/lib/paddle/log';

let paddle: Paddle | null = null;
let cachedKey: string | null = null;

export function resetPaddleClient(): void {
  paddle = null;
  cachedKey = null;
}

export function getPaddleClient(): Paddle {
  const config = assertPaddleServerConfig();
  if (!paddle || cachedKey !== config.apiKey) {
    paddle = new Paddle(config.apiKey, {
      environment:
        config.environment === 'live' ? Environment.production : Environment.sandbox,
      customHeaders: {
        'Paddle-Version': config.apiVersion,
      },
    });
    cachedKey = config.apiKey;
    paddleLog('paddle_client_initialized', { environment: config.environment });
  }
  return paddle;
}
