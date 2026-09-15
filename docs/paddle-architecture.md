# Paddle architecture in CareerPulse

Paddle is the payment authority. CareerPulse stores a local copy of subscription state for authorization so product features do not call Paddle on every request.

```text
User → Pricing / Settings Billing
     → POST /api/billing/checkout (plan + interval, never a raw price id)
     → Paddle.js overlay
     → Paddle charges the customer
     → POST /api/webhooks/paddle (signature verified on the raw body)
     → subscriptions + profiles.subscription_*
     → FeatureGate / DOCX / ATS / premium templates
```

Checkout completion in the browser only refreshes session. It does not write `subscription_tier`.

## Identity mapping

Authenticated user id is `users.id` = `profiles.id` = `session.user.id` (UUID).

Checkout `customData`:

```json
{
  "careerPulseUserId": "<uuid>",
  "source": "career_pulse_web",
  "plan": "pro_monthly"
}
```

Webhooks resolve the user in this order:

1. `custom_data.careerPulseUserId`
2. `subscriptions.paddle_subscription_id`
3. `subscriptions.paddle_customer_id`

Email is never used as the sole identifier.

## Local state

| Store | Role |
|---|---|
| `profiles.subscription_tier/status/expires_at` | Authorization cache used by existing feature checks |
| `subscriptions` | Paddle ids, interval, cancel-at-period-end, last event time |
| `paddle_webhook_events` | Idempotency (`event_id`) |
| `payments` | Transaction history (Paddle transaction id in `tran_id`) |

Promo codes and admin plan overrides still write `profiles` directly. They do not create a Paddle subscription. Cancel for those accounts is local and immediate.

## Premium access

`hasPremiumAccess` in `lib/access/premium.ts`:

- `active`, `trialing`, `past_due` + tier `pro` → premium
- `cancelled` + future `subscription_expires_at` → premium until that date
- `paused` / `inactive` / expired → no premium
- Promo/admin with `expires_at = null` and `active` → premium

## Configuration

All Paddle env access goes through [`lib/config/paddle.ts`](../lib/config/paddle.ts).

- Public: `NEXT_PUBLIC_PADDLE_*` (client token + price ids)
- Server: `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_API_VERSION`

API calls pin `Paddle-Version` via the Node SDK `customHeaders`.

## Services

| Module | Responsibility |
|---|---|
| `lib/paddle/client.ts` | Single Paddle SDK client |
| `lib/paddle/plans.ts` | Allowlist `pro` + `monthly\|yearly` → price id |
| `lib/paddle/subscription-service.ts` | Checkout payload, cancel, change plan, portal |
| `lib/paddle/webhook-service.ts` | Verify `Paddle-Signature` then process |
| `lib/paddle/browser.ts` | Paddle.js init + overlay checkout |

Authenticated billing routes always use `getSessionUser()`. Clients cannot submit another user's `userId`, `subscriptionId`, or `customerId`.
