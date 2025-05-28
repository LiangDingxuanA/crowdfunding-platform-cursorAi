import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/db'
import User from '@/models/User'

export async function POST(request: Request) {
  try {
    // Get the session
    const session = await getServerSession(authOptions)

    // Check if user is authenticated
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Connect to database
    await connectDB()

    // Parse request body
    const data = await request.json()

    // Validate required fields
    const requiredFields = ['fullName', 'phone', 'homeAddress']
    const missingFields = requiredFields.filter(field => !data[field])

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Find user and update
    const user = await User.findById(session.user.id)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update user data
    user.name = data.fullName
    user.phone = data.phone
    user.address = data.homeAddress
    user.employmentDetails = data.employmentDetails || ''
    user.officeAddress = data.officeAddress || ''
    user.country = data.country || ''
    user.citizenshipNumber = data.citizenshipNumber || ''
    user.passportNumber = data.passportNumber || ''
    user.onboardingStep = 1

    // Save the updated user
    await user.save()

    return NextResponse.json({ 
      success: true,
      message: 'Onboarding data saved successfully',
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        address: user.address,
        onboardingStep: user.onboardingStep,
      }
    })
  } catch (error) {
    console.error('Error saving onboarding data:', error)
    return NextResponse.json(
      { error: 'Failed to save onboarding data. Please try again.' },
      { status: 500 }
    )
  }
} 