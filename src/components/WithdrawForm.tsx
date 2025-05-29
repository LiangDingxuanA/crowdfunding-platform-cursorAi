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
  const [accountNumber, setAccountNumber] = useState('')
  const [routingNumber, setRoutingNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const withdrawAmount = parseFloat(amount)
    if (withdrawAmount > currentBalance) {
      setError('Insufficient balance')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/payments/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: withdrawAmount,
          accountNumber,
          routingNumber,
          email: session?.user?.email,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process withdrawal')
      }

      setSuccess('Withdrawal request submitted successfully')
      setAmount('')
      setAccountNumber('')
      setRoutingNumber('')
      onSuccess?.(withdrawAmount)
    } catch (err) {
      console.error('Withdrawal error:', err)
      setError(err instanceof Error ? err.message : 'Failed to process withdrawal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-6">Withdraw Funds</h2>
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-500 rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-500 rounded-md">
          {success}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Amount (USD)
          </label>
          <div className="mt-1">
            <input
              type="number"
              id="amount"
              min="1"
              max={currentBalance}
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter amount"
            />
          </div>
        </div>
        <div>
          <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700">
            Account Number
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="accountNumber"
              required
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter account number"
            />
          </div>
        </div>
        <div>
          <label htmlFor="routingNumber" className="block text-sm font-medium text-gray-700">
            Routing Number
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="routingNumber"
              required
              value={routingNumber}
              onChange={(e) => setRoutingNumber(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter routing number"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || !amount || !accountNumber || !routingNumber}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Withdraw'}
        </button>
      </form>
    </div>
  )
} 