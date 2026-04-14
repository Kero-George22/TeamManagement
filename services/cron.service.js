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

        // Find tasks that are NOT done and deadline has passed
        const overdueTasks = await Task.find({
            status: { $in: ['Todo', 'In-Progress'] },
            deadline: { $lt: now }
        }).populate('assignedTo');

        for (const task of overdueTasks) {
            if (!task.assignedTo) continue;

            // Apply penalty if not already penalized today (to avoid double counting, though this simple logic just hits them once per run)
            // Ideally we'd have a 'penalized' flag, but for now we reduce reliability

            const user = await User.findById(task.assignedTo._id);
            if (user) {
                // Decrease reliability score by 5 (min 0)
                user.reliabilityScore = Math.max(0, (user.reliabilityScore || 100) - 5);
                await user.save();

                console.log(`Penalty applied to user ${user.email} for overdue task: ${task.title}`);
            }
        }
    } catch (err) {
        console.error('Error in deadline check:', err);
    }
}

module.exports = { initCronJobs };
