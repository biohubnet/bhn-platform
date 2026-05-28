/**
 * Stripe helper module.
 *
 * Wraps the Stripe SDK with three things the rest of the codebase
 * needs:
 *   1. A lazy-initialised client (so importing this module on cold
 *      start doesn't error when STRIPE_SECRET_KEY isn't set yet).
 *   2. A `stripeConfigured()` predicate matching mailConfigured().
 *   3. A helper that creates a Checkout session for an event
 *      registration purchase.
 *
 * Env vars expected:
 *   STRIPE_SECRET_KEY      — sk_test_… or sk_live_…
 *   STRIPE_WEBHOOK_SECRET  — whsec_… (from Stripe dashboard webhook)
 *
 * Until those env vars are set on Vercel, the events code falls back
 * to the free-registration flow (no ticket picker rendered, checkout
 * endpoint returns 503).
 */
import Stripe from "stripe";

let cached: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function stripeClient(): Stripe {
  if (cached) return cached;
  if (!stripeConfigured()) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY on Vercel (see docs/stripe-setup.md).",
    );
  }
  cached = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    typescript: true,
  });
  return cached;
}

export interface CheckoutInput {
  /** TicketType row — drives line item + currency. */
  ticketType: {
    id: string;
    name: string;
    description: string | null;
    priceCents: number;
    currency: string;
    stripePriceId: string | null;
  };
  /** Event the ticket belongs to — drives the product name. */
  event: {
    id: string;
    slug: string;
    title: string;
  };
  /** Customer email — pre-fills the Checkout form. */
  email: string;
  /** Optional pre-fill of name on the Checkout form's payment method. */
  name?: string;
  /** Public base URL of the deployment (`https://…`). Drives the
   *  success + cancel URLs. */
  baseUrl: string;
  /** Opaque metadata stored on the Checkout session — the webhook
   *  reads it to know which event/ticket/attendee to attach the
   *  registration to. */
  metadata: Record<string, string>;
}

/**
 * Create a Stripe Checkout session for a single-ticket purchase.
 * Returns the hosted Checkout URL the client should redirect to.
 *
 * If the TicketType doesn't have a cached stripePriceId yet, we
 * create the Stripe Product + Price on the fly and store the Price
 * ID back on the TicketType (idempotent — second purchase reuses it).
 */
export async function createCheckoutSessionForTicket(
  input: CheckoutInput,
): Promise<{ url: string; sessionId: string }> {
  const stripe = stripeClient();

  // Resolve / create the Stripe Price for this ticket type. We
  // create on the fly the first time and cache the ID for re-use.
  let priceId = input.ticketType.stripePriceId;
  if (!priceId) {
    const product = await stripe.products.create({
      name: `${input.event.title} — ${input.ticketType.name}`,
      description: input.ticketType.description ?? undefined,
      metadata: {
        bhnEventId: input.event.id,
        bhnTicketTypeId: input.ticketType.id,
      },
    });
    const price = await stripe.prices.create({
      unit_amount: input.ticketType.priceCents,
      currency: input.ticketType.currency.toLowerCase(),
      product: product.id,
    });
    priceId = price.id;
  }

  const successUrl = `${input.baseUrl}/events/${input.event.slug}/register/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl  = `${input.baseUrl}/events/${input.event.slug}/register?canceled=1`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: input.email,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: input.metadata,
    payment_intent_data: {
      metadata: input.metadata,
    },
  });

  if (!session.url) {
    throw new Error("Stripe didn't return a checkout URL.");
  }
  return { url: session.url, sessionId: session.id };
}

/** Verify a webhook signature header against the configured
 *  STRIPE_WEBHOOK_SECRET. Returns the parsed event or null on bad
 *  signature. */
export function verifyWebhook(
  rawBody: string,
  signature: string,
): Stripe.Event | null {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return null;
  try {
    return stripeClient().webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return null;
  }
}

/** Cache a freshly-created Stripe Price ID back onto the
 *  TicketType row so subsequent purchases skip the create-on-the-fly
 *  step. Called from the checkout-session-completed webhook handler
 *  after we resolve which TicketType was paid for. */
export { Stripe };
