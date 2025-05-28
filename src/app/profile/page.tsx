'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { UserCircleIcon, BellIcon, ShieldCheckIcon, CreditCardIcon } from '@heroicons/react/24/outline';

const ProfilePage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  const handleLogout = async () => {
    try {
      await signOut({ 
        redirect: true,
        callbackUrl: '/' 
      });
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/');
    }
  };

  const settings = [
    {
      id: 'notifications',
      title: 'Notification Preferences',
      icon: BellIcon,
      description: 'Manage your email and push notification settings',
    },
    {
      id: 'security',
      title: 'Security Settings',
      icon: ShieldCheckIcon,
      description: 'Update your password and security preferences',
    },
    {
      id: 'payment',
      title: 'Payment Methods',
      icon: CreditCardIcon,
      description: 'Manage your payment methods and billing information',
    },
  ];

  if (status === 'loading') {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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
        <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-black">Profile</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* User Information */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-start space-x-6">
            <div className="flex-shrink-0">
              {session.user.image ? (
                <img 
                  src={session.user.image} 
                  alt={session.user.name || 'Profile'} 
                  className="h-24 w-24 rounded-full"
                />
              ) : (
              <UserCircleIcon className="h-24 w-24 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-black">{session.user.name || 'No name provided'}</h2>
              <div className="mt-4 space-y-2">
                <div className="flex items-center">
                  <span className="text-black w-24">Email:</span>
                  <span className="text-black">{session.user.email}</span>
                </div>
                {session.user.phone && (
                <div className="flex items-center">
                  <span className="text-black w-24">Phone:</span>
                    <span className="text-black">{session.user.phone}</span>
                </div>
                )}
                {session.user.address && (
                <div className="flex items-center">
                  <span className="text-black w-24">Address:</span>
                    <span className="text-black">{session.user.address}</span>
                </div>
                )}
                {session.user.kycStatus && (
                <div className="flex items-center">
                  <span className="text-black w-24">KYC Status:</span>
                    <span className={`font-medium ${
                      session.user.kycStatus === 'verified' ? 'text-green-500' :
                      session.user.kycStatus === 'rejected' ? 'text-red-500' :
                      'text-yellow-500'
                    }`}>
                      {session.user.kycStatus.charAt(0).toUpperCase() + session.user.kycStatus.slice(1)}
                    </span>
                </div>
                )}
              </div>
              <button className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 text-black">Settings</h2>
          <div className="space-y-4">
            {settings.map((setting) => (
              <div key={setting.id} className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <setting.icon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-black">{setting.title}</h3>
                  <p className="text-sm text-black">{setting.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Account Actions</h2>
          <div className="space-y-4">
            <button className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 text-red-500">
              Deactivate Account
            </button>
            <button className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 text-red-500">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ProfilePage; 