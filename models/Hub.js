const mongoose = require('mongoose');

const hubSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['digest', 'impact', 'minutes'],
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  // For digest
  content: {
    type: String,
  },
  quarter: {
    type: String, // e.g. "Q1 2025"
  },
  // For impact tracking
  whatWasRaised: { type: String },
  actionTaken: { type: String },
  whatChanged: { type: String },
  // For minutes
  attachment: {
    filename: String,
    originalName: String,
    path: String,
  },
  tags: [String],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  isPublished: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Hub', hubSchema);
