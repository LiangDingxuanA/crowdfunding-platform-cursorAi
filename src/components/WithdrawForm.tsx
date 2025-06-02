'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

interface WithdrawFormProps {
  currentBalance: number;
  onSuccess?: (amount: number) => void;
}

export default function WithdrawForm({ currentBalance, onSuccess }: WithdrawFormProps) {
  const { data: session } = useSession()
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    setStatus('processing')

    try {
      const response = await fetch('/api/payments/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process withdrawal')
      }

      // Handle different response types
      if (data.status === 'onboarding_required') {
        // Redirect to Stripe Connect onboarding
        window.location.href = data.onboardingUrl
        return
      }

      if (data.status === 'verification_required') {
        // Redirect to complete verification
        window.location.href = data.verificationUrl
        return
      }

      // Success case
      setStatus('success')
      setAmount('')
      onSuccess?.(parseFloat(amount))

      // Show estimated arrival
      const estimatedDate = new Date(data.estimatedArrival)
      setError(`Withdrawal initiated! Funds should arrive by ${estimatedDate.toLocaleDateString()}`)
    } catch (err) {
      console.error('Withdrawal error:', err)
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to process withdrawal')
    } finally {
      setLoading(false)
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value)
      setError(null)
    }
  }

  if (!session) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-center text-gray-600">Please sign in to withdraw funds.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="text-lg font-medium text-gray-900">Withdraw Funds</h2>
      <p className="mt-1 text-sm text-gray-600">
        Current balance: ${currentBalance.toFixed(2)}
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Amount (USD)
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="amount"
              value={amount}
              onChange={handleAmountChange}
              placeholder="Enter amount"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
              disabled={loading}
            />
          </div>
          {parseFloat(amount) > currentBalance && (
            <p className="mt-1 text-sm text-red-600">
              Amount exceeds available balance
            </p>
          )}
        </div>

        {error && (
          <div className={`text-sm ${status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={
            loading ||
            !amount ||
            parseFloat(amount) <= 0 ||
            parseFloat(amount) > currentBalance
          }
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Withdraw to Bank Account'}
        </button>

        <p className="mt-2 text-xs text-gray-500">
          Note: Withdrawals typically take 2-3 business days to arrive in your bank account.
          A 0.25% fee applies to all withdrawals.
        </p>
      </form>
    </div>
  )
} 