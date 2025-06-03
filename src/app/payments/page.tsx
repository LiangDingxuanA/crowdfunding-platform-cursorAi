'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import DepositForm from '@/components/DepositForm'
import WithdrawForm from '@/components/WithdrawForm'

function PaymentsContent() {
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [balance, setBalance] = useState<number>(0)
  const [status, setStatus] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const fetchBalance = async () => {
      if (session?.user?.email) {
        try {
          const response = await fetch('/api/payments/balance')
          const data = await response.json()
          if (response.ok) {
            setBalance(data.balance)
          }
        } catch (error) {
          console.error('Error fetching balance:', error)
        }
      }
    }

    // Fetch balance when page loads or when success parameter is present
    fetchBalance()
  }, [session, searchParams.get('success')])

  useEffect(() => {
    const paymentStatus = searchParams?.get('status')
    if (paymentStatus === 'success') {
      setStatus('success')
      setMessage('Payment successful! Your transaction has been completed.')
    } else if (paymentStatus === 'cancel') {
      setStatus('error')
      setMessage('Payment cancelled. Please try again.')
    }
  }, [searchParams])

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Please sign in to access payments.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {status && (
          <div
            className={`p-4 mb-4 rounded-md ${
              status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {message}
          </div>
        )}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
          <p className="mt-2 text-lg text-gray-600">
            Current Balance: ${balance.toFixed(2)}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <DepositForm onSuccess={() => setBalance(prev => prev)} />
          <WithdrawForm 
            currentBalance={balance} 
            onSuccess={(amount) => setBalance(prev => prev - amount)} 
          />
        </div>
      </div>
    </div>
  )
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentsContent />
    </Suspense>
  )
} 