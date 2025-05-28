'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function Logout() {
  const router = useRouter();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Call the logout API
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        // Sign out from NextAuth
        await signOut({ redirect: false });

        // Clear any client-side storage
        localStorage.removeItem('user');
        sessionStorage.clear();

        // Redirect to home page
        router.push('/');
      } catch (error) {
        console.error('Logout error:', error);
        // Still redirect to home page even if there's an error
        router.push('/');
      }
    };

    handleLogout();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Logging out...
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Please wait while we log you out.
        </p>
      </div>
    </div>
  );
} 