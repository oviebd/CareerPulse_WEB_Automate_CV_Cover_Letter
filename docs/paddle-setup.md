# Paddle setup for CareerPulse

CareerPulse uses **Paddle Billing** as Merchant of Record. Sandbox and Live are separate accounts with separate products, prices, customers, and notification destinations. Do not mix credentials.

Webhook URL (replace with your public origin):

```text
{NEXT_PUBLIC_APP_URL}/api/webhooks/paddle
```

Example local tunnel: `https://your-tunnel.example/api/webhooks/paddle`

---

## Step 1 — Create a Paddle account

1. Start in **Paddle Sandbox**: [https://sandbox-vendors.paddle.com](https://sandbox-vendors.paddle.com)
2. After sandbox checkout, webhooks, and cancellation work, create or switch to a **Paddle Live** account. Live requires Paddle seller approval.

---



## Step 2 — Create the product

Paddle Dashboard → **Catalog** → **Products** → create:

- Name: `CareerPulse Pro`
- Tax category: standard digital / SaaS as advised by Paddle

Record `product_id` (`pro_...`).

---



## Step 3 — Create prices

On that product, create two recurring prices:


| CareerPulse plan | Billing cycle | Suggested amount |
| ---------------- | ------------- | ---------------- |
| Pro Monthly      | month         | USD 9.99         |
| Pro Yearly       | year          | USD 89.99        |


Optional: add a trial on the Paddle price (CareerPulse does not implement a separate frontend trial timer).

Record:

```text
NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY=pri_...
NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY=pri_...
```

Never put `pri_...` in React components. The server maps `plan=pro` + `billingInterval=monthly|yearly` to these IDs.

---



## Step 4 — Client-side token

**Developer Tools → Authentication → Client-side tokens → New**

- Sandbox token starts with `test_`
- Live token starts with `live_`

```text
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=
NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox
```

These are public (Paddle.js) and are baked into the Next.js client bundle at **Docker/CI build time**.

---



## Step 5 — API key

**Developer Tools → Authentication → API keys → New**

Server-only. Grant the minimum: subscriptions read/write, customer portal sessions write, transactions read.

```text
PADDLE_API_KEY=
```

Never put this in `NEXT_PUBLIC_*`, frontend code, or GitHub Actions **variables** (use VPS `.env.prod` only).

---



## Step 6 — Webhook destination

**Developer Tools → Notifications → New destination**

- Type: URL
- URL: `{NEXT_PUBLIC_APP_URL}/api/webhooks/paddle`
- Events (minimum):
  - `customer.created`
  - `customer.updated`
  - `transaction.completed`
  - `transaction.payment_failed`
  - `subscription.created`
  - `subscription.updated`
  - `subscription.canceled`
  - `subscription.past_due`
  - `subscription.paused`
  - `subscription.resumed`
  - `subscription.trialing`
  - `subscription.activated`

Copy the destination secret:

```text
PADDLE_WEBHOOK_SECRET=
```

For local development, use a public tunnel (Paddle cannot call `localhost`). Simulate events from the dashboard after the destination is reachable.

---



## Step 7 — Default payment link (required)

Overlay checkout returns **400** (`transaction_default_checkout_url_not_set`) until this is set.

Paddle Dashboard → **Checkout** → **Checkout settings** → **Default payment link**:

- Sandbox local: `http://localhost:3000`
- Production: the same HTTPS origin as `NEXT_PUBLIC_APP_URL`

Sandbox: [https://sandbox-vendors.paddle.com/checkout-settings](https://sandbox-vendors.paddle.com/checkout-settings)

Also add that host under **Checkout → Website approval** if the dashboard asks for it.

---



## Environment variables

See `[.env.example](../.env.example)`. Public Paddle values must be set as GitHub Actions **variables** so CI can bake them into the image. Secrets stay in VPS `.env.prod`.

```text
NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=
NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY=
NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY=
PADDLE_API_KEY=
PADDLE_WEBHOOK_SECRET=
PADDLE_API_VERSION=1
```

---



## Sandbox testing

Use Paddle test cards from the current Paddle sandbox docs. Verify:

- Successful payment
- Declined payment
- 3DS
- Subscription created (webhook → `profiles.subscription_tier = pro`)
- Cancellation at period end (premium remains until the period date)
- Duplicate webhook delivery (second delivery is ignored)

Checkout success in the browser does **not** grant Premium. The webhook does.

---



## Go-live checklist

Sandbox data does not copy to Live.

- [ ] Paddle Live account approved
- [ ] Live product created
- [ ] Live monthly and yearly prices created
- [ ] Live client-side token created
- [ ] Live API key created
- [ ] Live webhook destination created
- [ ] Live webhook secret in production `.env.prod`
- [ ] GitHub variables updated for `NEXT_PUBLIC_PADDLE_*` and a new image built
- [ ] Production domain approved in Paddle
- [ ] Production checkout tested
- [ ] Webhook signature verified
- [ ] Subscription activation tested
- [ ] Cancellation tested
- [ ] Failed payment / past_due banner checked
- [ ] Logs checked (`paddle_webhook_processed`, no secrets)

---



## Troubleshooting


| Symptom                | Likely cause                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| Checkout does not open | Missing `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` or domain not approved                                |
| Overlay 400 `transaction-checkout` | Default payment link not set. Use `http://localhost:3000` in sandbox Checkout settings |
| Paid but still Free    | Webhook URL not reachable, signature secret mismatch, or `careerPulseUserId` missing            |
| Signature failures     | Body was parsed before verification, or `PADDLE_WEBHOOK_SECRET` is from a different destination |
| 503 on checkout        | Price IDs or client token missing in this environment                                           |
| Sandbox vs live mixups | Different products/prices/keys per environment                                                  |


