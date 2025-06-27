import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Transaction from '@/models/Transaction';
import Wallet from '@/models/Wallet';
import { sendMailgunEmail } from '@/lib/email';

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
    const { type, amount, description } = body;

    if (!type || !amount || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (type !== 'deposit' && type !== 'withdrawal') {
      return NextResponse.json(
        { error: 'Invalid transaction type' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get or create wallet
    let wallet = await Wallet.findOne({ userId: session.user.id });
    if (!wallet) {
      wallet = await Wallet.create({
        userId: session.user.id,
        balance: 0,
      });
    }

    // For withdrawals, check if sufficient balance
    if (type === 'withdrawal' && wallet.balance < Math.abs(amount)) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    // Create transaction
    const transaction = await Transaction.create({
      userId: session.user.id,
      type,
      amount: type === 'deposit' ? Math.abs(amount) : -Math.abs(amount),
      status: 'completed',
      description,
      date: new Date(),
    });

    // Update wallet balance
    wallet.balance += transaction.amount;
    await wallet.save();

    // Send Mailgun email notification
    const userEmail = session.user.email;
    const html = `<p>Your wallet balance has been updated.</p>
      <p><strong>Type:</strong> ${transaction.type}<br/>
      <strong>Amount:</strong> $${Math.abs(transaction.amount).toLocaleString()}<br/>
      <strong>New Balance:</strong> $${wallet.balance.toLocaleString()}</p>`;
    await sendMailgunEmail(userEmail, 'Wallet Balance Updated', html);

    return NextResponse.json({
      transaction,
      newBalance: wallet.balance,
    });
  } catch (error) {
    console.error('Error processing transaction:', error);
    return NextResponse.json(
      { error: 'Failed to process transaction' },
      { status: 500 }
    );
  }
} 