import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import Project from '@/models/Project';

interface InvestmentMix {
  [key: string]: number;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();

    // Get user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get all transactions for the user
    const transactions = await Transaction.find({ userId: user._id });

    // Calculate wallet balance from transactions
    const balance = transactions.reduce((acc, transaction) => {
      if (transaction.status === 'completed') {
        switch (transaction.type) {
          case 'deposit':
            return acc + transaction.amount;
          case 'withdrawal':
          case 'investment':
            return acc + transaction.amount; // amount is already negative for these types
          case 'dividend':
            return acc + transaction.amount;
          default:
            return acc;
        }
      }
      return acc;
    }, 0);

    // Calculate investment metrics
    const totalInvested = transactions
      .filter(t => t.type === 'investment' && t.status === 'completed')
      .reduce((acc, transaction) => acc + Math.abs(transaction.amount), 0);

    const totalReturns = transactions
      .filter(t => t.type === 'dividend' && t.status === 'completed')
      .reduce((acc, transaction) => acc + transaction.amount, 0);

    // Get investment mix
    const investments = await Transaction.find({
      userId: user._id,
      type: 'investment',
      status: 'completed'
    }).populate('projectId');

    const investmentMix: InvestmentMix = investments.reduce((acc, investment) => {
      const category = investment.projectId?.category || 'Other';
      acc[category] = (acc[category] || 0) + Math.abs(investment.amount);
      return acc;
    }, {} as InvestmentMix);

    // Calculate percentages
    const totalInvestmentAmount = Object.values(investmentMix).reduce((a: number, b: number) => a + b, 0);
    const investmentMixPercentages = Object.entries(investmentMix).map(([category, amount]) => ({
      category,
      percentage: Math.round((amount / totalInvestmentAmount) * 100)
    }));

    // Get recent timeline
    const recentTransactions = await Transaction.find({
      userId: user._id,
      status: 'completed'
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('projectId');

    const timeline = recentTransactions.map(transaction => ({
      id: transaction._id.toString(),
      date: transaction.createdAt.toISOString().split('T')[0],
      event: `${transaction.type === 'investment' ? 'Investment in' : 
              transaction.type === 'dividend' ? 'Dividend from' : 
              transaction.type === 'withdrawal' ? 'Withdrawal from' : 
              'Transaction in'} ${transaction.projectId?.name || 'Wallet'}`
    }));

    // Get active projects count
    const activeProjects = await Project.countDocuments({
      status: 'active',
      investors: user._id
    });

    return NextResponse.json({
      balance,
      totalInvested,
      totalReturns,
      activeProjects,
      investmentMix: investmentMixPercentages,
      timeline,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching wallet summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet summary' },
      { status: 500 }
    );
  }
} 