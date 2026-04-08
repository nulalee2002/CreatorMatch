import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    switch (event.type) {

      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const { projectId, paymentType, creatorId, clientId } = pi.metadata;

        if (paymentType === 'retainer') {
          await supabaseAdmin
            .from('transactions')
            .update({
              retainer_status:         'paid',
              retainer_payment_intent: pi.id,
              retainer_paid_at:        new Date().toISOString(),
              updated_at:              new Date().toISOString(),
            })
            .eq('retainer_payment_intent', pi.id);
        } else if (paymentType === 'final') {
          await supabaseAdmin
            .from('transactions')
            .update({
              final_status:         'paid',
              final_payment_intent: pi.id,
              final_paid_at:        new Date().toISOString(),
              updated_at:           new Date().toISOString(),
            })
            .eq('final_payment_intent', pi.id);
        }

        // Log event
        const { data: txn } = await supabaseAdmin
          .from('transactions')
          .select('id')
          .eq(paymentType === 'retainer' ? 'retainer_payment_intent' : 'final_payment_intent', pi.id)
          .single();

        if (txn) {
          await supabaseAdmin.from('payment_events').insert({
            transaction_id: txn.id,
            event_type:     `${paymentType}_payment_succeeded`,
            metadata:       { paymentIntentId: pi.id, amount: pi.amount },
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const { paymentType } = pi.metadata;

        // Find and log
        const { data: txn } = await supabaseAdmin
          .from('transactions')
          .select('id')
          .eq(paymentType === 'retainer' ? 'retainer_payment_intent' : 'final_payment_intent', pi.id)
          .single();

        if (txn) {
          await supabaseAdmin.from('payment_events').insert({
            transaction_id: txn.id,
            event_type:     `${paymentType}_payment_failed`,
            metadata:       {
              paymentIntentId:  pi.id,
              failureReason:    pi.last_payment_error?.message ?? 'Unknown',
            },
          });
        }
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await supabaseAdmin
          .from('creator_listings')
          .update({
            stripe_onboarded: account.details_submitted && account.charges_enabled,
            payouts_enabled:  account.payouts_enabled,
          })
          .eq('stripe_account_id', account.id);
        break;
      }

      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer;
        // Log the transfer against the transaction using the source_transaction
        const { data: txn } = await supabaseAdmin
          .from('transactions')
          .select('id')
          .or(`retainer_payment_intent.eq.${transfer.source_transaction},final_payment_intent.eq.${transfer.source_transaction}`)
          .single();

        if (txn) {
          await supabaseAdmin.from('payment_events').insert({
            transaction_id: txn.id,
            event_type:     'transfer_created',
            metadata:       {
              transferId:   transfer.id,
              amount:       transfer.amount,
              destination:  transfer.destination,
            },
          });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return new Response(`Handler error: ${err.message}`, { status: 500 });
  }
});
