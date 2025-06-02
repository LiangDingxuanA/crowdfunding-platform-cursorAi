import mongoose from 'mongoose';

const projectPaymentSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    investorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentIntentId: {
      type: String,
      sparse: true,
    },
    transferId: {
      type: String,
      sparse: true,
    },
    fee: {
      type: Number,
      default: 0,
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    refundAmount: {
      type: Number,
    },
    refundReason: {
      type: String,
    },
    metadata: {
      type: Map,
      of: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
projectPaymentSchema.index({ projectId: 1, status: 1 });
projectPaymentSchema.index({ investorId: 1, status: 1 });

const ProjectPayment = mongoose.models.ProjectPayment || mongoose.model('ProjectPayment', projectPaymentSchema);

export default ProjectPayment; 