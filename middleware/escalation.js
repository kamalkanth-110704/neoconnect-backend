const Case = require('../models/Case');

/**
 * Runs daily — checks for cases where the Case Manager
 * has not responded within 7 working days (~10 calendar days)
 * and escalates them automatically.
 */
const runEscalationJob = async () => {
  try {
    const activeCases = await Case.find({
      status: { $in: ['Assigned', 'In Progress'] },
      assignedTo: { $ne: null },
    }).populate('assignedTo', 'name email');

    let escalatedCount = 0;

    for (const c of activeCases) {
      if (c.needsEscalation()) {
        c.status = 'Escalated';
        c.escalatedAt = new Date();
        await c.save();
        escalatedCount++;
        console.log(`[ESCALATION] Case ${c.trackingId} escalated (assigned to ${c.assignedTo?.name})`);
      }
    }

    console.log(`[ESCALATION] Job complete — ${escalatedCount} case(s) escalated`);
  } catch (err) {
    console.error('[ESCALATION] Job failed:', err.message);
  }
};

module.exports = { runEscalationJob };
