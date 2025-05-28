import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import clientPromise from '@/lib/mongodb'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const formData = await request.formData()
    const passport = formData.get('passport') as File
    const selfie = formData.get('selfie') as File

    // Here you would typically:
    // 1. Upload files to a secure storage service (e.g., AWS S3)
    // 2. Call an identity verification service API
    // 3. Store the verification status and document references

    const client = await clientPromise
    const db = client.db()

    await db.collection('users').updateOne(
      { email: session.user?.email },
      {
        $set: {
          identityVerification: {
            status: 'pending',
            submittedAt: new Date(),
            documents: {
              passport: passport?.name,
              selfie: selfie?.name,
            },
          },
        },
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Documents uploaded successfully',
    })
  } catch (error) {
    console.error('Error processing identity verification:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 