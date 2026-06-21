const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const AppError = require('../utils/AppError');

// ─────────────────────────────────────────
// Config — fail fast if key is missing
// ─────────────────────────────────────────

const apiKey = process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) console.warn('GOOGLE_AI_KEY / GEMINI_API_KEY not set — AI features disabled');

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function safeString(value, maxLength) {
  return String(value || '').slice(0, maxLength);
}

// ─────────────────────────────────────────
// GENERATE PROJECT PLAN (Replaces assignTasksByAI)
// ─────────────────────────────────────────

async function generateProjectPlan(projectData) {
  if (!genAI) throw new AppError('AI is not configured', 503);

  const title       = safeString(projectData.title, 200);
  const description = safeString(projectData.description, 1000);
  const roles       = (projectData.rolesRequired || [])
    .map((r) => `${safeString(r.roleName, 50)} (Needs: ${r.totalSlots})`)
    .join(', ');

  const prompt = `
PROJECT BRIEF:
- Title: ${title}
- Description: ${description}
- Team Roles: ${roles}
- Duration: ${projectData.duration} days
- Category: ${projectData.category || 'Software'}

Generate a complete, production-ready project plan based on this brief.
  `.trim();

  const schema = {
    type: SchemaType.OBJECT,
    properties: {
      phases: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING, description: "E.g., Phase 1 — Setup & Architecture (Week 1-2)" },
            milestone: { type: SchemaType.STRING },
            tasks: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  title: { type: SchemaType.STRING },
                  description: { type: SchemaType.STRING, description: "Detailed description with acceptance criteria" },
                  assignedRole: { type: SchemaType.STRING, description: "Must match one of the requested Team Roles exactly" },
                  priority: { type: SchemaType.STRING, description: "High, Medium, or Low" },
                  storyPoints: { type: SchemaType.NUMBER, description: "1, 3, 5, 8, or 13" },
                  dependsOnIndex: { 
                    type: SchemaType.ARRAY, 
                    items: { type: SchemaType.NUMBER },
                    description: "Indices of tasks THIS task depends on (0-based, within this same phase). Empty array if none."
                  }
                },
                required: ["title", "description", "assignedRole", "priority", "storyPoints", "dependsOnIndex"]
              }
            }
          },
          required: ["name", "milestone", "tasks"]
        }
      },
      summary: { type: SchemaType.STRING, description: "One paragraph overview of the plan and key risks" }
    },
    required: ["phases", "summary"]
  };

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: `You are a Senior Technical Project Manager with 15 years of experience planning software projects.
1. Break the project into 3-4 logical phases with clear milestones.
2. For each phase, generate 4-8 specific, actionable tasks.
3. Distribute work fairly across all available roles. Every role must have at least 2 tasks.
4. High-priority tasks should come in earlier phases.
5. Story points: 1=trivial, 3=small, 5=medium, 8=large, 13=epic.`,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: 0.6,
      maxOutputTokens: 8192
    }
  });

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

// ─────────────────────────────────────────
// REVIEW SUBMITTED WORK
// ─────────────────────────────────────────

async function reviewWorkByAI(taskData) {
  if (!genAI) throw new AppError('AI is not configured', 503);

  const title       = safeString(taskData.title, 200);
  const description = safeString(taskData.description, 1000);
  const content     = safeString(taskData.repoLink || taskData.submittedWork, 2000);

  const prompt = `
Task: ${title}
Requirements: ${description}
Submission Type: ${taskData.submissionType || 'text'}
Content: ${content}
  `.trim();

  const schema = {
    type: SchemaType.OBJECT,
    properties: {
      rating: { type: SchemaType.NUMBER, description: "0-100 score" },
      review: { type: SchemaType.STRING, description: "Detailed feedback" },
      feedback: { type: SchemaType.STRING, description: "Actionable improvements" },
      codeQualityScore: { type: SchemaType.NUMBER, description: "0-10 score" }
    },
    required: ["rating", "review", "feedback", "codeQualityScore"]
  };

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: `You are a Senior Tech Lead reviewing a developer's submission. Evaluate based on:
1. Logic & Correctness
2. Code Quality & Clean Code
3. Security & Performance
4. Best Practices`,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: 0.2
    }
  });

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

