const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

const pollSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Poll question is required'],
    trim: true,
  },
  options: {
    type: [optionSchema],
    validate: {
      validator: (v) => v.length >= 2,
      message: 'Poll must have at least 2 options',
    },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isOpen: {
    type: Boolean,
    default: true,
  },
  closesAt: {
    type: Date,
  },
}, { timestamps: true });

// Virtual: total votes
pollSchema.virtual('totalVotes').get(function () {
  return this.options.reduce((sum, opt) => sum + opt.votes.length, 0);
});

// Check if user has voted
pollSchema.methods.hasVoted = function (userId) {
  return this.options.some((opt) =>
    opt.votes.some((v) => v.toString() === userId.toString())
  );
};

pollSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Poll', pollSchema);
