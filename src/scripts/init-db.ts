import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

// Load environment variables from .env.local
const envPath = resolve(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env.local file not found at:', envPath);
  process.exit(1);
}

// Load environment variables
const result = config({ path: envPath });
if (result.error) {
  console.error('Error loading .env.local:', result.error);
  process.exit(1);
}

// Verify required environment variables
const requiredEnvVars = ['MONGODB_URI', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Error: Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

console.log('Environment variables loaded successfully');

// Now import the rest of the modules
import connectDB from '../lib/db';
import User from '../models/User';
import Project from '../models/Project';
import Transaction from '../models/Transaction';
import bcrypt from 'bcryptjs';

async function initializeDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();

    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Project.deleteMany({});
    await Transaction.deleteMany({});

    console.log('Creating initial user...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: hashedPassword,
      role: 'user',
      phone: '+1234567890',
      address: '123 Main St, City, Country',
      employmentDetails: 'Software Engineer',
      officeAddress: '456 Tech Park, City, Country',
      country: 'United States',
      citizenshipNumber: 'C123456789',
      passportNumber: 'P987654321',
      onboardingStep: 3,
      kycStatus: 'verified',
      memberSince: new Date(),
    });

    console.log('Creating sample projects...');
    const projects = await Project.create([
      {
        name: 'Solar Energy Project',
        type: 'Industrial',
        location: 'California, USA',
        targetAmount: 100000,
        currentAmount: 25000,
        returnRate: 8.5,
        duration: 12,
        status: 'active',
        description: 'A large-scale solar energy project in California.',
        createdBy: user._id,
      },
      {
        name: 'Wind Farm Development',
        type: 'Industrial',
        location: 'Texas, USA',
        targetAmount: 200000,
        currentAmount: 75000,
        returnRate: 7.5,
        duration: 24,
        status: 'active',
        description: 'Wind farm development project in Texas.',
        createdBy: user._id,
      },
      {
        name: 'Hydroelectric Plant',
        type: 'Industrial',
        location: 'Washington, USA',
        targetAmount: 500000,
        currentAmount: 150000,
        returnRate: 9.0,
        duration: 36,
        status: 'active',
        description: 'Hydroelectric power plant project.',
        createdBy: user._id,
      },
    ]);

    console.log('Creating sample transactions...');
    await Transaction.create([
      {
        userId: user._id,
        projectId: projects[0]._id,
        type: 'investment',
        amount: 5000,
        status: 'completed',
        date: new Date(),
        description: 'Initial investment in Solar Energy Project',
      },
      {
        userId: user._id,
        projectId: projects[1]._id,
        type: 'investment',
        amount: 10000,
        status: 'completed',
        date: new Date(),
        description: 'Investment in Wind Farm Development',
      },
      {
        userId: user._id,
        projectId: projects[2]._id,
        type: 'investment',
        amount: 15000,
        status: 'completed',
        date: new Date(),
        description: 'Investment in Hydroelectric Plant',
      },
    ]);

    console.log('Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase(); 