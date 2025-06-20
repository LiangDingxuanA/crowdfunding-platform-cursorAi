import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Project from '@/models/Project';
import Transaction from '@/models/Transaction';
import Wallet from '@/models/Wallet';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { dividends } = await request.json(); // { userId: amount, ... }
    const { projectId } = params;
    await connectDB();

    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Start a session for atomic updates
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();
    try {
      const results = [];
      for (const [userId, amount] of Object.entries(dividends)) {
        const wallet = await Wallet.findOne({ userId }).session(dbSession);
        if (!wallet) continue;
        // Create dividend transaction
        await Transaction.create([
          {
            userId,
            projectId,
            type: 'dividend',
            amount: Number(amount),
            status: 'completed',
            description: `Dividend payout from project ${project.name}`,
            date: new Date(),
          },
        ], { session: dbSession });
        // Add dividend to wallet balance
        wallet.balance += Number(amount);
        await wallet.save({ session: dbSession });
        results.push({ userId, amount });
      }
      await dbSession.commitTransaction();
      return NextResponse.json({ success: true, results });
    } catch (error) {
      await dbSession.abortTransaction();
      throw error;
    } finally {
      dbSession.endSession();
    }
  } catch (error) {
    console.error('Dividend payout error:', error);
    return NextResponse.json({ error: 'Failed to process dividends' }, { status: 500 });
  }
} 