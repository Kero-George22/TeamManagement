const mongoose = require('mongoose');
require('dotenv').config();
const Project = require('./models/project.model');
const projectService = require('./services/project.service');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const project = await Project.findOne({ 'joinRequests.0': { $exists: true } });
  if (!project) {
    console.log('No project with join requests found');
    process.exit(0);
  }
  
  console.log('Project ID:', project._id);
  console.log('Owner ID:', project.owner);
  console.log('Join Requests in DB:', JSON.stringify(project.joinRequests, null, 2));
  
  try {
    const requests = await projectService.getJoinRequests(project._id, project.owner);
    console.log('Requests returned by service:', JSON.stringify(requests, null, 2));
  } catch (err) {
    console.error('Service Error:', err);
  }
  
  process.exit(0);
}

test();
