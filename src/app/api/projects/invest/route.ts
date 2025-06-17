import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Project from '@/models/Project';
import Transaction from '@/models/Transaction';
import Wallet from '@/models/Wallet';
import mongoose from 'mongoose';

export async function POST(request: Request) {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

  try {
    const body = await request.json();
    const { projectId, amount } = body;

    if (!projectId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid investment details' },
        { status: 400 }
      );
    }

    await connectDB();

    // Start a session for transaction
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
    // Get project
      const project = await Project.findById(projectId).session(dbSession);
    if (!project) {
        throw new Error('Project not found');
    }

    // Check if project is active
    if (project.status !== 'active') {
        throw new Error('Project is not accepting investments');
    }

    // Check if investment would exceed target amount
    if (project.currentAmount + amount > project.targetAmount) {
        throw new Error('Investment would exceed project target amount');
    }

    // Get user's wallet
      const wallet = await Wallet.findOne({ userId: authSession.user.id }).session(dbSession);
    if (!wallet) {
        throw new Error('Wallet not found');
    }

    // Check if user has sufficient balance
    if (wallet.balance < amount) {
        throw new Error('Insufficient wallet balance');
    }

    // Create investment transaction
      const transaction = await Transaction.create([{
        userId: authSession.user.id,
      projectId: project._id,
      type: 'investment',
      amount: -amount, // Negative amount as money is leaving wallet
      status: 'completed',
      description: `Investment in ${project.name}`,
      date: new Date(),
      }], { session: dbSession });

    // Update wallet balance
    wallet.balance -= amount;
      await wallet.save({ session: dbSession });

    // Update project's current amount
    project.currentAmount += amount;
      await project.save({ session: dbSession });

    // Check if project is now fully funded
    if (project.currentAmount >= project.targetAmount) {
      project.status = 'completed';
        await project.save({ session: dbSession });
    }

      // Commit the transaction
      await dbSession.commitTransaction();

    return NextResponse.json({
        transaction: transaction[0],
      newBalance: wallet.balance,
      project: {
        id: project._id,
        currentAmount: project.currentAmount,
        status: project.status,
      },
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
    console.error('Error processing investment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process investment' },
      { status: 500 }
    );
  }
} 