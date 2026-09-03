import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { after } from "next/server";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe/server";
import { processStripeWebhookEvent } from "@/lib/stripe/webhook-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "stripe-webhook" });
}

export async function POST(request: Request) {
  let stripe: Stripe;
  let webhookSecret: string;

  try {
    stripe = getStripe();
    webhookSecret = getStripeWebhookSecret();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe is not configured";
    console.error("[stripe webhook] configuration error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature";
    console.error("[stripe webhook] signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  after(async () => {
    try {
      await processStripeWebhookEvent(event);
    } catch (error) {
      console.error("[stripe webhook] event processing failed", {
        eventId: event.id,
        eventType: event.type,
        error: error instanceof Error ? error.message : error,
      });
    }
  });

  return NextResponse.json({ received: true });
}
