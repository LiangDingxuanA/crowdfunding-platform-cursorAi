import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import stripe from '@/lib/stripe';
import User from '@/models/User';
import Wallet from '@/models/Wallet';
import Transaction from '@/models/Transaction';
import connectDB from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.redirect(new URL('/wallet?error=true', request.url));
    }

    // Retrieve the session to get payment details
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== 'paid') {
      return NextResponse.redirect(new URL('/wallet?error=true', request.url));
    }

    const userEmail = session.metadata?.userEmail;
    if (!userEmail) {
      return NextResponse.redirect(new URL('/wallet?error=true', request.url));
    }

    await connectDB();

    // Get user and wallet
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return NextResponse.redirect(new URL('/wallet?error=true', request.url));
    }

    let wallet = await Wallet.findOne({ userId: user.id });
    if (!wallet) {
      wallet = await Wallet.create({
        userId: user.id,
        balance: 0,
      });
    }

    // Calculate amount
    const amount = session.amount_total ? session.amount_total / 100 : 0;

    // Create transaction record
    await Transaction.create({
      userId: user.id,
      type: 'deposit',
      amount: amount,
      status: 'completed',
      description: 'Stripe payment deposit',
      date: new Date(),
    });

    // Update balances
    user.balance = (user.balance || 0) + amount;
    wallet.balance = (wallet.balance || 0) + amount;
    
    await Promise.all([
      user.save(),
      wallet.save(),
    ]);

    // Redirect to the wallet page with success parameter
    return NextResponse.redirect(new URL('/wallet?success=true', request.url));
  } catch (error) {
    console.error('Success handler error:', error);
    return NextResponse.redirect(new URL('/wallet?error=true', request.url));
  }
} 