require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user.model');
const Project = require('./models/project.model');
const Task = require('./models/task.model');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/syncup';

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
            email: 'admin@syncup.com',
            password: 'admin123',
            username: 'SystemAdmin',
            isAdmin: true,
            isVerified: true,
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
            });
            users.push(user);
        }
        console.log('created 5 users');

        // Create Projects with Categories
        const project1 = await Project.create({
            title: 'E-Commerce Platform',
            description: 'Building a scalable e-commerce platform with microservices architecture. Needs strong backend developers.',
            owner: admin._id,
            startDate: new Date(),
            duration: 30,
            status: 'Recruiting',
            category: 'E-commerce',
            lookingFor: 'Backend developers, DevOps engineers',
            rolesRequired: [
                { roleName: 'Backend Developer', totalSlots: 2, filledSlots: 0 },
                { roleName: 'Frontend Developer', totalSlots: 2, filledSlots: 0 },
                { roleName: 'DevOps Engineer', totalSlots: 1, filledSlots: 0 }
            ]
        });

        const project2 = await Project.create({
            title: 'Social Media App',
            description: 'A mobile-first social media application for photographers. Focus on high-performance image rendering.',
            owner: admin._id,
            startDate: new Date(),
            duration: 45,
            status: 'Recruiting',
            category: 'Mobile Development',
            lookingFor: 'Mobile developers, UI designers',
            rolesRequired: [
                { roleName: 'Mobile Developer', totalSlots: 3, filledSlots: 0 },
                { roleName: 'UI Designer', totalSlots: 1, filledSlots: 0 }
            ]
        });

        const project3 = await Project.create({
            title: 'Legacy System Migration',
            description: 'Migrating a monolithic legacy system to cloud-native architecture.',
            owner: admin._id,
            startDate: new Date(),
            duration: 60,
            status: 'In-Progress',
            category: 'DevOps & Cloud',
            lookingFor: 'System architects, database admins',
            rolesRequired: [
                { roleName: 'System Architect', totalSlots: 1, filledSlots: 1 },
                { roleName: 'Database Admin', totalSlots: 1, filledSlots: 1 }
            ],
            members: [
                { userId: users[0]._id, roleName: 'System Architect', joinedAt: new Date() },
                { userId: users[1]._id, roleName: 'Database Admin', joinedAt: new Date() }
            ]
        });

        const project4 = await Project.create({
            title: 'AI Chatbot Assistant',
            description: 'Building an intelligent chatbot using NLP and machine learning for customer support automation.',
            owner: users[0]._id,
            startDate: new Date(),
            duration: 40,
            status: 'Recruiting',
            category: 'Data Science & AI',
            lookingFor: 'ML engineers, NLP specialists',
            rolesRequired: [
                { roleName: 'ML Engineer', totalSlots: 2, filledSlots: 0 },
                { roleName: 'Backend Developer', totalSlots: 1, filledSlots: 0 }
            ]
        });

        const project5 = await Project.create({
            title: 'Cybersecurity Audit Tool',
            description: 'Developing an automated security auditing tool for web applications and APIs.',
            owner: users[1]._id,
            startDate: new Date(),
            duration: 35,
            status: 'Recruiting',
            category: 'Cybersecurity',
            lookingFor: 'Security researchers, penetration testers',
            rolesRequired: [
                { roleName: 'Security Engineer', totalSlots: 2, filledSlots: 0 },
                { roleName: 'Full Stack Developer', totalSlots: 1, filledSlots: 0 }
            ]
        });

        const project6 = await Project.create({
            title: 'Blockchain Payment Gateway',
            description: 'Creating a decentralized payment gateway supporting multiple cryptocurrencies.',
            owner: users[2]._id,
            startDate: new Date(),
            duration: 50,
            status: 'Recruiting',
            category: 'Blockchain',
            lookingFor: 'Blockchain developers, smart contract engineers',
            rolesRequired: [
                { roleName: 'Blockchain Developer', totalSlots: 2, filledSlots: 0 },
                { roleName: 'Smart Contract Engineer', totalSlots: 1, filledSlots: 0 }
            ]
        });

        const project7 = await Project.create({
            title: 'IoT Smart Home Hub',
            description: 'Building a centralized smart home management system with IoT device integration.',
            owner: users[3]._id,
            startDate: new Date(),
            duration: 55,
            status: 'Recruiting',
            category: 'IoT & Hardware',
            lookingFor: 'Embedded systems engineers, mobile developers',
            rolesRequired: [
                { roleName: 'Embedded Engineer', totalSlots: 2, filledSlots: 0 },
                { roleName: 'Mobile Developer', totalSlots: 1, filledSlots: 0 }
            ]
        });

        const project8 = await Project.create({
            title: 'Educational Platform',
            description: 'Creating an online learning platform with interactive courses and progress tracking.',
            owner: users[4]._id,
            startDate: new Date(),
            duration: 45,
            status: 'Recruiting',
            category: 'Education & Training',
            lookingFor: 'Full stack developers, content designers',
            rolesRequired: [
                { roleName: 'Full Stack Developer', totalSlots: 2, filledSlots: 0 },
                { roleName: 'UX Designer', totalSlots: 1, filledSlots: 0 }
            ]
        });

        console.log('created 8 projects');
        console.log('SEEDING COMPLETE');
        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
