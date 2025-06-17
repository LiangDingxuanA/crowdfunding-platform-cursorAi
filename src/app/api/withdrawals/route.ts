import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Stripe from 'stripe';
import { Document, Model, HydratedDocument } from 'mongoose';

interface ITransaction {
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  transferId?: string;
  paymentId?: string;
}

interface IUser extends Document {
  email: string;
  balance: number;
  stripeConnectAccountId?: string;
  withdrawals: ITransaction[];
  deposits: ITransaction[];
}

interface IUserModel extends Model<IUser> {
  startSession(): Promise<any>;
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount } = await req.json();
    const withdrawalAmount = parseFloat(amount);

    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid withdrawal amount' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Start a session for the transaction
    const dbSession = await (User as IUserModel).startSession();
    let user: HydratedDocument<IUser> | null = null;
    let withdrawalRecord: ITransaction | null = null;

    try {
      await dbSession.withTransaction(async () => {
        // Find user and lock the document
        user = await User.findOne({ email: session.user.email }).session(dbSession) as HydratedDocument<IUser>;
        
        if (!user) {
          throw new Error('User not found');
        }

        if (!user.stripeConnectAccountId) {
          throw new Error('Stripe Connect account not set up');
        }

        if (user.balance < withdrawalAmount) {
          throw new Error('Insufficient balance');
        }

        // Deduct amount from user's balance immediately
        user.balance -= withdrawalAmount;

        // Create withdrawal record
        withdrawalRecord = {
          amount: withdrawalAmount,
          status: 'pending',
          createdAt: new Date(),
        };

        user.withdrawals.push(withdrawalRecord);
        await user.save({ session: dbSession });
      });
    } finally {
      await dbSession.endSession();
    }

    if (!user || !withdrawalRecord) {
      throw new Error('Transaction failed to complete properly');
    }

    // After successful database transaction, initiate Stripe transfer
    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(withdrawalAmount * 100), // Convert to cents
        currency: 'usd',
        destination: user.stripeConnectAccountId,
        transfer_group: `withdrawal_${Date.now()}`,
      });

      // Update the withdrawal record with the transfer ID
      await User.updateOne(
        { 
          email: session.user.email,
          'withdrawals.status': 'pending',
          'withdrawals.createdAt': withdrawalRecord.createdAt
        },
        { 
          $set: { 
            'withdrawals.$.transferId': transfer.id,
            'withdrawals.$.status': 'completed'
          }
        }
      );

      return NextResponse.json({ 
        success: true, 
        message: 'Withdrawal initiated successfully',
        transferId: transfer.id
      });
    } catch (stripeError) {
      // If Stripe transfer fails, revert the balance deduction
      await User.updateOne(
        { email: session.user.email },
        { 
          $inc: { balance: withdrawalAmount },
          $set: { 'withdrawals.$.status': 'failed' }
        }
      );

      throw stripeError;
    }
  } catch (error) {
    console.error('Withdrawal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process withdrawal' },
      { status: 500 }
    );
  }
} 