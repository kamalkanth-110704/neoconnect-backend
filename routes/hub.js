const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Hub = require('../models/Hub');
const { protect, restrictTo } = require('../middleware/auth');

const uploadDir = path.join(__dirname, '../uploads/hub');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// GET /api/hub — all staff can read (public hub)
router.get('/', protect, async (req, res) => {
  try {
    const { type, search } = req.query;
    let filter = { isPublished: true };
    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }
    const items = await Hub.find(filter).populate('createdBy', 'name').sort({ createdAt: -1 });
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/hub — secretariat creates hub entry
router.post(
  '/',
  protect,
  restrictTo('secretariat', 'admin'),
  upload.single('attachment'),
  async (req, res) => {
    try {
      const { type, title, content, quarter, whatWasRaised, actionTaken, whatChanged, tags } = req.body;

      const data = {
        type,
        title,
        content,
        quarter,
        whatWasRaised,
        actionTaken,
        whatChanged,
        tags: tags ? tags.split(',').map((t) => t.trim()) : [],
        createdBy: req.user._id,
      };

      if (req.file) {
        data.attachment = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: req.file.path,
        };
      }

      const item = await Hub.create(data);
      res.status(201).json({ item });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// DELETE /api/hub/:id
router.delete('/:id', protect, restrictTo('secretariat', 'admin'), async (req, res) => {
  try {
    await Hub.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
