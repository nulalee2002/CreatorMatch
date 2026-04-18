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
    const { userId, email, listingId } = await req.json();

    if (!userId || !listingId) {
      return new Response(
        JSON.stringify({ error: 'userId and listingId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a Stripe Express connected account
    const account = await stripe.accounts.create({
      type: 'express',
      email: email || undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers:     { requested: true },
      },
      metadata: { userId, listingId },
    });

    // Generate onboarding link
    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5174';
    const accountLink = await stripe.accountLinks.create({
      account:     account.id,
      refresh_url: `${siteUrl}/dashboard?stripe=refresh`,
      return_url:  `${siteUrl}/dashboard?stripe=success`,
      type:        'account_onboarding',
    });

    // Persist the stripe_account_id to creator_listings
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    await supabaseAdmin
      .from('creator_listings')
      .update({ stripe_account_id: account.id })
      .eq('id', listingId);

    return new Response(
      JSON.stringify({ url: accountLink.url, accountId: account.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('create-connect-account error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
