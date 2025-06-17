import type { DefaultSession, AdapterUser } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      phone?: string;
      address?: string;
      kycStatus?: 'pending' | 'approved' | 'rejected';
      memberSince?: Date;
      role?: string;
      authProvider?: string;
      createdAt?: Date;
    } & DefaultSession['user'];
  }

  interface User extends AdapterUser {
    phone?: string;
    address?: string;
    kycStatus?: 'pending' | 'approved' | 'rejected';
    memberSince?: Date;
    role?: string;
    authProvider?: string;
    createdAt?: Date;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    phone?: string;
    address?: string;
    kycStatus?: 'pending' | 'approved' | 'rejected';
    memberSince?: Date;
    role?: string;
    authProvider?: string;
    createdAt?: Date;
  }
}

declare module '@auth/mongodb-adapter' {
  interface AdapterUser {
    role?: string;
    phone?: string;
    address?: string;
    kycStatus?: string;
    memberSince?: Date;
    createdAt?: Date;
    authProvider?: string;
  }
} 