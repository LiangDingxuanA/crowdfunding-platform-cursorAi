import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/models/User'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { db } = await connectToDatabase()
    const user = await User.findOne({ email: session.user.email })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      kycStatus: user.kycStatus,
      memberSince: user.createdAt,
      idDocument: user.idDocument,
      proofOfAddress: user.proofOfAddress,
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { name, phone, address } = data

    const { db } = await connectToDatabase()
    const user = await User.findOne({ email: session.user.email })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user fields
    user.name = name
    user.phone = phone
    user.address = address

    await user.save()

    return NextResponse.json({
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      kycStatus: user.kycStatus,
      memberSince: user.createdAt,
      idDocument: user.idDocument,
      proofOfAddress: user.proofOfAddress,
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 