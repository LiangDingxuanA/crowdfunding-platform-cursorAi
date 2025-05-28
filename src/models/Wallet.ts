import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Update lastUpdated timestamp before saving
walletSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

const Wallet = mongoose.models.Wallet || mongoose.model('Wallet', walletSchema);

export default Wallet; 