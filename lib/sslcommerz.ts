import crypto from 'node:crypto';

const BASE_URL =
  process.env.SSLCOMMERZ_IS_LIVE === 'true'
    ? 'https://securepay.sslcommerz.com'
    : 'https://sandbox.sslcommerz.com';

function md5(value: string): string {
  return crypto.createHash('md5').update(value).digest('hex');
}

export async function initiatePayment(params: {
  total_amount: number;
  currency: 'USD';
  tran_id: string;
  success_url: string;
  fail_url: string;
  cancel_url: string;
  cus_name: string;
  cus_email: string;
  cus_phone: string;
  product_name: string;
}): Promise<string> {
  const body = new URLSearchParams({
    store_id: process.env.SSLCOMMERZ_STORE_ID!,
    store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD!,
    total_amount: params.total_amount.toString(),
    currency: params.currency,
    tran_id: params.tran_id,
    success_url: params.success_url,
    fail_url: params.fail_url,
    cancel_url: params.cancel_url,
    cus_name: params.cus_name,
    cus_email: params.cus_email,
    cus_phone: params.cus_phone || '00000000000',
    cus_add1: 'N/A',
    cus_city: 'N/A',
    cus_country: 'Bangladesh',
    product_name: params.product_name,
    product_category: 'subscription',
    product_profile: 'non-physical-goods',
    shipping_method: 'NO',
    num_of_item: '1',
    weight_of_items: '0',
    product_amount: params.total_amount.toString(),
    vat: '0',
    discount_amount: '0',
    convenience_fee: '0',
  });

  const res = await fetch(`${BASE_URL}/gwprocess/v4/api.php`, {
    method: 'POST',
    body,
  });
  const data = (await res.json()) as {
    status: string;
    failedreason?: string;
    GatewayPageURL?: string;
  };
  if (data.status !== 'SUCCESS')
    throw new Error(`SSLCommerz init failed: ${data.failedreason ?? 'unknown'}`);
  return data.GatewayPageURL ?? '';
}

export async function validatePayment(val_id: string): Promise<boolean> {
  const storeId = process.env.SSLCOMMERZ_STORE_ID;
  const storePass = process.env.SSLCOMMERZ_STORE_PASSWORD;
  const res = await fetch(
    `${BASE_URL}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(val_id)}&store_id=${storeId}&store_passwd=${storePass}&format=json`
  );
  const data = (await res.json()) as { status?: string };
  return data.status === 'VALID' || data.status === 'VALIDATED';
}

/**
 * Verify callback payload integrity using SSLCOMMERZ verify_sign/verify_key.
 *
 * Format is md5("k1=v1&k2=v2...&store_passwd=<md5(store_password)>").
 */
export function verifyCallbackSignature(
  payload: Record<string, string>
): boolean {
  const verifySign = payload.verify_sign?.trim().toLowerCase();
  const verifyKeysRaw = payload.verify_key?.trim();
  const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD?.trim();
  if (!verifySign || !verifyKeysRaw || !storePassword) return false;

  const keys = verifyKeysRaw
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  if (!keys.length) return false;

  const parts: string[] = [];
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'undefined') {
      return false;
    }
    parts.push(`${key}=${value}`);
  }

  parts.push(`store_passwd=${md5(storePassword)}`);
  const calculated = md5(parts.join('&'));
  return calculated === verifySign;
}
