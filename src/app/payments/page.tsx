'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import DepositForm from '@/components/DepositForm'
import WithdrawForm from '@/components/WithdrawForm'

export default function PaymentsPage() {
  const { data: session } = useSession()
  const [balance, setBalance] = useState<number>(0)
  const searchParams = useSearchParams()

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
        {searchParams.get('success') === 'true' && (
          <div className="mb-4 p-3 bg-green-50 text-green-500 rounded-md">
            Payment successful! Your balance has been updated.
          </div>
        )}
        {searchParams.get('canceled') === 'true' && (
          <div className="mb-4 p-3 bg-yellow-50 text-yellow-500 rounded-md">
            Payment was canceled.
          </div>
        )}
        {searchParams.get('error') === 'true' && (
          <div className="mb-4 p-3 bg-red-50 text-red-500 rounded-md">
            There was an error processing your payment. Please try again.
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