require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user.model');
const Project = require('./models/project.model');
const Task = require('./models/task.model');
const Skill = require('./models/skill.model');


const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/teamforge';
const skillLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

function buildSkillsProfile(randomize = false) {
    const pickLevel = () => randomize
        ? skillLevels[Math.floor(Math.random() * skillLevels.length)]
        : 'Expert';

    return {
        Frontend: { level: pickLevel(), score: randomize ? Math.floor(Math.random() * 100) : 95 },
        Backend: { level: pickLevel(), score: randomize ? Math.floor(Math.random() * 100) : 98 },
        FullStack: { level: pickLevel(), score: randomize ? Math.floor(Math.random() * 100) : 92 },
        DevOps: { level: pickLevel(), score: randomize ? Math.floor(Math.random() * 100) : 88 },
        DataScience: { level: pickLevel(), score: randomize ? Math.floor(Math.random() * 100) : 76 },
    };
}

async function seed() {
    try {
        await mongoose.connect(mongoUri);
        console.log('connected to db');

        // Clear DB
        await Task.deleteMany({});
        await User.deleteMany({});
        await Project.deleteMany({});
        
        console.log('cleared db');

        // Create Admin
        const admin = await User.create({
            email: 'admin@teamforge.com',
            password: 'admin123', // will be hashed by pre-save hook
            username: 'SystemAdmin',
            isAdmin: true,
            isVerified: true,
            skills: buildSkillsProfile(false),
        });
        console.log('created admin');

        // Create 5 Fake Users
        const users = [];
        for (let i = 1; i <= 5; i++) {
            const user = await User.create({
                email: `user${i}@example.com`,
                password: 'password123',
                username: `DevUser_${i}`,
                isVerified: true,
                reliabilityScore: 80 + Math.floor(Math.random() * 20),
                skills: buildSkillsProfile(true),
            });
            users.push(user);
        }
        console.log('created 5 users');

        // Create Projects
        const project1 = await Project.create({
            title: 'E-Commerce Platform',
            description: 'Building a scalable e-commerce platform with microservices architecture. Needs strong backend developers.',
            owner: admin._id,
            startDate: new Date(),
            duration: 30, // 30 days
            status: 'Recruiting',
            rolesRequired: [
                { roleName: 'Backend Developer', totalSlots: 2, filledSlots: 0, requiredSkills: [] },
                { roleName: 'Frontend Developer', totalSlots: 2, filledSlots: 0, requiredSkills: [] },
                { roleName: 'DevOps Engineer', totalSlots: 1, filledSlots: 0, requiredSkills: [] }
            ]
        });

        const project2 = await Project.create({
            title: 'Social Media App',
            description: 'A mobile-first social media application for photographers. Focus on high-performance image rendering.',
            owner: admin._id,
            startDate: new Date(),
            duration: 45,
            status: 'Recruiting',
            rolesRequired: [
                { roleName: 'Mobile Developer', totalSlots: 3, filledSlots: 0, requiredSkills: [] },
                { roleName: 'UI Designer', totalSlots: 1, filledSlots: 0, requiredSkills: [] }
            ]
        });

        const project3 = await Project.create({
            title: 'Legacy System Migration',
            description: 'Migrating a monolithic legacy system to cloud-native architecture.',
            owner: admin._id,
            startDate: new Date(),
            duration: 60,
            status: 'In-Progress',
            rolesRequired: [
                { roleName: 'System Architect', totalSlots: 1, filledSlots: 1, requiredSkills: [] },
                { roleName: 'Database Admin', totalSlots: 1, filledSlots: 1, requiredSkills: [] }
            ],
            members: [
                { userId: users[0]._id, roleName: 'System Architect', joinedAt: new Date() },
                { userId: users[1]._id, roleName: 'Database Admin', joinedAt: new Date() }
            ]
        });

        console.log('created 3 projects');
        console.log('SEEDING COMPLETE');
        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
