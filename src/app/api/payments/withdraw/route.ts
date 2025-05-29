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
    const { amount, accountNumber, routingNumber } = body;

    if (!amount || amount < 1) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    if (!accountNumber || !routingNumber) {
      return NextResponse.json(
        { error: 'Bank details are required' },
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
      // Create an external account
      const bankAccount = await stripe.accounts.createExternalAccount(
        process.env.STRIPE_PLATFORM_ACCOUNT_ID!,
        {
          external_account: {
            object: 'bank_account',
            country: 'US',
            currency: 'usd',
            account_number: accountNumber,
            routing_number: routingNumber,
          },
        }
      );

      if (!bankAccount || typeof bankAccount.id !== 'string') {
        throw new Error('Failed to create external account');
      }

      // Create a payout
      const payout = await stripe.payouts.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        method: 'standard',
        destination: bankAccount.id,
        metadata: {
          userEmail: session.user.email,
          type: 'withdrawal',
        },
      });

      // Create transaction record
      await Transaction.create({
        userId: user.id,
        type: 'withdrawal',
        amount: -amount, // Negative amount for withdrawals
        status: 'pending',
        description: 'Bank transfer withdrawal (processing)',
        date: new Date(),
      });

      // Update balances
      user.balance -= amount;
      wallet.balance -= amount;
      
      await Promise.all([
        user.save(),
        wallet.save(),
      ]);

      return NextResponse.json({ 
        success: true,
        payoutId: payout.id,
      });
    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError);
      return NextResponse.json(
        { error: stripeError.message || 'Failed to process withdrawal' },
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