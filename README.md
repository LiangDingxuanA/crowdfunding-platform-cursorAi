# Crowdfunding Platform

A modern crowdfunding platform built with Next.js, MongoDB, and NextAuth.js.

## Features

- Full-screen video landing page
- User authentication with email, Google, and GitHub
- Multi-step onboarding process
- Identity verification
- Address verification
- Secure document upload
- Responsive design

## Prerequisites

- Node.js 18 or later
- MongoDB running locally or a MongoDB Atlas account
- Google OAuth credentials
- GitHub OAuth credentials
- SMTP server access for email notifications

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd crowdfunding-platform
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory with the following variables:
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/crowdfunding

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here # Generate a secure random string

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret

# Email (SMTP)
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@crowdfunding.com
```

4. Set up OAuth credentials:
   - Create a Google OAuth application at https://console.cloud.google.com
   - Create a GitHub OAuth application at https://github.com/settings/developers
   - Add the credentials to your `.env.local` file

5. Set up email:
   - Configure your SMTP server details
   - For Gmail, create an App Password if using 2FA
   - Update the email configuration in `.env.local`

6. Start the development server:
```bash
npm run dev
```

7. Open http://localhost:3000 in your browser

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── onboarding/        # Onboarding flow
│   └── page.tsx           # Landing page
├── components/            # React components
├── lib/                   # Utility functions
└── providers/            # React context providers
```

## Development

- The platform uses the Next.js App Router
- Authentication is handled by NextAuth.js
- MongoDB is used for data storage
- Tailwind CSS for styling
- TypeScript for type safety

## Production Deployment

1. Set up a MongoDB database (e.g., MongoDB Atlas)
2. Configure environment variables in your hosting platform
3. Deploy to your preferred hosting service (e.g., Vercel)

## Security Considerations

- All environment variables must be kept secure
- Implement proper file upload security measures
- Add rate limiting to API routes
- Set up proper CORS policies
- Implement proper session management
- Use secure HTTPS connections

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
