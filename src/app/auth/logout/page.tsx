'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function Logout() {
  const router = useRouter();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Clear all localStorage items
        localStorage.clear();
        
        // Clear all sessionStorage items
        sessionStorage.clear();

        // Clear all cookies
        document.cookie.split(';').forEach(cookie => {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.slice(0, eqPos).trim() : cookie.trim();
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          // Also try to clear cookies with different paths
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/api/auth`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/auth`;
        });

        // Call the logout API
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        // Sign out from NextAuth with a callback to ensure complete signout
        await signOut({
          redirect: false,
          callbackUrl: '/'
        });

        // Redirect to home page
        router.push('/');
        // Force a full page reload to ensure all state is cleared
        window.location.href = '/';
      } catch (error) {
        console.error('Logout error:', error);
        // Still redirect to home page even if there's an error
        window.location.href = '/';
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