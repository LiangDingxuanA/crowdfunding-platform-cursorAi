'use client'

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { ChartBarIcon, WalletIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface WalletSummary {
  balance: number;
  totalInvested: number;
  totalReturns: number;
  activeProjects: number;
  investmentMix: Array<{
    category: string;
    percentage: number;
  }>;
  timeline: Array<{
    date: string;
    event: string;
    id: string;
  }>;
  lastUpdated: string;
}

const DashboardPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletSummary, setWalletSummary] = useState<WalletSummary>({
    balance: 0,
    totalInvested: 0,
    totalReturns: 0,
    activeProjects: 0,
    investmentMix: [],
    timeline: [],
    lastUpdated: new Date().toISOString(),
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchWalletSummary = async () => {
      try {
        const res = await fetch('/api/wallet/summary');
        if (!res.ok) {
          throw new Error('Failed to fetch wallet summary');
        }
        const data = await res.json();
        setWalletSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch wallet data');
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchWalletSummary();
    }
  }, [session]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-black">Loading dashboard data...</div>
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
        <h1 className="text-2xl font-bold text-black">Dashboard</h1>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        )}
        
        {/* Investment Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-blue-500" />
              <h2 className="ml-2 text-lg font-semibold text-black">Investment Mix</h2>
            </div>
            <div className="mt-4 space-y-2">
              {walletSummary.investmentMix.length > 0 ? (
                walletSummary.investmentMix.map((item) => (
                  <div key={item.category} className="flex justify-between">
                    <span className="text-black">{item.category}</span>
                    <span className="font-medium text-black">{item.percentage}%</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No investments yet</p>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <WalletIcon className="h-8 w-8 text-green-500" />
              <h2 className="ml-2 text-lg font-semibold text-black">Wallet Balance</h2>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-black">S${walletSummary.balance.toLocaleString()}</p>
              <p className="text-sm text-black">Available for investment</p>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-500">
                  Total Invested: S${walletSummary.totalInvested.toLocaleString()}
                </p>
                <p className="text-sm text-green-500">
                  Total Returns: S${walletSummary.totalReturns.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-purple-500" />
              <h2 className="ml-2 text-lg font-semibold text-black">Recent Activity</h2>
            </div>
            <div className="mt-4 space-y-2">
              {walletSummary.timeline.length > 0 ? (
                walletSummary.timeline.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-black">{item.event}</span>
                    <span className="text-black">{item.date}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No recent activity</p>
              )}
            </div>
          </div>
        </div>

        {/* Active Projects */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 text-black">Active Projects</h2>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-black">{walletSummary.activeProjects}</p>
            <p className="text-sm text-gray-500">Projects you're invested in</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DashboardPage; 