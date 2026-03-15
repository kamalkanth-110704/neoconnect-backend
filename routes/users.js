const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, restrictTo } = require('../middleware/auth');

// GET /api/users — admin sees all users
router.get('/', protect, restrictTo('admin', 'secretariat'), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/case-managers — list eligible case managers
router.get('/case-managers', protect, restrictTo('secretariat', 'admin'), async (req, res) => {
  try {
    const managers = await User.find({ role: 'case_manager', isActive: true }, 'name email department');
    res.json({ managers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/users/:id — admin updates role or status
router.patch('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { role, isActive, department } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role, isActive, department },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/users/:id — admin deactivates a user (soft delete)
router.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
