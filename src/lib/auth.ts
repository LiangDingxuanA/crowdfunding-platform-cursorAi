import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import EmailProvider from 'next-auth/providers/email';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import clientPromise from './mongodb';
import bcrypt from 'bcryptjs';
import connectDB from './db';
import User from '@/models/User';
import { Document } from 'mongoose';

interface UserDocument extends Document {
  _id: string;
  email: string;
  name: string;
  password?: string;
  authProvider?: string;
  role?: string;
  phone?: string;
  address?: string;
  kycStatus?: string;
  memberSince?: Date;
  createdAt?: Date;
}

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise) as any,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter an email and password');
        }

        await connectDB();

        const user = await User.findOne({ 
          email: credentials.email,
          authProvider: 'credentials'
        }).select('+password') as UserDocument;

        if (!user) {
          throw new Error('No user found with this email');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password!);

        if (!isPasswordValid) {
          throw new Error('Invalid password');
        }

        // Return all user fields except password
        const userWithoutPassword = user.toObject();
        delete userWithoutPassword.password;

        return {
          id: user._id.toString(),
          ...userWithoutPassword,
          role: user.role || 'user',
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "consent"
        }
      }
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/logout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // If the URL contains /auth/login, always redirect to dashboard
      if (url.includes('/auth/login')) {
        return `${baseUrl}/dashboard`;
      }
      return url;
    },
    async signIn({ user, account, profile }) {
      try {
        await connectDB();
        
        // For OAuth providers
        if (account?.provider === 'google' || account?.provider === 'github') {
          // Check if user already exists
          const existingUser = await User.findOne({ email: user.email });
          
          if (existingUser) {
            // Update auth provider if needed
            if (existingUser.authProvider !== account.provider) {
              existingUser.authProvider = account.provider;
              await existingUser.save();
            }
            account.callbackUrl = '/dashboard';
          } else {
            // Create new user with OAuth provider
            await User.create({
              email: user.email,
              name: user.name,
              authProvider: account.provider,
              isVerified: true, // OAuth users are pre-verified
            });
            account.callbackUrl = '/onboarding/step-1';
          }
        }
        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.phone = (user as any).phone;
        token.address = (user as any).address;
        token.kycStatus = (user as any).kycStatus;
        token.memberSince = (user as any).memberSince;
        token.createdAt = (user as any).createdAt;
        token.authProvider = (user as any).authProvider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.phone = token.phone;
        session.user.address = token.address;
        session.user.kycStatus = token.kycStatus;
        session.user.memberSince = token.memberSince;
        session.user.createdAt = token.createdAt;
        session.user.authProvider = token.authProvider;
      }
      return session;
    }
  },
  events: {
    async signOut() {
      // Clear any server-side session data
      // This is optional as NextAuth handles most cleanup
    },
  },
}; 