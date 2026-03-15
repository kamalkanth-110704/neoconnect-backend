const express = require('express');
const router = express.Router();
const Poll = require('../models/Poll');
const { protect, restrictTo } = require('../middleware/auth');

// POST /api/polls — secretariat creates a poll
router.post('/', protect, restrictTo('secretariat', 'admin'), async (req, res) => {
  try {
    const { question, options, closesAt } = req.body;
    const opts = options.map((text) => ({ text, votes: [] }));
    const poll = await Poll.create({ question, options: opts, closesAt, createdBy: req.user._id });
    res.status(201).json({ poll });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/polls — all staff can view
router.get('/', protect, async (req, res) => {
  try {
    const polls = await Poll.find().populate('createdBy', 'name').sort({ createdAt: -1 });
    res.json({ polls });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/polls/:id/vote — staff votes once
router.post('/:id/vote', protect, async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    if (!poll.isOpen) return res.status(400).json({ message: 'Poll is closed' });

    if (poll.hasVoted(req.user._id)) {
      return res.status(400).json({ message: 'You have already voted in this poll' });
    }

    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ message: 'Invalid option' });
    }

    poll.options[optionIndex].votes.push(req.user._id);
    await poll.save();
    res.json({ poll });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/polls/:id/close — secretariat closes a poll
router.patch('/:id/close', protect, restrictTo('secretariat', 'admin'), async (req, res) => {
  try {
    const poll = await Poll.findByIdAndUpdate(req.params.id, { isOpen: false }, { new: true });
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    res.json({ poll });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
