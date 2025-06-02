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
    const { transactionId, accountId } = body;

    if (!transactionId || !accountId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get user and transaction
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Verify transaction belongs to user
    if (transaction.userId.toString() !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const wallet = await Wallet.findOne({ userId: user.id });
    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    try {
      // Get the bank account details from Financial Connections
      const account = await stripe.financialConnections.accounts.retrieve(accountId);
      
      // Create a payment method using the bank account
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'us_bank_account',
        us_bank_account: {
          account_holder_type: 'individual',
          financial_connections_account: accountId,
        },
      });

      // Create a payment intent for the withdrawal
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.abs(transaction.amount) * 100, // Convert to cents
        currency: 'usd',
        payment_method: paymentMethod.id,
        payment_method_types: ['us_bank_account'],
        confirm: true,
        customer: user.stripeCustomerId,
        metadata: {
          transactionId: transaction.id,
          userEmail: user.email,
          type: 'withdrawal'
        }
      });

      // Update transaction with payment details
      transaction.status = paymentIntent.status === 'succeeded' ? 'completed' : 'processing';
      transaction.stripePaymentIntentId = paymentIntent.id;
      await transaction.save();

      // If payment is successful, update balances
      if (paymentIntent.status === 'succeeded') {
        user.balance += transaction.amount; // amount is already negative
        wallet.balance += transaction.amount; // amount is already negative
        await Promise.all([user.save(), wallet.save()]);
      }

      return NextResponse.json({
        success: true,
        status: paymentIntent.status,
        paymentIntentId: paymentIntent.id
      });

    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError);
      
      // Update transaction status to failed
      transaction.status = 'failed';
      transaction.description += ` (Error: ${stripeError.message})`;
      await transaction.save();

      return NextResponse.json(
        { error: stripeError.message || 'Failed to process withdrawal' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Withdrawal completion error:', error);
    return NextResponse.json(
      { error: 'Failed to complete withdrawal' },
      { status: 500 }
    );
  }
} 