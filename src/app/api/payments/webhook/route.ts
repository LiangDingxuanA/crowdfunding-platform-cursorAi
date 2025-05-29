import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import stripe from '@/lib/stripe';
import User from '@/models/User';
import Wallet from '@/models/Wallet';
import Transaction from '@/models/Transaction';
import connectDB from '@/lib/db';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!webhookSecret || !signature) {
      return NextResponse.json(
        { error: 'Missing webhook secret or signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle different event types
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const { userEmail } = session.metadata || {};

      if (userEmail) {
        await connectDB();
        const user = await User.findOne({ email: userEmail });

        if (user) {
          const amount = session.amount_total ? session.amount_total / 100 : 0;
          
          // Update user balance
          user.balance = (user.balance || 0) + amount;
          await user.save();

          // Update wallet balance
          let wallet = await Wallet.findOne({ userId: user.id });
          if (!wallet) {
            wallet = await Wallet.create({
              userId: user.id,
              balance: 0,
            });
          }
          wallet.balance = (wallet.balance || 0) + amount;
          await wallet.save();

          // Create transaction record
          await Transaction.create({
            userId: user.id,
            type: 'deposit',
            amount: amount,
            status: 'completed',
            description: 'Stripe payment deposit',
            date: new Date(),
          });
        }
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { userEmail } = paymentIntent.metadata || {};

      if (userEmail) {
        await connectDB();
        const user = await User.findOne({ email: userEmail });

        if (user) {
          // Create failed transaction record
          await Transaction.create({
            userId: user.id,
            type: 'deposit',
            amount: paymentIntent.amount / 100,
            status: 'failed',
            description: 'Failed Stripe payment',
            date: new Date(),
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
} 