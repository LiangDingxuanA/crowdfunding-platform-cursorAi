'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { loadStripe } from '@stripe/stripe-js';
import WithdrawForm from '@/components/WithdrawForm';

export default function WithdrawPage() {
  const { data: session } = useSession();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [balance, setBalance] = useState(0);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // Step 1: Initiate withdrawal
      const response = await fetch('/api/payments/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate withdrawal');
      }

      // Step 2: Load Stripe and handle bank account connection
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      if (!stripe) throw new Error('Failed to load Stripe');

      const result = await stripe.collectFinancialConnectionsAccounts({
        clientSecret: data.client_secret,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to connect bank account');
      }

      // Step 3: Complete the withdrawal
      const accountId = result.financialConnectionsSession.accounts[0]?.id;
      if (!accountId) {
        throw new Error('No bank account selected');
      }

      const completeResponse = await fetch('/api/payments/withdraw/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: data.transactionId,
          accountId,
        }),
      });

      const completeData = await completeResponse.json();
      
      if (!completeResponse.ok) {
        throw new Error(completeData.error || 'Failed to complete withdrawal');
      }

      setStatus(completeData.status);
      setAmount('');
      setBalance((prev) => prev - parseFloat(amount));

    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return <div className="p-4">Please sign in to access this page.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <WithdrawForm
            currentBalance={balance}
            onSuccess={(amount) => setBalance((prev) => prev - amount)}
          />
        </div>
      </div>
    </div>
  );
} 