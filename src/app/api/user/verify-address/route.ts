import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/mongodb'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const formData = await request.formData()
    const residentialStatus = formData.get('residentialStatus') as string
    const proofDocument = formData.get('proofDocument') as File


    const client = await clientPromise
    const db = client.db()

    await db.collection('users').updateOne(
      { email: session.user?.email },
      {
        $set: {
          addressVerification: {
            status: 'pending',
            submittedAt: new Date(),
            residentialStatus,
            document: proofDocument?.name,
          },
          onboardingCompleted: true,
        },
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Address verification submitted successfully',
    })
  } catch (error) {
    console.error('Error processing address verification:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 