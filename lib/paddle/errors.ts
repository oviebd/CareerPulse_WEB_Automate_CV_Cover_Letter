export class BillingError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = 'BillingError';
    this.code = code;
    this.status = status;
  }
}

export function paddleUserMessage(code: string): string {
  switch (code) {
    case 'invalid_plan':
      return 'That plan is not available.';
    case 'unauthorized':
      return 'Please sign in to manage billing.';
    case 'subscription_not_found':
      return 'No subscription was found for your account.';
    case 'customer_not_found':
      return 'Billing details are not available yet.';
    case 'scheduled_change':
      return 'A plan change is already scheduled. Try again after it takes effect.';
    case 'same_plan':
      return 'You are already on this plan.';
    case 'paddle_unavailable':
      return 'Billing is temporarily unavailable. Please try again.';
    case 'not_configured':
      return 'Billing is not configured yet.';
    default:
      return 'Something went wrong with billing. Please try again.';
  }
}
