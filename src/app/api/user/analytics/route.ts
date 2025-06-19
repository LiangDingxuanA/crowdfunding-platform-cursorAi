import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import Project from '@/models/Project';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Portfolio value over last 6 months (monthly)
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleString('default', { month: 'short', year: 'numeric' }),
        start: new Date(d.getFullYear(), d.getMonth(), 1),
        end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
      });
    }

    // Aggregate investments and returns per month
    const monthlyStats = await Promise.all(
      months.map(async (m) => {
        const invested = await Transaction.aggregate([
          { $match: {
            userId: user._id,
            type: 'investment',
            status: 'completed',
            createdAt: { $gte: m.start, $lte: m.end },
          } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        const returns = await Transaction.aggregate([
          { $match: {
            userId: user._id,
            type: 'dividend',
            status: 'completed',
            createdAt: { $gte: m.start, $lte: m.end },
          } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        return {
          month: m.label,
          invested: invested[0]?.total || 0,
          returns: returns[0]?.total || 0,
        };
      })
    );

    // Investment distribution by project type
    const investments = await Transaction.find({
      userId: user._id,
      type: 'investment',
      status: 'completed',
    }).populate('projectId');
    const typeDist: Record<string, number> = {};
    let totalInvested = 0;
    investments.forEach((inv) => {
      const type = inv.projectId?.type || 'Other';
      typeDist[type] = (typeDist[type] || 0) + Math.abs(inv.amount);
      totalInvested += Math.abs(inv.amount);
    });
    const investmentDistribution = Object.entries(typeDist).map(([type, amount]) => ({
      type,
      amount,
      percentage: totalInvested ? Math.round((amount / totalInvested) * 100) : 0,
    }));

    // Total returns
    const totalReturnsAgg = await Transaction.aggregate([
      { $match: { userId: user._id, type: 'dividend', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalReturns = totalReturnsAgg[0]?.total || 0;

    // Current balance
    const balance = user.balance;

    return NextResponse.json({
      monthlyStats,
      investmentDistribution,
      totalInvested,
      totalReturns,
      balance,
    });
  } catch (error) {
    console.error('User analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch user analytics' }, { status: 500 });
  }
} 