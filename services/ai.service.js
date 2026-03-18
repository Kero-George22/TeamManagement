const { GoogleGenerativeAI } = require("@google/generative-ai");
const Task = require('../models/task.model');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateProjectTasks = async (project) => {
    // استخدام موديل Gemini 1.5 Pro (الأفضل في فهم السياق)
    const model = genAI.getGenerativeModel({ 
        model: "gemini-3-flash-preview",
        // إجبار الـ AI إنه يرجع JSON فقط
        generationConfig: { responseMimeType: "application/json" } 
    });

    const prompt = `
        You are an expert Technical Project Manager. 
        Project Title: ${project.title}
        Project Description: ${project.description}
        Team Roles: ${project.rolesRequired.map(r => r.roleName).join(', ')}

        Task: Based on the project description, generate exactly 3 highly technical and realistic tasks for EACH role.
        
        Return the response as a JSON array of objects with this structure:
        [
            {
                "title": "Task Title",
                "description": "Detailed technical requirements",
                "assignedRole": "Role Name",
                "xpPoints": 50
            }
        ]
        Keep the tasks professional and relevant to the project goal.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const tasksArray = JSON.parse(response.text());

    // حفظ المهام في الداتابيز وربطها بالبروجكت
    const tasksWithProjectId = tasksArray.map(task => ({
        ...task,
        project: project._id
    }));

    return await Task.insertMany(tasksWithProjectId);
};

const generateProjectStatus = async (project, taskStats, submissionStats) => {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an AI Project Manager for JobXP, a developer skill platform.

PROJECT: ${project.title}
DESCRIPTION: ${project.description}
STATUS: ${project.status}  |  DURATION: ${project.duration} days
MEMBERS: ${project.members?.length || 0} active  |  ROLES: ${(project.rolesRequired || []).map(r => `${r.roleName} (${r.filledSlots}/${r.totalSlots} slots)`).join(', ')}

TASKS → Total: ${taskStats.total} | Done: ${taskStats.done} | In Progress: ${taskStats.inProgress} | Pending: ${taskStats.pending}
SUBMISSIONS → Total: ${submissionStats.total} | Accepted: ${submissionStats.accepted} | Pending: ${submissionStats.pending} | Rejected: ${submissionStats.rejected}

Write a concise project status update (max 180 words) for the team dashboard. Include:
1. Overall health indicator (🟢 On Track / 🟡 At Risk / 🔴 Behind)
2. Quick progress summary with numbers
3. One specific, actionable recommendation

Use a direct, professional tone. Use bullet points or short paragraphs. Include relevant emoji for readability.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
};

module.exports = { generateProjectTasks, generateProjectStatus };