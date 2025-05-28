import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        return false;
      }

      router.push('/dashboard');
      return true;
    } catch (err) {
      setError('An error occurred during login');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      setError(null);

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

      router.push('/');
    } catch (err) {
      setError('An error occurred during logout');
    } finally {
      setLoading(false);
    }
  };

  return {
    session,
    status,
    loading,
    error,
    login,
    logout,
    isAuthenticated: status === 'authenticated',
  };
} 