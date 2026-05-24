const mongoose = require('mongoose');
require('dotenv').config();

const Task = require('./models/task.model');

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const tasks = await Task.find({});
    let updated = 0;

    for (let task of tasks) {
      if (task.assignedTo && !Array.isArray(task.assignedTo)) {
        task.assignedTo = [task.assignedTo];
        await task.save();
        updated++;
      } else if (!task.assignedTo) {
        task.assignedTo = [];
        await task.save();
        updated++;
      }
    }

    console.log(`Migration complete. Updated ${updated} tasks.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
