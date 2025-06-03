# Crowdfunding Platform

A modern crowdfunding platform built with Next.js, MongoDB, and Stripe.

## Features

- User authentication with NextAuth.js
- Secure payments with Stripe
- Project creation and management
- Wallet system with deposits and withdrawals
- Stripe Connect integration for project creators
- Real-time transaction tracking

## Tech Stack

- Next.js 13+ with App Router
- TypeScript
- MongoDB with Mongoose
- Stripe for payments
- NextAuth.js for authentication
- TailwindCSS for styling

## Deployment Guide

### Prerequisites

1. Node.js 18+ installed
2. MongoDB Atlas account
3. Stripe account
4. Vercel account

### Environment Variables

Create a `.env` file with the following variables:

```env
# App
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Database
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/your-database

# Authentication
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-nextauth-secret

# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OAuth Providers (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret
```

### Deployment Steps

1. **Prepare MongoDB:**
   - Create a MongoDB Atlas cluster
   - Whitelist your deployment IP or allow access from anywhere
   - Create a database user
   - Get your MongoDB connection string

2. **Configure Stripe:**
   - Create a Stripe account
   - Enable Connect if not already enabled
   - Get your API keys
   - Set up webhook endpoints
   - Configure Connect settings

3. **Deploy to Vercel:**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Login to Vercel
   vercel login

   # Deploy
   vercel
   ```

4. **Post-Deployment Setup:**
   - Add environment variables in Vercel dashboard
   - Configure Stripe webhook endpoint
   - Test the payment flow
   - Verify Connect onboarding

### Local Development

1. Clone the repository:
```bash
   git clone https://github.com/yourusername/crowdfunding-platform.git
cd crowdfunding-platform
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Run the development server:
```bash
npm run dev
```

### Production Build

To create a production build:

```bash
npm run build
npm start
```

## Stripe Integration

### Webhooks

Configure the following webhook endpoints in your Stripe dashboard:

1. `/api/payments/webhook` - For payment processing
2. `/api/stripe/connect/webhook` - For Connect account updates

### Testing

Use these test card numbers:
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002

For Connect testing, use:
- Account number: 000123456789
- Routing number: 110000000

## Support

For support, email support@yourdomain.com or create an issue in the repository.

## License

MIT
