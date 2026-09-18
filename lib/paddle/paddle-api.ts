import { ApiError } from '@paddle/paddle-node-sdk';
import { BillingError, paddleUserMessage } from '@/lib/paddle/errors';
import { paddleLog } from '@/lib/paddle/log';

export function wrapPaddle<T>(work: () => Promise<T>): Promise<T> {
  return work().catch((error: unknown) => {
    paddleLog('paddle_api_error', {
      name: error instanceof Error ? error.name : 'error',
      detail: error instanceof ApiError ? error.detail : undefined,
      code: error instanceof ApiError ? error.code : undefined,
    });
    if (error instanceof BillingError) throw error;
    if (error instanceof ApiError) {
      throw new BillingError('paddle_unavailable', paddleUserMessage('paddle_unavailable'), 502);
    }
    throw new BillingError('paddle_unavailable', paddleUserMessage('paddle_unavailable'), 502);
  });
}
