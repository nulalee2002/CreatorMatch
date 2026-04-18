import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit } from '../_shared/rateLimit.ts';

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

  const rateLimited = checkRateLimit(req, { maxRequests: 20, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  try {
    const { stripeAccountId, listingId } = await req.json();

    if (!stripeAccountId) {
      return new Response(
        JSON.stringify({ connected: false, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const account = await stripe.accounts.retrieve(stripeAccountId);

    const result = {
      connected:        true,
      chargesEnabled:   account.charges_enabled,
      payoutsEnabled:   account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    };

    // Update creator_listings with current status
    if (listingId) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      await supabaseAdmin
        .from('creator_listings')
        .update({
          stripe_onboarded: account.details_submitted && account.charges_enabled,
          payouts_enabled:  account.payouts_enabled,
        })
        .eq('id', listingId);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('check-connect-status error:', err);
    return new Response(
      JSON.stringify({ error: err.message, connected: false, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
