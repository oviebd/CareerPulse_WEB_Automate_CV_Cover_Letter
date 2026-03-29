import { Resend } from 'resend';

export async function sendPaymentReceiptEmail(params: {
  to: string;
  plan: string;
  amount: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return;
  const resend = new Resend(key);
  await resend.emails.send({
    from,
    to: params.to,
    subject: 'Payment received — CV & Cover Letter',
    text: `Thank you. Plan: ${params.plan}. Amount: ${params.amount} USD.`,
  });
}
