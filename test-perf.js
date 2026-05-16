const mongoose = require('mongoose');
const Task = require('./models/task.model');
const Project = require('./models/project.model');
const User = require('./models/user.model');
const { getDashboardTasks } = require('./services/task.service');

async function test() {
  await mongoose.connect('mongodb://localhost:27017/ai_manager');
  
  const admin = await User.findOne({ isAdmin: true }) || await User.findOne();
  if(!admin) {
    console.log("No user found");
    process.exit(0);
  }
  
  console.log("Testing for user:", admin._id, admin.isAdmin ? '(Admin)' : '');
  
  console.time('getDashboardTasks');
  const tasks = await getDashboardTasks(admin._id, admin.isAdmin);
  console.timeEnd('getDashboardTasks');
  console.log('Tasks fetched:', tasks.length);
  
  process.exit(0);
}

test().catch(console.error);