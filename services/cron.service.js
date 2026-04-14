const cron = require('node-cron');
const Task = require('../models/task.model');
const User = require('../models/user.model');

// Run every day at midnight
function initCronJobs() {
    console.log('Initializing Cron Jobs...');

    cron.schedule('0 0 * * *', async () => {
        console.log('Running daily deadline check...');
        await checkDeadlines();
    });
}

async function checkDeadlines() {
    try {
        const now = new Date();

        const penalties = await Task.aggregate([
            {
                $match: {
                    status: { $in: ['Todo', 'In-Progress'] },
                    deadline: { $lt: now },
                    assignedTo: { $ne: null }
                }
            },
            {
                $group: {
                    _id: '$assignedTo',
                    overdueCount: { $sum: 1 }
                }
            }
        ]);

        if (penalties.length === 0) return;

        const updates = penalties.map((entry) => {
            const penaltyAmount = (entry.overdueCount || 0) * 5;
            return {
                updateOne: {
                    filter: { _id: entry._id },
                    update: [
                        {
                            $set: {
                                reliabilityScore: {
                                    $max: [
                                        0,
                                        { $subtract: [{ $ifNull: ['$reliabilityScore', 100] }, penaltyAmount] }
                                    ]
                                }
                            }
                        }
                    ]
                }
            };
        });

        await User.bulkWrite(updates, { ordered: false });
        console.log(`Deadline penalties applied for ${updates.length} users.`);
    } catch (err) {
        console.error('Error in deadline check:', err);
    }
}

module.exports = { initCronJobs };
