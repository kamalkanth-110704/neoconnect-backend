const express = require('express');
const router = express.Router();
const Case = require('../models/Case');
const { protect, restrictTo } = require('../middleware/auth');

// GET /api/analytics/dashboard
router.get(
  '/dashboard',
  protect,
  restrictTo('secretariat', 'admin'),
  async (req, res) => {
    try {
      // Cases by status
      const byStatus = await Case.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      // Cases by category
      const byCategory = await Case.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      // Cases by department
      const byDepartment = await Case.aggregate([
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      // Open cases by department (for heatmap)
      const openByDepartment = await Case.aggregate([
        { $match: { status: { $nin: ['Resolved'] } } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      // Hotspot detection: 5+ cases same dept + category
      const hotspots = await Case.aggregate([
        {
          $group: {
            _id: { department: '$department', category: '$category' },
            count: { $sum: 1 },
          },
        },
        { $match: { count: { $gte: 5 } } },
        { $sort: { count: -1 } },
        {
          $project: {
            department: '$_id.department',
            category: '$_id.category',
            count: 1,
            _id: 0,
          },
        },
      ]);

      // Summary totals
      const total = await Case.countDocuments();
      const openCases = await Case.countDocuments({ status: { $nin: ['Resolved'] } });
      const escalatedCases = await Case.countDocuments({ status: 'Escalated' });
      const resolvedCases = await Case.countDocuments({ status: 'Resolved' });

      res.json({
        summary: { total, openCases, escalatedCases, resolvedCases },
        byStatus,
        byCategory,
        byDepartment,
        openByDepartment,
        hotspots,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
