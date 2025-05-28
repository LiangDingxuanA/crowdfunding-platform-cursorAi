import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Project from '@/models/Project';

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
    const {
      name,
      type,
      location,
      targetAmount,
      returnRate,
      duration,
      description,
    } = body;

    // Validate required fields
    if (!name || !type || !location || !targetAmount || !returnRate || !duration || !description) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate project type
    if (!['Residential', 'Commercial', 'Industrial'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid project type' },
        { status: 400 }
      );
    }

    // Validate numeric fields
    if (targetAmount <= 0 || returnRate <= 0 || duration <= 0) {
      return NextResponse.json(
        { error: 'Amount, return rate, and duration must be positive numbers' },
        { status: 400 }
      );
    }

    await connectDB();

    const project = await Project.create({
      name,
      type,
      location,
      targetAmount,
      returnRate,
      duration,
      description,
      currentAmount: 0,
      status: 'active',
      createdBy: session.user.id,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
} 