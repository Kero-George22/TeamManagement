const { GoogleGenerativeAI } = require('@google/generative-ai');
const AppError = require('../utils/AppError');

// ─────────────────────────────────────────
// Config — fail fast if key is missing
// ─────────────────────────────────────────

if (!process.env.GOOGLE_AI_KEY) throw new Error('GOOGLE_AI_KEY env variable is not set');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function getModel(json = false) {
  return genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    ...(json && { generationConfig: { responseMimeType: 'application/json' } }),
  });
}

function safeString(value, maxLength) {
  return String(value || '').slice(0, maxLength);
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError(`AI returned invalid JSON for: ${label}`, 502);
  }
}

function validateFields(obj, fields, label) {
  for (const field of fields) {
    if (!obj[field]) throw new AppError(`AI response missing "${field}" in ${label}`, 502);
  }
}

// ─────────────────────────────────────────
// ASSIGN TASKS
// Returns plain task objects — DB logic stays in task.service
// ─────────────────────────────────────────

async function assignTasksByAI(projectData) {
  const model = getModel(true);

  const title       = safeString(projectData.title, 200);
  const description = safeString(projectData.description, 1000);
  const roles       = (projectData.rolesRequired || [])
    .map((r) => safeString(r.roleName, 50))
    .join(', ');

  const prompt = `
You are a project manager. Based on the project details below, generate specific tasks for the team.
Return a JSON array of tasks with this exact structure:
[{"title": "...", "description": "...", "assignedRole": "...", "priority": "Low|Medium|High"}]

Project: ${title}
Description: ${description}
Required Roles: ${roles}
Duration: ${projectData.duration} days
Status: ${projectData.status}

Generate 3-5 concrete, actionable tasks that cover different roles. Make them specific and measurable.
Return ONLY valid JSON, no extra text.
  `.trim();

  const result = await model.generateContent(prompt);
  const tasks = parseJson(result.response.text(), 'assignTasksByAI');

  if (!Array.isArray(tasks) || tasks.length === 0)
    throw new AppError('AI returned an empty task list', 502);

  for (const task of tasks) {
    validateFields(task, ['title', 'description', 'assignedRole', 'priority'], 'task');
  }

  return tasks.map((task) => ({
    title:        task.title,
    description:  task.description,
    assignedRole: task.assignedRole,
    priority:     task.priority,
  }));
}

// ─────────────────────────────────────────
// REVIEW SUBMITTED WORK
// ─────────────────────────────────────────

async function reviewWorkByAI(taskData) {
  const model = getModel(true);

  const title       = safeString(taskData.title, 200);
  const description = safeString(taskData.description, 1000);
  const content     = safeString(taskData.repoLink || taskData.submittedWork, 2000);

  const prompt = `
You are a Senior Tech Lead reviewing a developer's submission.
Task: ${title}
Requirements: ${description}
Submission Type: ${taskData.submissionType || 'text'}
Content: ${content}

Evaluate based on:
1. Logic & Correctness
2. Code Quality & Clean Code
3. Security & Performance
4. Best Practices

Return ONLY this JSON structure:
{"rating": 0-100, "review": "detailed feedback", "feedback": "actionable improvements", "codeQualityScore": 0-10}
  `.trim();

  const result = await model.generateContent(prompt);
  const review = parseJson(result.response.text(), 'reviewWorkByAI');

  validateFields(review, ['rating', 'review', 'feedback', 'codeQualityScore'], 'review');

  if (typeof review.rating !== 'number' || review.rating < 0 || review.rating > 100)
    throw new AppError('AI returned invalid rating value', 502);

  return {
    rating:           review.rating,
    review:           review.review,
    feedback:         review.feedback,
    codeQualityScore: review.codeQualityScore,
  };
}

// ─────────────────────────────────────────
// GENERATE TASK INSTRUCTIONS
// ─────────────────────────────────────────

async function generateTaskInstructions(taskData) {
  const model = getModel(false);

  const title       = safeString(taskData.title, 200);
  const description = safeString(taskData.description, 1000);
  const role        = safeString(taskData.assignedRole, 50);

  const prompt = `
You are a project manager creating detailed instructions for a task.
Task: ${title}
Description: ${description}
Role: ${role}
Priority: ${taskData.priority}

Create clear, step-by-step instructions a developer can follow.
Include acceptance criteria and what the final deliverable should look like.
Keep it practical and specific.
  `.trim();

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ─────────────────────────────────────────
// ANALYZE TEAM PERFORMANCE
// Sends aggregate numbers instead of raw task list to save tokens
// ─────────────────────────────────────────

async function analyzeTeamPerformance(tasksData) {
  if (!tasksData || tasksData.length === 0) {
    return { analysis: 'No tasks to analyze. Start assigning tasks to track performance.' };
  }

  const model = getModel(false);

  // Aggregate stats instead of sending every task
  const total     = tasksData.length;
  const done      = tasksData.filter((t) => t.status === 'Done').length;
  const inProgress = tasksData.filter((t) => t.status === 'In-Progress').length;
  const inReview  = tasksData.filter((t) => t.status === 'Review').length;
  const todo      = tasksData.filter((t) => t.status === 'Todo').length;

  const rated     = tasksData.filter((t) => t.aiRating);
  const avgRating = rated.length > 0
    ? Math.round(rated.reduce((s, t) => s + t.aiRating, 0) / rated.length)
    : null;

  // Group by role for richer insight
  const byRole = tasksData.reduce((acc, t) => {
    const role = t.assignedRole || 'Unassigned';
    if (!acc[role]) acc[role] = { total: 0, done: 0 };
    acc[role].total += 1;
    if (t.status === 'Done') acc[role].done += 1;
    return acc;
  }, {});

  const prompt = `
You are a project manager analyzing team performance.

TASK STATS:
Total: ${total} | Done: ${done} | In Progress: ${inProgress} | In Review: ${inReview} | To Do: ${todo}
Average AI Rating: ${avgRating !== null ? `${avgRating}/100` : 'No rated tasks yet'}

BREAKDOWN BY ROLE:
${Object.entries(byRole).map(([role, s]) => `- ${role}: ${s.done}/${s.total} done`).join('\n')}

Provide:
1. Overall team performance summary
2. Key strengths
3. Areas for improvement
4. Recommendations for the next sprint

Keep it concise and actionable.
  `.trim();

  const result = await model.generateContent(prompt);
  return { analysis: result.response.text() };
}

// ─────────────────────────────────────────
// Exports
// ─────────────────────────────────────────

module.exports = {
  assignTasksByAI,
  reviewWorkByAI,
  generateTaskInstructions,
  analyzeTeamPerformance,
};