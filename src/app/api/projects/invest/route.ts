import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Project from '@/models/Project';
import Transaction from '@/models/Transaction';
import Wallet from '@/models/Wallet';

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
    const { projectId, amount } = body;

    if (!projectId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid investment details' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get project
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if project is active
    if (project.status !== 'active') {
      return NextResponse.json(
        { error: 'Project is not accepting investments' },
        { status: 400 }
      );
    }

    // Check if investment would exceed target amount
    if (project.currentAmount + amount > project.targetAmount) {
      return NextResponse.json(
        { error: 'Investment would exceed project target amount' },
        { status: 400 }
      );
    }

    // Get user's wallet
    const wallet = await Wallet.findOne({ userId: session.user.id });
    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    // Check if user has sufficient balance
    if (wallet.balance < amount) {
      return NextResponse.json(
        { error: 'Insufficient wallet balance' },
        { status: 400 }
      );
    }

    // Create investment transaction
    const transaction = await Transaction.create({
      userId: session.user.id,
      projectId: project._id,
      type: 'investment',
      amount: -amount, // Negative amount as money is leaving wallet
      status: 'completed',
      description: `Investment in ${project.name}`,
      date: new Date(),
    });

    // Update wallet balance
    wallet.balance -= amount;
    await wallet.save();

    // Update project's current amount
    project.currentAmount += amount;
    await project.save();

    // Check if project is now fully funded
    if (project.currentAmount >= project.targetAmount) {
      project.status = 'completed';
      await project.save();
    }

    return NextResponse.json({
      transaction,
      newBalance: wallet.balance,
      project: {
        id: project._id,
        currentAmount: project.currentAmount,
        status: project.status,
      },
    });
  } catch (error) {
    console.error('Error processing investment:', error);
    return NextResponse.json(
      { error: 'Failed to process investment' },
      { status: 500 }
    );
  }
} 