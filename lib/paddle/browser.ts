'use client';

import {
  CheckoutEventNames,
  initializePaddle,
  type Paddle,
} from '@paddle/paddle-js';
import { assertPaddlePublicConfig } from '@/lib/config/paddle';
import { paddleLog } from '@/lib/paddle/log';

let paddlePromise: Promise<Paddle | undefined> | null = null;
let initializedToken: string | null = null;

export function resetPaddleBrowser(): void {
  paddlePromise = null;
  initializedToken = null;
}

export function getBrowserPaddle(): Promise<Paddle | undefined> {
  const config = assertPaddlePublicConfig();
  if (paddlePromise && initializedToken !== config.clientToken) {
    resetPaddleBrowser();
  }
  if (!paddlePromise) {
    initializedToken = config.clientToken;
    paddlePromise = initializePaddle({
      token: config.clientToken,
      environment: config.environment === 'sandbox' ? 'sandbox' : 'production',
      checkout: {
        settings: {
          displayMode: 'overlay',
        },
      },
    }).catch((error: unknown) => {
      paddleLog('paddle_api_error', { where: 'initialize' });
      resetPaddleBrowser();
      throw error;
    });
  }
  return paddlePromise;
}

export type CheckoutResult = 'completed' | 'closed' | 'error';

const CLOSE_GRACE_MS = 500;

export async function openPaddleCheckout(input: {
  priceId: string;
  email: string;
  customerId?: string | null;
  customData: Record<string, unknown>;
}): Promise<CheckoutResult> {
  const paddle = await getBrowserPaddle();
  if (!paddle) {
    throw new Error('Paddle failed to initialize');
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let closeTimer: ReturnType<typeof setTimeout> | null = null;
    const finish = (result: CheckoutResult) => {
      if (settled) return;
      settled = true;
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
      resolve(result);
    };

    paddle.Update({
      eventCallback: (event) => {
        if (event.name === CheckoutEventNames.CHECKOUT_COMPLETED) {
          paddleLog('checkout_completed', {});
          finish('completed');
        } else if (event.name === CheckoutEventNames.CHECKOUT_CLOSED) {
          // Overlay often fires closed before/with completed after a successful pay.
          if (closeTimer) return;
          closeTimer = setTimeout(() => finish('closed'), CLOSE_GRACE_MS);
        } else if (
          event.name === CheckoutEventNames.CHECKOUT_ERROR ||
          event.name === CheckoutEventNames.CHECKOUT_FAILED
        ) {
          const data = event.data as { error?: unknown } | undefined;
          paddleLog('paddle_api_error', {
            where: 'checkout',
            name: event.name,
            error: data && typeof data === 'object' ? data.error ?? data : undefined,
          });
          finish('error');
        }
      },
    });

    try {
      paddle.Checkout.open({
        items: [{ priceId: input.priceId, quantity: 1 }],
        customData: input.customData,
        customer: input.customerId ? { id: input.customerId } : { email: input.email },
        settings: {
          displayMode: 'overlay',
        },
      });
    } catch (error) {
      reject(error);
    }
  });
}
