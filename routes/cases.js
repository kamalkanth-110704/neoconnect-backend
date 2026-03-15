const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Case = require('../models/Case');
const { protect, restrictTo } = require('../middleware/auth');

// Multer config
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only images and PDFs allowed'));
  },
});

// POST /api/cases — staff submits a case
router.post('/', protect, upload.array('attachments', 5), async (req, res) => {
  try {
    const { title, description, category, department, location, severity, isAnonymous } = req.body;

    const attachments = (req.files || []).map((f) => ({
      filename: f.filename,
      originalName: f.originalname,
      mimetype: f.mimetype,
      path: f.path,
    }));

    const newCase = await Case.create({
      title,
      description,
      category,
      department,
      location,
      severity,
      isAnonymous: isAnonymous === 'true' || isAnonymous === true,
      submittedBy: req.user._id,
      attachments,
    });

    res.status(201).json({ case: newCase });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/cases — secretariat/admin see all; case manager sees assigned; staff see own
router.get('/', protect, async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'staff') {
      filter.submittedBy = req.user._id;
    } else if (req.user.role === 'case_manager') {
      filter.assignedTo = req.user._id;
    }
    // secretariat and admin see all

    const { status, category, department, severity } = req.query;
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (department) filter.department = department;
    if (severity) filter.severity = severity;

    const cases = await Case.find(filter)
      .populate('assignedTo', 'name email')
      .populate('submittedBy', 'name department')
      .populate('notes.addedBy', 'name')
      .sort({ createdAt: -1 });

    // Strip submitter identity for anonymous cases if viewer is not secretariat/admin
    const sanitised = cases.map((c) => {
      const obj = c.toObject();
      if (obj.isAnonymous && !['secretariat', 'admin'].includes(req.user.role)) {
        obj.submittedBy = null;
      }
      return obj;
    });

    res.json({ cases: sanitised, total: sanitised.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/cases/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const c = await Case.findById(req.params.id)
      .populate('assignedTo', 'name email role')
      .populate('submittedBy', 'name department')
      .populate('notes.addedBy', 'name');

    if (!c) return res.status(404).json({ message: 'Case not found' });

    const obj = c.toObject();
    if (obj.isAnonymous && !['secretariat', 'admin'].includes(req.user.role)) {
      obj.submittedBy = null;
    }

    res.json({ case: obj });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/cases/:id/assign — secretariat assigns a case
router.patch(
  '/:id/assign',
  protect,
  restrictTo('secretariat', 'admin'),
  async (req, res) => {
    try {
      const { assignedTo } = req.body;
      const c = await Case.findByIdAndUpdate(
        req.params.id,
        {
          assignedTo,
          status: 'Assigned',
          assignedAt: new Date(),
          lastActivityAt: new Date(),
        },
        { new: true }
      ).populate('assignedTo', 'name email');

      if (!c) return res.status(404).json({ message: 'Case not found' });
      res.json({ case: c });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// PATCH /api/cases/:id/status — case manager updates status
router.patch(
  '/:id/status',
  protect,
  restrictTo('case_manager', 'secretariat', 'admin'),
  async (req, res) => {
    try {
      const { status } = req.body;
      const update = { status, lastActivityAt: new Date() };
      if (status === 'Resolved') update.resolvedAt = new Date();

      const c = await Case.findByIdAndUpdate(req.params.id, update, { new: true });
      if (!c) return res.status(404).json({ message: 'Case not found' });
      res.json({ case: c });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// POST /api/cases/:id/notes — add a note/response
router.post(
  '/:id/notes',
  protect,
  restrictTo('case_manager', 'secretariat', 'admin'),
  async (req, res) => {
    try {
      const { content } = req.body;
      const c = await Case.findById(req.params.id);
      if (!c) return res.status(404).json({ message: 'Case not found' });

      c.notes.push({ content, addedBy: req.user._id, addedByName: req.user.name });
      c.lastActivityAt = new Date();
      if (c.status === 'Assigned') c.status = 'In Progress';

      await c.save();
      res.json({ case: c });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
