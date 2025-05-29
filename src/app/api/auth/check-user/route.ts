import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

interface UserDocument {
  email: string;
  name?: string;
  phone?: string;
  homeAddress?: string;
  employmentDetails?: string;
  officeAddress?: string;
  country?: string;
  citizenshipNumber?: string;
  passportNumber?: string;
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findOne({ email }).lean() as UserDocument | null;

    return NextResponse.json({
      exists: !!user,
      user: user ? {
        email: user.email,
        name: user.name || '',
        phone: user.phone || '',
        homeAddress: user.homeAddress || '',
        employmentDetails: user.employmentDetails || '',
        officeAddress: user.officeAddress || '',
        country: user.country || '',
        citizenshipNumber: user.citizenshipNumber || '',
        passportNumber: user.passportNumber || '',
      } : null
    });
  } catch (error) {
    console.error('Error checking user existence:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 