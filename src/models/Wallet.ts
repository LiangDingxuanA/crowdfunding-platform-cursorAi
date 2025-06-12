import mongoose from 'mongoose';
import Transaction from './Transaction';

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

// Method to recalculate balance from transactions
walletSchema.methods.recalculateBalance = async function() {
  const transactions = await Transaction.find({
    userId: this.userId,
    status: 'completed'
  });

  this.balance = transactions.reduce((acc, transaction) => {
    switch (transaction.type) {
      case 'deposit':
        return acc + transaction.amount;
      case 'withdrawal':
      case 'investment':
        return acc + transaction.amount; // amount is already negative for these types
      case 'dividend':
        return acc + transaction.amount;
      default:
        return acc;
    }
  }, 0);

  await this.save();
};

const Wallet = mongoose.models.Wallet || mongoose.model('Wallet', walletSchema);

export default Wallet; 