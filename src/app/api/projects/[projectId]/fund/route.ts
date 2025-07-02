import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import stripe from '@/lib/stripe';
import User from '@/models/User';
import Project from '@/models/Project';
import ProjectPayment from '@/models/ProjectPayment';
import connectDB from '@/lib/db';
import Transaction from '@/models/Transaction';

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { amount } = body;

    if (!amount || amount < 1) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get project and creator details
    const project = await Project.findById(params.projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const creator = await User.findById(project.creatorId);
    if (!creator || !creator.stripeConnectAccountId) {
      return NextResponse.json(
        { error: 'Project creator not found or not setup for payments' },
        { status: 400 }
      );
    }

    // Get or create customer
    const investor = await User.findOne({ email: session.user.email });
    if (!investor) {
      return NextResponse.json(
        { error: 'Investor not found' },
        { status: 404 }
      );
    }

    if (!investor.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: investor.email,
        name: investor.name,
      });
      investor.stripeCustomerId = customer.id;
      await investor.save();
    }

    // Calculate total invested for rank
    const totalInvestedAgg = await Transaction.aggregate([
      { $match: { userId: investor._id, type: 'investment', status: 'completed' } },
      { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } },
    ]);
    const totalInvested = totalInvestedAgg[0]?.total || 0;
    // Determine rank and platform fee percent
    let platformFeePercent = 0.05; // Bronze default
    if (totalInvested >= 100000) platformFeePercent = 0.03; // Platinum
    else if (totalInvested >= 50000) platformFeePercent = 0.04; // Gold
    else if (totalInvested >= 10000) platformFeePercent = 0.045; // Silver

    // Calculate fees
    const stripeFeePercent = 0.029; // 2.9% Stripe fee
    const stripeFixedFee = 0.30; // $0.30 Stripe fixed fee

    const platformFee = Math.round(amount * platformFeePercent * 100);
    const stripeFee = Math.round((amount * stripeFeePercent + stripeFixedFee) * 100);
    const creatorAmount = Math.round(amount * 100) - platformFee - stripeFee;

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      customer: investor.stripeCustomerId,
      payment_method_types: ['card'],
      application_fee_amount: platformFee,
      transfer_data: {
        destination: creator.stripeConnectAccountId,
      },
      metadata: {
        projectId: project._id.toString(),
        investorId: investor._id.toString(),
        creatorId: creator._id.toString(),
      },
    });

    // Create project payment record
    const projectPayment = await ProjectPayment.create({
      projectId: project._id,
      investorId: investor._id,
      amount: amount,
      status: 'pending',
      paymentIntentId: paymentIntent.id,
      fee: stripeFee / 100,
      platformFee: platformFee / 100,
      metadata: {
        projectTitle: project.title,
        investorEmail: investor.email,
        creatorEmail: creator.email,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentId: projectPayment._id,
    });
  } catch (error) {
    console.error('Project funding error:', error);
    return NextResponse.json(
      { error: 'Failed to process funding request' },
      { status: 500 }
    );
  }
} 