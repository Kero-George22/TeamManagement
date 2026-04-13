const { GoogleGenerativeAI } = require('@google/generative-ai');
const AppError = require('../utils/AppError');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function safeString(value, maxLength) {
  return String(value || '').slice(0, maxLength);
}

function parseJsonResponse(text, label) {
  try {
    const parsed = JSON.parse(text);
    return parsed;
  } catch {
    throw new AppError(`AI returned invalid JSON for ${label}`, 502);
  }
}

function validateTaskFields(tasks) {
  const required = ['title', 'description', 'assignedRole', 'xpPoints'];
  for (const task of tasks) {
    for (const field of required) {
      if (!task[field])
        throw new AppError(`AI task is missing required field: "${field}"`, 502);
    }
  }
}

// ─────────────────────────────────────────
// GENERATE TASKS
// Returns plain task objects — saving to DB is the caller's responsibility
// ─────────────────────────────────────────

const generateProjectTasks = async (project) => {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: { responseMimeType: 'application/json' },
  });

  // Sanitize inputs to reduce prompt injection surface
  const title = safeString(project.title, 200);
  const description = safeString(project.description, 1000);
  const roles = (project.rolesRequired || [])
    .map((r) => safeString(r.roleName, 50))
    .join(', ');

  const prompt = `
You are an expert Technical Project Manager.
Project Title: ${title}
Project Description: ${description}
Team Roles: ${roles}

Task: Based on the project description, generate exactly 3 highly technical and realistic tasks for EACH role.

Return the response as a JSON array of objects with this exact structure:
[
  {
    "title": "Task Title",
    "description": "Detailed technical requirements",
    "assignedRole": "Role Name",
    "xpPoints": 50
  }
]

Keep the tasks professional and relevant to the project goal.
  `.trim();

  const result = await model.generateContent(prompt);
  const tasksArray = parseJsonResponse(result.response.text(), 'generateProjectTasks');

  if (!Array.isArray(tasksArray) || tasksArray.length === 0)
    throw new AppError('AI returned an empty task list', 502);

  validateTaskFields(tasksArray);

  // Return plain objects — no DB logic here
  return tasksArray.map((task) => ({
    title:        task.title,
    description:  task.description,
    assignedRole: task.assignedRole,
    xpPoints:     task.xpPoints,
  }));
};

// ─────────────────────────────────────────
// GENERATE PROJECT STATUS
// ─────────────────────────────────────────

const generateProjectStatus = async (project, taskStats) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const title       = safeString(project.title, 200);
  const description = safeString(project.description, 500);
  const roles       = (project.rolesRequired || [])
    .map((r) => `${safeString(r.roleName, 50)} (${r.filledSlots}/${r.totalSlots} slots)`)
    .join(', ');

  const prompt = `
You are an AI Project Manager for JobXP, a developer skill platform.

PROJECT: ${title}
DESCRIPTION: ${description}
STATUS: ${project.status}  |  DURATION: ${project.duration} days
MEMBERS: ${project.members?.length || 0} active  |  ROLES: ${roles}

TASKS → Total: ${taskStats.total} | Done: ${taskStats.done} | In Progress: ${taskStats.inProgress} | Pending: ${taskStats.pending}

Write a concise project status update (max 180 words) for the team dashboard. Include:
1. Overall health indicator (🟢 On Track / 🟡 At Risk / 🔴 Behind)
2. Quick progress summary with numbers
3. One specific, actionable recommendation

Use a direct, professional tone. Use bullet points or short paragraphs. Include relevant emoji for readability.
  `.trim();

  const result = await model.generateContent(prompt);

  return {
    summary:     result.response.text(),
    generatedAt: new Date(),
  };
};

// ─────────────────────────────────────────
// Exports
// ─────────────────────────────────────────

module.exports = { generateProjectTasks, generateProjectStatus };