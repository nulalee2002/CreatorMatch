import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      projectId,
      creatorStripeAccountId,
      retainerAmountCents,   // amount client pays (retainer + client fee)
      appFeeCents,           // platform take (creator fee + client fee portion)
      creatorId,
      clientId,
      paymentType = 'retainer',  // 'retainer' | 'final'
    } = await req.json();

    if (!retainerAmountCents || !creatorStripeAccountId) {
      return new Response(
        JSON.stringify({ error: 'retainerAmountCents and creatorStripeAccountId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount:   retainerAmountCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      application_fee_amount: appFeeCents,
      transfer_data: {
        destination: creatorStripeAccountId,
      },
      metadata: {
        projectId:   projectId ?? '',
        paymentType,
        creatorId:   creatorId ?? '',
        clientId:    clientId  ?? '',
      },
    });

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('create-payment-intent error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
