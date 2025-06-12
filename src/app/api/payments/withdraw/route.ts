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
    const { amount } = body;

    if (!amount || amount < 1) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    await connectDB();

    // Start a database transaction
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      // Get user and wallet
      const user = await User.findOne({ email: session.user.email }).session(dbSession);
      if (!user) {
        throw new Error('User not found');
      }

      const wallet = await Wallet.findOne({ userId: user._id }).session(dbSession);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Check balance
      if (wallet.balance < amount) {
        throw new Error('Insufficient balance');
      }

      // Get the base URL from the request
      const baseUrl = new URL(request.url).origin;

      // Create or get Stripe Connect account if not exists
      if (!user.stripeConnectAccountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'SG', // Set to Singapore
          email: user.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true }
          },
          business_type: 'individual',
          business_profile: {
            mcc: '5734', // Computer Software Stores
            product_description: 'Crowdfunding platform withdrawals'
          },
          settings: {
            payouts: {
              schedule: {
                interval: 'manual'
              }
            }
          }
        });
        user.stripeConnectAccountId = account.id;
        await user.save({ session: dbSession });

        // Return URL for account onboarding
        const accountLink = await stripe.accountLinks.create({
          account: account.id,
          refresh_url: `${baseUrl}/wallet?error=true`,
          return_url: `${baseUrl}/wallet?success=true`,
          type: 'account_onboarding',
        });

        await dbSession.commitTransaction();
        return NextResponse.json({
          status: 'onboarding_required',
          onboardingUrl: accountLink.url,
        });
      }

      // Check if account is ready for payouts
      const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
      if (!account.payouts_enabled) {
        // Create new account link for completing verification
        const accountLink = await stripe.accountLinks.create({
          account: user.stripeConnectAccountId,
          refresh_url: `${baseUrl}/wallet?error=true`,
          return_url: `${baseUrl}/wallet?success=true`,
          type: 'account_onboarding',
        });

        await dbSession.commitTransaction();
        return NextResponse.json({
          status: 'verification_required',
          verificationUrl: accountLink.url,
        });
      }

      // Calculate fees
      const stripeFeePercent = 0.0025; // 0.25% Stripe payout fee
      const stripeFixedFee = 0;
      const stripeFee = Math.round((amount * stripeFeePercent + stripeFixedFee) * 100);
      const payoutAmount = Math.round(amount * 100) - stripeFee;

      // Create payout using payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: payoutAmount,
        currency: 'sgd', // Use SGD currency
        payment_method_types: ['card'], // Use card payments for SG
        transfer_data: {
          destination: user.stripeConnectAccountId,
        },
        metadata: {
          userId: user._id.toString(),
          type: 'wallet_withdrawal',
        },
      });

      // Create transaction record
      const transaction = await Transaction.create([{
        userId: user._id,
        type: 'withdrawal',
        amount: -amount, // Negative amount for withdrawals
        status: 'pending',
        description: 'Wallet withdrawal via bank transfer',
        stripePaymentIntentId: paymentIntent.id,
        date: new Date(),
      }], { session: dbSession });

      // Update wallet balance
      wallet.balance -= amount;
      await wallet.save({ session: dbSession });

      // Update user balance
      user.balance -= amount;
      await user.save({ session: dbSession });

      // Commit the transaction
      await dbSession.commitTransaction();

      return NextResponse.json({
        success: true,
        transactionId: transaction[0]._id,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Estimate 2 business days
      });
    } catch (error) {
      // If an error occurred, abort the transaction
      await dbSession.abortTransaction();
      throw error;
    } finally {
      // End the session
      dbSession.endSession();
    }
  } catch (error) {
    console.error('Withdrawal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process withdrawal' },
      { status: 500 }
    );
  }
} 