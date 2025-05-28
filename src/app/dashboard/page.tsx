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
    lastUpdated: new Date().toISOString(),
  });

  const investmentMix = [
    { category: 'Residential', percentage: 40 },
    { category: 'Commercial', percentage: 35 },
    { category: 'Industrial', percentage: 25 },
  ];

  const timeline = [
    { date: '2024-03-15', event: 'Project A dividend payment' },
    { date: '2024-03-20', event: 'Project B quarterly report' },
    { date: '2024-03-25', event: 'New investment opportunity' },
  ];

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
        
        {/* Investment Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-blue-500" />
              <h2 className="ml-2 text-lg font-semibold text-black">Investment Mix</h2>
            </div>
            <div className="mt-4 space-y-2">
              {investmentMix.map((item) => (
                <div key={item.category} className="flex justify-between">
                  <span className="text-black">{item.category}</span>
                  <span className="font-medium text-black">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <WalletIcon className="h-8 w-8 text-green-500" />
              <h2 className="ml-2 text-lg font-semibold text-black">Wallet Balance</h2>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-black">${walletSummary.balance.toLocaleString()}</p>
              <p className="text-sm text-black">Available for investment</p>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-500">
                  Total Invested: ${walletSummary.totalInvested.toLocaleString()}
                </p>
                <p className="text-sm text-green-500">
                  Total Returns: ${walletSummary.totalReturns.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-purple-500" />
              <h2 className="ml-2 text-lg font-semibold text-black">Timeline</h2>
            </div>
            <div className="mt-4 space-y-2">
              {timeline.map((item) => (
                <div key={item.date} className="flex justify-between">
                  <span className="text-black">{item.event}</span>
                  <span className="text-black">{item.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 text-black">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-black">Investment in Project A</p>
                <p className="text-sm text-black">Residential</p>
              </div>
              <span className="text-green-500">+$5,000</span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-black">Dividend Payment</p>
                <p className="text-sm text-black">Project B</p>
              </div>
              <span className="text-green-500">+$250</span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DashboardPage; 