const Skill = require('../models/skill.model');
const UserSkill = require('../models/userSkill.model');
const User = require('../models/user.model');

// Initialize some default skills if none exist
async function initDefaultSkills() {
    const count = await Skill.countDocuments();
    if (count === 0) {
        const defaultSkills = [
            { name: 'JavaScript', category: 'Frontend' },
            { name: 'Node.js', category: 'Backend' },
            { name: 'React', category: 'Frontend' },
            { name: 'Python', category: 'Backend' },
            { name: 'SQL', category: 'Data' },
            { name: 'MongoDB', category: 'Data' },
            { name: 'UI/UX Design', category: 'Design' },
        ];
        await Skill.insertMany(defaultSkills);
        console.log('Default skills initialized');
    }
}

// Get all available skills
async function getAllSkills() {
    return Skill.find({}).sort({ name: 1 });
}

// Add skill to user profile
async function addUserSkill(userId, skillName, level = 1) {
    let skill = await Skill.findOne({ name: { $regex: new RegExp(`^${skillName}$`, 'i') } });

    // Create skill if it doesn't exist (allow dynamic skills)
    if (!skill) {
        skill = await Skill.create({ name: skillName, category: 'Other' });
    }

    const existing = await UserSkill.findOne({ user: userId, skill: skill._id });
    if (existing) {
        existing.level = level;
        await existing.save();
        return existing;
    }

    const userSkill = await UserSkill.create({
        user: userId,
        skill: skill._id,
        level,
        isVerified: false // Requires quiz/assessment to verify
    });

    return userSkill;
}

// Get user skills
async function getUserSkills(userId) {
    return UserSkill.find({ user: userId }).populate('skill');
}

// Check if user satisfies skill requirements
async function checkSkillEligibility(userId, requiredSkills) {
    if (!requiredSkills || requiredSkills.length === 0) return { eligible: true };

    const userSkills = await UserSkill.find({ user: userId }).populate('skill');
    const missingSkills = [];

    for (const req of requiredSkills) {
        const match = userSkills.find(us => us.skill.name.toLowerCase() === req.skillName.toLowerCase());

        if (!match) {
            missingSkills.push(`Missing skill: ${req.skillName}`);
        } else if (match.level < req.minLevel) {
            missingSkills.push(`Insufficient level for ${req.skillName}: Required ${req.minLevel}, Found ${match.level}`);
        }
    }

    if (missingSkills.length > 0) {
        return { eligible: false, reasons: missingSkills };
    }

    return { eligible: true };
}

module.exports = {
    initDefaultSkills,
    getAllSkills,
    addUserSkill,
    getUserSkills,
    checkSkillEligibility
};
