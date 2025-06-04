'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { UserCircleIcon, BellIcon, ShieldCheckIcon, CreditCardIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  kycStatus: 'pending' | 'verified' | 'rejected';
  memberSince: string;
  idDocument?: string;
  proofOfAddress?: string;
}

const ProfilePage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    kycStatus: 'pending',
    memberSince: new Date().toISOString(),
  });
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (!res.ok) {
          throw new Error('Failed to fetch profile');
        }
        const data = await res.json();
        setProfile(data);
        setFormData({
          name: data.name || '',
          phone: data.phone || '',
          address: data.address || '',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedProfile = await res.json();
      setProfile(updatedProfile);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'idDocument' | 'proofOfAddress') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const res = await fetch('/api/user/upload-document', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Failed to upload document');
      }

      const data = await res.json();
      setProfile(prev => ({
        ...prev,
        [type]: data.url,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setUploading(false);
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

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-black">Loading profile...</div>
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

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Profile Information */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-black">Personal Information</h2>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-blue-500 hover:text-blue-600"
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 border rounded-lg text-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full p-2 border rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full p-2 border rounded-lg text-black"
                  rows={3}
                />
              </div>
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                Save Changes
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <UserCircleIcon className="h-6 w-6 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="text-black">{profile.name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <UserCircleIcon className="h-6 w-6 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-black">{profile.email}</p>
                </div>
              </div>
              {profile.phone && (
                <div className="flex items-center space-x-4">
                  <UserCircleIcon className="h-6 w-6 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-black">{profile.phone}</p>
                  </div>
                </div>
              )}
              {profile.address && (
                <div className="flex items-center space-x-4">
                  <UserCircleIcon className="h-6 w-6 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="text-black">{profile.address}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* KYC Verification */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center space-x-2 mb-6">
            <ShieldCheckIcon className="h-6 w-6 text-blue-500" />
            <h2 className="text-lg font-semibold text-black">KYC Verification</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-black">Verification Status</p>
                <p className={`text-sm ${
                  profile.kycStatus === 'verified' ? 'text-green-500' :
                  profile.kycStatus === 'rejected' ? 'text-red-500' :
                  'text-yellow-500'
                }`}>
                  {profile.kycStatus.charAt(0).toUpperCase() + profile.kycStatus.slice(1)}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  ID Document (Passport/IC)
                </label>
                <input
                  type="file"
                  onChange={(e) => handleFileUpload(e, 'idDocument')}
                  className="w-full p-2 border rounded-lg text-black"
                  accept="image/*,.pdf"
                  disabled={uploading}
                />
                {profile.idDocument && (
                  <p className="text-sm text-green-500 mt-1">Document uploaded</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Proof of Address
                </label>
                <input
                  type="file"
                  onChange={(e) => handleFileUpload(e, 'proofOfAddress')}
                  className="w-full p-2 border rounded-lg text-black"
                  accept="image/*,.pdf"
                  disabled={uploading}
                />
                {profile.proofOfAddress && (
                  <p className="text-sm text-green-500 mt-1">Document uploaded</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center space-x-2 mb-6">
            <DocumentTextIcon className="h-6 w-6 text-blue-500" />
            <h2 className="text-lg font-semibold text-black">Account Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Member Since</p>
              <p className="text-black">
                {new Date(profile.memberSince).toLocaleDateString()}
              </p>
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