import 'next-auth';
import { DefaultSession } from 'next-auth';
import { AdapterUser } from '@auth/mongodb-adapter';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      phone?: string;
      address?: string;
      kycStatus?: string;
      memberSince?: Date;
      createdAt?: Date;
    }
  }

  interface User {
    id: string;
    role?: string;
    phone?: string;
    address?: string;
    kycStatus?: string;
    memberSince?: Date;
    createdAt?: Date;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role?: string;
    phone?: string;
    address?: string;
    kycStatus?: string;
    memberSince?: Date;
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
  }
} 