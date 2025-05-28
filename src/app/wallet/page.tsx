'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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

const WalletPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
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
  }, [session]);

  const handleTransaction = async (type: 'deposit' | 'withdrawal') => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch('/api/wallet/transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          amount: Number(amount),
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} to wallet`,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Transaction failed');
      }

      // Refresh wallet data
      const [transactionsRes, summaryRes] = await Promise.all([
        fetch('/api/wallet/transactions'),
        fetch('/api/wallet/summary'),
      ]);

      const [transactionsData, summaryData] = await Promise.all([
        transactionsRes.json(),
        summaryRes.json(),
      ]);

      setTransactions(transactionsData);
      setSummary(summaryData);
      setAmount('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
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
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-black">Wallet</h1>

        {/* Balance Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 text-black">Available Balance</h2>
          <p className="text-4xl font-bold text-blue-600">${summary.balance.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">Last updated: {new Date(summary.lastUpdated).toLocaleString()}</p>
          
          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
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
            <div className="flex space-x-4">
              <button
                className="flex-1 flex items-center justify-center bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
                onClick={() => handleTransaction('deposit')}
                disabled={isProcessing}
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Deposit
              </button>
              <button
                className="flex-1 flex items-center justify-center bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50"
                onClick={() => handleTransaction('withdrawal')}
                disabled={isProcessing}
              >
                <MinusIcon className="h-5 w-5 mr-2" />
                Withdraw
              </button>
            </div>
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
                <div className="flex items-center">
                  {transaction.type === 'deposit' || transaction.type === 'dividend' ? (
                    <ArrowDownIcon className="h-6 w-6 text-green-500 mr-3" />
                  ) : (
                    <ArrowUpIcon className="h-6 w-6 text-red-500 mr-3" />
                  )}
                  <div>
                    <p className="font-medium capitalize text-black">{transaction.type}</p>
                    <p className="text-sm text-black">{new Date(transaction.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      transaction.amount > 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
                  </p>
                  <p className="text-sm text-black capitalize">{transaction.status}</p>
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
              <p className="text-xl font-semibold text-black">${summary.totalInvested.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-black">Total Returns</p>
              <p className="text-xl font-semibold text-green-500">${summary.totalReturns.toLocaleString()}</p>
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
};

export default WalletPage; 