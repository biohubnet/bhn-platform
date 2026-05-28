# Stripe setup — paid event ticketing

This project uses [Stripe Checkout](https://stripe.com/docs/payments/checkout)
for paid event tickets. Free tiers (priceCents = 0) work without Stripe.

## Setup checklist

### 1. Create a Stripe account
At [stripe.com](https://stripe.com). Test mode is fine until you're ready
to charge real money.

### 2. Get an API secret key
Dashboard → **Developers** → **API keys** → copy the Secret key (`sk_test_…`).

### 3. Set up the webhook endpoint

Dashboard → **Developers** → **Webhooks** → **Add endpoint**:

- **Endpoint URL**: `https://<your-vercel-domain>/api/webhooks/stripe`
- **Events to send**: `checkout.session.completed` (minimum)
- After saving, copy the **Signing secret** (`whsec_…`).

### 4. Set Vercel env vars

In Vercel dashboard → Project → Settings → Environment Variables, for both
**Production** and **Preview**:

```
STRIPE_SECRET_KEY      = sk_test_…   (or sk_live_… for prod)
STRIPE_WEBHOOK_SECRET  = whsec_…
```

Then trigger a redeploy so the new env is picked up.

### 5. Configure ticket tiers in the BHN admin

Go to `/admin/events/<slug>/tickets` and add tiers — e.g.:

- Standard — $40 CAD
- Student — $20 CAD
- Industry — $100 CAD

Free tiers (price = $0) are also valid; they short-circuit Stripe and
land in the registration flow directly.

## How the flow runs

```
Visitor → /events/<slug>/register
        ↓
        Pick a ticket tier
        ↓
        POST /api/events/<slug>/checkout
        ↓
        Stripe Checkout (hosted page)
        ↓ payment lands
        Stripe → POST /api/webhooks/stripe
        ↓ (signature verified)
        Create Registration row, paymentStatus="paid"
        ↓ user redirected to
        /events/<slug>/register/success?session_id=…
        ↓
        Success page resolves registration via externalPaymentId
```

## Testing locally

Use the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# copy the displayed whsec_… into your local .env.local
```

Then use test card `4242 4242 4242 4242` with any future expiry + CVC.

## Refunds

Refunds run through the Stripe dashboard for now (Refund button on the
PaymentIntent). The webhook handler doesn't yet listen for
`charge.refunded` — Phase 4+ work.

## What's NOT scoped yet

- Multiple ticket quantities per purchase (each Checkout buys 1 ticket)
- Coupon codes
- Discounted access to free tiers based on the buyer's role
- Refund automation (sync via webhook)

These are all straightforward additions once the base flow is proven in
production.
