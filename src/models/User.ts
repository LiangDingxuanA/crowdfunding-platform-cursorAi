import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  paymentId: String,
  transferId: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: function(this: { authProvider?: string }) {
      return !this.authProvider; // Password is only required if no auth provider is set
    },
  },
  authProvider: {
    type: String,
    enum: ['credentials', 'google', 'github', 'email'],
    default: 'credentials',
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  phone: {
    type: String,
  },
  address: {
    type: String,
  },
  employmentDetails: {
    type: String,
  },
  officeAddress: {
    type: String,
  },
  country: {
    type: String,
  },
  citizenshipNumber: {
    type: String,
  },
  passportNumber: {
    type: String,
  },
  onboardingStep: {
    type: Number,
    default: 0,
  },
  kycStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
  },
  idDocument: {
    type: String,
  },
  proofOfAddress: {
    type: String,
  },
  memberSince: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  balance: {
    type: Number,
    default: 0,
  },
  stripeCustomerId: {
    type: String,
    sparse: true,
  },
  stripeConnectAccountId: {
    type: String,
  },
  stripeConnectAccountStatus: {
    type: String,
    enum: ['pending', 'verified', 'restricted', 'rejected'],
    default: 'pending',
  },
  stripeConnectOnboardingComplete: {
    type: Boolean,
    default: false,
  },
  stripeConnectPayoutsEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorCode: {
    type: String,
  },
  twoFactorExpiry: {
    type: Date,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  deposits: [transactionSchema],
  withdrawals: [transactionSchema],
}, {
  timestamps: true,
});

// Update the updatedAt timestamp before saving
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User; 