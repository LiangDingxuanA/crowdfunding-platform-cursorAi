import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Transaction from '@/models/Transaction';
import Project from '@/models/Project';
import Wallet from '@/models/Wallet';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get or create wallet for the user
    let wallet = await Wallet.findOne({ userId: session.user.id });
    if (!wallet) {
      // Calculate initial balance from existing transactions
      const transactions = await Transaction.find({ userId: session.user.id });
      const initialBalance = transactions.reduce((acc, transaction) => {
        if (transaction.status === 'completed') {
          return acc + transaction.amount;
        }
        return acc;
      }, 0);

      wallet = await Wallet.create({
        userId: session.user.id,
        balance: initialBalance,
      });
    }

    // Get all transactions for the user
    const transactions = await Transaction.find({ userId: session.user.id });

    // Calculate investment metrics
    const totalInvested = transactions
      .filter(t => t.type === 'investment' && t.status === 'completed')
      .reduce((acc, transaction) => acc + Math.abs(transaction.amount), 0);

    const totalReturns = transactions
      .filter(t => t.type === 'dividend' && t.status === 'completed')
      .reduce((acc, transaction) => acc + transaction.amount, 0);

    // Count active projects
    const activeProjects = await Project.countDocuments({ status: 'active' });

    return NextResponse.json({
      balance: wallet.balance,
      totalInvested,
      totalReturns,
      activeProjects,
      lastUpdated: wallet.lastUpdated,
    });
  } catch (error) {
    console.error('Error fetching wallet summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet summary' },
      { status: 500 }
    );
  }
} 