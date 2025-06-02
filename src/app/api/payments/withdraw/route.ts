import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import stripe from '@/lib/stripe';
import User from '@/models/User';
import Wallet from '@/models/Wallet';
import Transaction from '@/models/Transaction';
import connectDB from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { amount } = body;

    if (!amount || amount < 1) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get user and wallet
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const wallet = await Wallet.findOne({ userId: user.id });
    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    // Check both balances
    if (user.balance < amount || wallet.balance < amount) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    try {
      // Create a Financial Connections Session
      const session = await stripe.financialConnections.sessions.create({
        account_holder: {
          type: 'customer',
          customer: user.stripeCustomerId || (await stripe.customers.create({
            email: user.email,
            name: user.name,
          })).id,
        },
        permissions: ['payment_method'],
        filters: { countries: ['US'] },
      });

      // Update user's Stripe customer ID if it was just created
      const accountHolder = session.account_holder;
      if (!user.stripeCustomerId && accountHolder && 'customer' in accountHolder) {
        user.stripeCustomerId = accountHolder.customer;
        await user.save();
      }

      // Create transaction record in pending state
      const transaction = await Transaction.create({
        userId: user.id,
        type: 'withdrawal',
        amount: -amount, // Negative amount for withdrawals
        status: 'pending',
        description: 'Bank transfer withdrawal (awaiting bank connection)',
        date: new Date(),
      });

      return NextResponse.json({ 
        success: true,
        client_secret: session.client_secret,
        transactionId: transaction.id,
      });

    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError);
      return NextResponse.json(
        { error: stripeError.message || 'Failed to initiate withdrawal' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Withdrawal error:', error);
    return NextResponse.json(
      { error: 'Failed to process withdrawal' },
      { status: 500 }
    );
  }
} 