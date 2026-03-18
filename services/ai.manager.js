const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);

// Initialize the AI model
const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

// AI MANAGER: Assign tasks based on project needs
async function assignTasksByAI(projectData) {
  const prompt = `
You are a project manager. Based on the project details below, generate specific tasks for the team.
Return a JSON array of tasks with this structure: [{"title": "...", "description": "...", "assignedRole": "...", "priority": "...", "xpPoints": ...}]

Project: ${projectData.title}
Description: ${projectData.description}
Required Roles: ${projectData.rolesRequired.map(r => r.roleName).join(', ')}
Duration: ${projectData.duration} days
Status: ${projectData.status}

Generate 3-5 concrete, actionable tasks that cover different roles. Make them specific and measurable.
Return ONLY valid JSON, no extra text.
`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Extract JSON from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response');
    }

    const tasks = JSON.parse(jsonMatch[0]);
    return tasks;
  } catch (err) {
    console.error('AI Task Assignment Error:', err);
    throw new Error('Failed to generate tasks via AI');
  }
}

// AI MANAGER: Review submitted work
async function reviewWorkByAI(taskData) {
  const prompt = `
You are a Senior Tech Lead reviewing a developer's code submission.
Task: ${taskData.title}
Task Requirements: ${taskData.description}
Submission Type: ${taskData.submissionType || 'text'}
Link/Content: ${taskData.repoLink || taskData.submittedWork}

If a repository link is provided, I cannot access it directly. However, strictly evaluate based on standard best practices for ${taskData.title} and the provided description.
If code snippets are provided, review them for:
1. Logic & Correctness
2. Code Quality & Clean Code
3. Security & Performance
4. Best Practices

Provide a JSON response:
{"rating": number (0-100), "review": "Detailed feedback...", "feedback": "Actionable improvements...", "codeQualityScore": number (0-10)}
Return ONLY valid JSON.
`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI review');
    }

    const review = JSON.parse(jsonMatch[0]);
    return review;
  } catch (err) {
    console.error('AI Review Error:', err);
    throw new Error('Failed to review work via AI');
  }
}

// AI MANAGER: Generate detailed task instructions
async function generateTaskInstructions(taskData) {
  const prompt = `
You are a project manager creating detailed instructions for a task.
Task: ${taskData.title}
Description: ${taskData.description}
Role: ${taskData.assignedRole}
Priority: ${taskData.priority}

Create clear, step-by-step instructions that a developer can follow.
Include acceptance criteria and what the final deliverable should look like.
Keep it practical and specific.
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error('AI Instructions Error:', err);
    throw new Error('Failed to generate instructions via AI');
  }
}

// AI MANAGER: Analyze team performance
async function analyzeTeamPerformance(tasksData) {
  if (!tasksData || tasksData.length === 0) {
    return { summary: 'No tasks to analyze', recommendation: 'Start assigning tasks' };
  }

  const taskSummary = tasksData.map(t => ({
    title: t.title,
    status: t.status,
    rating: t.aiRating || 'Not reviewed',
  }));

  const prompt = `
You are a project manager analyzing team performance.
Tasks Overview:
${JSON.stringify(taskSummary, null, 2)}

Provide:
1. Overall team performance summary
2. Key strengths
3. Areas for improvement
4. Recommendations for the next sprint

Keep it concise and actionable.
`;

  try {
    const result = await model.generateContent(prompt);
    return { analysis: result.response.text() };
  } catch (err) {
    console.error('AI Analysis Error:', err);
    throw new Error('Failed to analyze team performance');
  }
}

module.exports = {
  assignTasksByAI,
  reviewWorkByAI,
  generateTaskInstructions,
  analyzeTeamPerformance,
};
