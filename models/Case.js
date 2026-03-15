const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  content: { type: String, required: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  addedByName: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const caseSchema = new mongoose.Schema({
  trackingId: {
    type: String,
    unique: true,
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
  },
  category: {
    type: String,
    enum: ['Safety', 'Policy', 'Facilities', 'HR', 'Other'],
    required: true,
  },
  department: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    trim: true,
  },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Low',
  },
  status: {
    type: String,
    enum: ['New', 'Assigned', 'In Progress', 'Pending', 'Resolved', 'Escalated'],
    default: 'New',
  },
  isAnonymous: {
    type: Boolean,
    default: false,
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  attachments: [
    {
      filename: String,
      originalName: String,
      mimetype: String,
      path: String,
    },
  ],
  notes: [noteSchema],
  assignedAt: { type: Date },
  lastActivityAt: { type: Date, default: Date.now },
  escalatedAt: { type: Date },
  resolvedAt: { type: Date },
}, { timestamps: true });

// Auto-generate tracking ID before saving
caseSchema.pre('save', async function (next) {
  if (this.isNew && !this.trackingId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Case').countDocuments({
      createdAt: {
        $gte: new Date(`${year}-01-01`),
        $lt: new Date(`${year + 1}-01-01`),
      },
    });
    const seq = String(count + 1).padStart(3, '0');
    this.trackingId = `NEO-${year}-${seq}`;
  }
  next();
});

// Check if escalation is needed (7 working days = ~10 calendar days)
caseSchema.methods.needsEscalation = function () {
  if (!['Assigned', 'In Progress'].includes(this.status)) return false;
  if (!this.assignedAt) return false;
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysSinceAssigned = (Date.now() - this.assignedAt.getTime()) / msPerDay;
  const daysSinceActivity = (Date.now() - this.lastActivityAt.getTime()) / msPerDay;
  return daysSinceAssigned >= 10 && daysSinceActivity >= 10;
};

module.exports = mongoose.model('Case', caseSchema);
