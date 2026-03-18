const mongoose = require('mongoose');
const User = require('../models/user.model');

async function cleanupUnverified(hours = Number(process.env.VERIFICATION_HOURS) || 24) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const res = await User.deleteMany({ isVerified: false, createdAt: { $lt: cutoff } });
  console.log('cleanupUnverified:', res.deletedCount, 'accounts removed');
  return res;
}

module.exports = { cleanupUnverified };
