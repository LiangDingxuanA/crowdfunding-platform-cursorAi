import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import stripe from '@/lib/stripe';
import User from '@/models/User';
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

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If user already has a Connect account, return the account link
    if (user.stripeConnectAccountId) {
      const accountLink = await stripe.accountLinks.create({
        account: user.stripeConnectAccountId,
        refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/creator/onboarding?error=true`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/creator/onboarding?success=true`,
        type: 'account_onboarding',
      });

      return NextResponse.json({ url: accountLink.url });
    }

    // Create a new Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: user.country || 'US',
      email: user.email,
      business_type: 'individual',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        mcc: '5734', // Computer Software Stores
        url: process.env.NEXT_PUBLIC_APP_URL,
      },
    });

    // Update user with Connect account ID
    user.stripeConnectAccountId = account.id;
    user.role = 'creator';
    await user.save();

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/creator/onboarding?error=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/creator/onboarding?success=true`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error('Stripe Connect onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Connect onboarding' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user || !user.stripeConnectAccountId) {
      return NextResponse.json(
        { error: 'No Connect account found' },
        { status: 404 }
      );
    }

    const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
    
    // Update local user record with latest Stripe account status
    user.stripeConnectAccountStatus = account.charges_enabled ? 'verified' : 'pending';
    user.stripeConnectOnboardingComplete = account.details_submitted;
    user.stripeConnectPayoutsEnabled = account.payouts_enabled;
    await user.save();

    return NextResponse.json({
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirements: account.requirements,
    });
  } catch (error) {
    console.error('Stripe Connect status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check Connect account status' },
      { status: 500 }
    );
  }
} 