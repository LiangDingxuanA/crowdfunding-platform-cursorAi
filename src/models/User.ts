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
    required: [true, 'Please provide a name'],
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    match: [
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      'Please provide a valid email',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'creator'],
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
    sparse: true,
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