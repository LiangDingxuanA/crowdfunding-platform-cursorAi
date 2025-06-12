import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import stripe from '@/lib/stripe';
import User from '@/models/User';
import Wallet from '@/models/Wallet';
import Transaction from '@/models/Transaction';
import connectDB from '@/lib/db';
import mongoose from 'mongoose';

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

    // Start a database transaction
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      // Get user and transaction
      const user = await User.findOne({ email: session.user.email }).session(dbSession);
      if (!user) {
        throw new Error('User not found');
      }

      const transaction = await Transaction.findById(transactionId).session(dbSession);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Verify transaction belongs to user
      if (transaction.userId.toString() !== user._id.toString()) {
        throw new Error('Unauthorized');
      }

      const wallet = await Wallet.findOne({ userId: user._id }).session(dbSession);
      if (!wallet) {
        throw new Error('Wallet not found');
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
        await transaction.save({ session: dbSession });

        // If payment is successful, update balances
        if (paymentIntent.status === 'succeeded') {
          // No need to update balances here as they were already updated when the withdrawal was initiated
          // The transaction amount is already negative, so we don't need to subtract again
        }

        // Commit the transaction
        await dbSession.commitTransaction();

        return NextResponse.json({
          success: true,
          status: paymentIntent.status,
          paymentIntentId: paymentIntent.id
        });
      } catch (stripeError) {
        // If Stripe operation fails, update transaction status
        transaction.status = 'failed';
        await transaction.save({ session: dbSession });

        // Revert the wallet balance
        wallet.balance += Math.abs(transaction.amount);
        await wallet.save({ session: dbSession });

        // Revert the user balance
        user.balance += Math.abs(transaction.amount);
        await user.save({ session: dbSession });

        // Commit the transaction
        await dbSession.commitTransaction();

        throw stripeError;
      }
    } catch (error) {
      // If an error occurred, abort the transaction
      await dbSession.abortTransaction();
      throw error;
    } finally {
      // End the session
      dbSession.endSession();
    }
  } catch (error) {
    console.error('Withdrawal completion error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete withdrawal' },
      { status: 500 }
    );
  }
} 