'use client';

import React, { useEffect, useState, Suspense } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';

if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable');
}

// Initialize Stripe with the publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

interface Transaction {
  _id: string;
  type: 'deposit' | 'withdrawal' | 'investment' | 'dividend';
  amount: number;
  date: string;
  status: 'pending' | 'completed' | 'failed';
  description: string;
}

interface WalletSummary {
  balance: number;
  totalInvested: number;
  totalReturns: number;
  activeProjects: number;
  lastUpdated: string;
}

function WalletContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<WalletSummary>({
    balance: 0,
    totalInvested: 0,
    totalReturns: 0,
    activeProjects: 0,
    lastUpdated: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [amount, setAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [withdrawalStatus, setWithdrawalStatus] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        const [transactionsRes, summaryRes] = await Promise.all([
          fetch('/api/wallet/transactions'),
          fetch('/api/wallet/summary'),
          
        ]);

        if (!transactionsRes.ok || !summaryRes.ok) {
          throw new Error('Failed to fetch wallet data');
        }

        const [transactionsData, summaryData] = await Promise.all([
          transactionsRes.json(),
          summaryRes.json(),
        ]);

        setTransactions(transactionsData);
        setSummary(summaryData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
    fetchWalletData();
    }
  }, [session, searchParams.get('success')]);

  const handleDeposit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Number(amount),
          email: session?.user?.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error('Deposit error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process deposit');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdrawal = async () => {
    console.log('Starting withdrawal process...');
    console.log('Amount:', amount);
    console.log('Current balance:', summary.balance);

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      console.log('Invalid amount error');
      setError('Please enter a valid amount');
      return;
    }

    if (Number(amount) > summary.balance) {
      console.log('Insufficient balance error');
      setError('Insufficient balance');
      return;
    }

    setIsProcessing(true);
    setError(null);
    console.log('Making withdrawal API request...');

    try {
      const response = await fetch('/api/payments/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Number(amount),
          email: session?.user?.email,
        }),
      });

      console.log('Withdrawal API response status:', response.status);
      const data = await response.json();
      console.log('Withdrawal API response data:', data);

      if (!response.ok) {
        console.error('Withdrawal API error:', data.error);
        throw new Error(data.error || 'Failed to process withdrawal');
      }

      // Handle special cases
      if (data.status === 'onboarding_required' || data.status === 'verification_required') {
        console.log('Redirecting to Stripe:', data.onboardingUrl || data.verificationUrl);
        window.location.href = data.onboardingUrl || data.verificationUrl;
        return;
      }

      // Update the balance immediately with the new balance from the response
      if (data.newBalance !== undefined) {
        setSummary(prev => ({
          ...prev,
          balance: data.newBalance
        }));
      }

      // Refresh wallet data after successful withdrawal
      const [transactionsRes, summaryRes] = await Promise.all([
        fetch('/api/wallet/transactions'),
        fetch('/api/wallet/summary'),
      ]);

      if (transactionsRes.ok && summaryRes.ok) {
        const [transactionsData, summaryData] = await Promise.all([
          transactionsRes.json(),
          summaryRes.json(),
        ]);

        setTransactions(transactionsData);
        setSummary(summaryData);
      }

      setAmount('');
      setWithdrawalStatus('success');
    } catch (err) {
      console.error('Withdrawal error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process withdrawal');
      setWithdrawalStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-black">Loading wallet data...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="flex justify-end mb-4">
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          onClick={() => router.push('/dashboard#analytics')}
        >
          View Portfolio Analytics
        </button>
      </div>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-black">Wallet</h1>

        {/* Balance Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 text-black">Available Balance</h2>
          <p className="text-4xl font-bold text-blue-600">S${summary.balance.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">Last updated: {new Date(summary.lastUpdated).toLocaleString()}</p>
          
          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          {searchParams.get('success') === 'true' && (
            <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-lg">
              Payment successful! Your balance has been updated.
            </div>
          )}
          {searchParams.get('canceled') === 'true' && (
            <div className="mt-4 p-3 bg-yellow-100 text-yellow-700 rounded-lg">
              Payment was canceled.
            </div>
          )}

          <div className="mt-4 space-y-4">
            <div className="flex items-center space-x-4">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="flex-1 p-2 border rounded-lg text-black"
                min="0"
                step="0.01"
                disabled={isProcessing}
              />
            </div>

            {showBankDetails && (
              <div className="space-y-4">
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Bank Account Number"
                  className="w-full p-2 border rounded-lg text-black"
                  disabled={isProcessing}
                />
                <input
                  type="text"
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value)}
                  placeholder="Routing Number"
                  className="w-full p-2 border rounded-lg text-black"
                  disabled={isProcessing}
                />
              </div>
            )}

            <div className="flex space-x-4">
              <button
                className="flex-1 flex items-center justify-center bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
                onClick={handleDeposit}
                disabled={isProcessing}
              >
              <PlusIcon className="h-5 w-5 mr-2" />
              Deposit
            </button>
              <button
                className="flex-1 flex items-center justify-center bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50"
                onClick={async () => {
                  console.log('Withdraw button clicked');
                  console.log('showBankDetails:', showBankDetails);
                  if (showBankDetails) {
                    console.log('Initiating withdrawal...');
                    await handleWithdrawal();
                  } else {
                    console.log('Showing bank details form');
                    setShowBankDetails(true);
                  }
                }}
                disabled={isProcessing}
              >
              <MinusIcon className="h-5 w-5 mr-2" />
                {showBankDetails ? 'Confirm Withdrawal' : 'Withdraw'}
              </button>
            </div>
            {showBankDetails && (
              <button
                className="w-full text-gray-600 hover:text-gray-800"
                onClick={() => {
                  setShowBankDetails(false);
                  setAccountNumber('');
                  setRoutingNumber('');
                }}
                disabled={isProcessing}
              >
                Cancel
            </button>
            )}
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 text-black">Transaction History</h2>
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction._id}
                className="flex items-center justify-between p-4 border-b last:border-b-0"
              >
                <div className="flex items-center space-x-4">
                  {transaction.type === 'deposit' ? (
                    <ArrowDownIcon className="h-6 w-6 text-green-500" />
                  ) : (
                    <ArrowUpIcon className="h-6 w-6 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium text-black">
                      {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(transaction.date).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${
                    transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'deposit' ? '+' : '-'}S${Math.abs(transaction.amount).toLocaleString()}
                  </p>
                  <p className={`text-sm ${
                    transaction.status === 'completed' ? 'text-green-600' :
                    transaction.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Investment Summary */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 text-black">Investment Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-black">Total Invested</p>
              <p className="text-xl font-semibold text-black">S${summary.totalInvested.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-black">Total Returns</p>
              <p className="text-xl font-semibold text-green-500">S${summary.totalReturns.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-black">Active Projects</p>
              <p className="text-xl font-semibold text-black">{summary.activeProjects}</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WalletContent />
    </Suspense>
  );
} 