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

    const wallet = await Wallet.findOne({ userId: user._id });
    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    // Check balance
    if (wallet.balance < amount) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    // Get the base URL from the request
    const baseUrl = new URL(request.url).origin;

    // Create or get Stripe Connect account if not exists
    if (!user.stripeConnectAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: user.country || 'US',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
          us_bank_account_ach_payments: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          mcc: '5734', // Computer Software Stores
          product_description: 'Crowdfunding platform withdrawals'
        },
      });
      user.stripeConnectAccountId = account.id;
      await user.save();

      // Return URL for account onboarding
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${baseUrl}/wallet?error=true`,
        return_url: `${baseUrl}/wallet?success=true`,
        type: 'account_onboarding',
      });

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

      return NextResponse.json({
        status: 'verification_required',
        verificationUrl: accountLink.url,
      });
    }

    // Calculate fees
    const stripeFeePercent = 0.0025; // 0.25% Stripe payout fee
    const stripeFixedFee = 0; // No fixed fee for payouts to US bank accounts
    const stripeFee = Math.round((amount * stripeFeePercent + stripeFixedFee) * 100);
    const payoutAmount = Math.round(amount * 100) - stripeFee;

    // Create payout
    const payout = await stripe.transfers.create({
      amount: payoutAmount,
      currency: 'usd',
      destination: user.stripeConnectAccountId,
      description: `Wallet withdrawal for ${user.email}`,
      metadata: {
        userId: user._id.toString(),
        type: 'wallet_withdrawal',
      },
    });

    // Create transaction record
    const transaction = await Transaction.create({
      userId: user._id,
      type: 'withdrawal',
      amount: -amount, // Negative amount for withdrawals
      status: 'pending',
      description: 'Wallet withdrawal via bank transfer',
      stripePayoutId: payout.id,
    });

    // Update wallet balance
    wallet.balance -= amount;
    await wallet.save();

    // Update user balance
    user.balance -= amount;
    await user.save();

    return NextResponse.json({
      success: true,
      transactionId: transaction._id,
      payoutId: payout.id,
      estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Estimate 2 business days
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    return NextResponse.json(
      { error: 'Failed to process withdrawal' },
      { status: 500 }
    );
  }
} 