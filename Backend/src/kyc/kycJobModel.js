const mongoose = require('mongoose');

const kycJobSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['queued','processing','needs_review','approved'],
    default: 'queued'
  },
  images: {
    idFront: String,
    idBack: String,
    selfie: String
  },
  ocrConfidence: Number,
  matchScore: Number,
  cid: String,
  txHash: String,
}, { timestamps: true });

module.exports = mongoose.model('KycJob', kycJobSchema);