// ─────────────────────────────────────────
// GENERATE TASK INSTRUCTIONS
// ─────────────────────────────────────────

async function generateTaskInstructions(taskData) {
  if (!genAI) throw new AppError('AI is not configured', 503);

  const title       = safeString(taskData.title, 200);
  const description = safeString(taskData.description, 2000);

  const prompt = `
Generate step-by-step instructions to complete this task.
Task: ${title}
Description: ${description}
  `.trim();

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: "You are a helpful senior developer pairing with a junior. Provide methodical, step-by-step instructions. Use markdown formatting.",
    generationConfig: { temperature: 0.3 }
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ─────────────────────────────────────────
// TEAM PERFORMANCE ANALYSIS
// ─────────────────────────────────────────

async function analyzeTeamPerformance(teamData) {
  if (!genAI) throw new AppError('AI is not configured', 503);

  const prompt = `Analyze this team data: ${JSON.stringify(teamData)}`;

  const schema = {
    type: SchemaType.OBJECT,
    properties: {
      healthScore: { type: SchemaType.NUMBER, description: "0-100" },
      bottlenecks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      recommendations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      topPerformers: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
    },
    required: ["healthScore", "bottlenecks", "recommendations", "topPerformers"]
  };

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: "You are an Agile Coach analyzing team performance metrics.",
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: 0.4
    }
  });

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

// ─────────────────────────────────────────
// COPILOT CHAT
// ─────────────────────────────────────────

async function chatWithCopilot(context, message, history) {
  if (!genAI) throw new AppError('AI is not configured', 503);

  // context contains: title, description, status, duration, members, tasks, activity
  const sysInst = `You are SyncUp Copilot, an AI project assistant.
PROJECT CONTEXT:
- Title: ${context.title}
- Description: ${context.description}
- Status: ${context.status}
- Duration: ${context.duration} days

TEAM (${context.members.length} members):
${JSON.stringify(context.members)}

TASKS (${context.tasks.length} total):
${JSON.stringify(context.tasks)}

RECENT ACTIVITY:
${JSON.stringify(context.activity)}

Respond to the user's question about this project. Be concise, specific, and actionable.
If asked about progress, calculate real percentages from the task data.
If asked about risks, analyze overdue tasks and bottlenecks.`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: sysInst,
    generationConfig: { temperature: 0.5 }
  });

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(message);
  return result.response.text();
}

// ─────────────────────────────────────────
// GENERATE PROJECT STATUS (Moved from ai.service.js)
// ─────────────────────────────────────────

async function generateProjectStatus(project, taskStats) {
  if (!genAI) throw new AppError('AI is not configured', 503);

  const title       = safeString(project.title, 200);
  const description = safeString(project.description, 500);
  const roles       = (project.rolesRequired || [])
    .map((r) => `${safeString(r.roleName, 50)} (${r.filledSlots}/${r.totalSlots} slots)`)
    .join(', ');

  const prompt = `
PROJECT: ${title}
DESCRIPTION: ${description}
STATUS: ${project.status}  |  DURATION: ${project.duration} days
MEMBERS: ${project.members?.length || 0} active  |  ROLES: ${roles}

TASKS → Total: ${taskStats.total} | Done: ${taskStats.done} | In Progress: ${taskStats.inProgress} | Pending: ${taskStats.pending}
`.trim();

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: `You are an AI Project Manager for SyncUp.
Write a concise project status update (max 180 words) for the team dashboard. Include:
1. Overall health indicator (🟢 On Track / 🟡 At Risk / 🔴 Behind)
2. Quick progress summary with numbers
3. One specific, actionable recommendation
Use a direct, professional tone. Use bullet points or short paragraphs. Include relevant emoji for readability.`,
    generationConfig: { temperature: 0.4 }
  });

  const result = await model.generateContent(prompt);
  
  return {
    summary:     result.response.text(),
    generatedAt: new Date(),
  };
}

module.exports = {
  generateProjectPlan,
  reviewWorkByAI,
  generateTaskInstructions,
  analyzeTeamPerformance,
  chatWithCopilot,
  generateProjectStatus
};