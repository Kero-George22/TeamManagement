const request = require('supertest');
const app = require('../app');
const User = require('../models/user.model');
const aiManager = require('../services/ai.manager');
const { authCookieFor, createUser } = require('./helpers/auth');
const { createProject, createTask } = require('./helpers/factories');

describe('AI quota', () => {
  it('consumes credits after a successful AI chat response', async () => {
    const owner = await createUser();
    const project = await createProject(owner);
    await createTask(project);

    const res = await request(app)
      .post('/api/v1/ai/chat')
      .set('Cookie', authCookieFor(owner))
      .send({ projectId: project._id, message: 'How is this project doing?' });

    expect(res.status).toBe(200);
    expect(res.body.data.reply).toBe('Mock copilot reply');

    const updated = await User.findById(owner._id).lean();
    expect(updated.aiUsage.credits).toBe(1);
    expect(updated.aiUsage.totalUsed).toBe(1);
  });

  it('rejects AI requests when credits are exhausted', async () => {
    const owner = await createUser({
      aiUsage: {
        credits: 10,
        totalUsed: 10,
        resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    const project = await createProject(owner);

    const res = await request(app)
      .post('/api/v1/ai/chat')
      .set('Cookie', authCookieFor(owner))
      .send({ projectId: project._id, message: 'Use more AI' });

    expect(res.status).toBe(403);
  });

  it('does not consume credits when the AI call fails', async () => {
    aiManager.chatWithCopilot.mockRejectedValueOnce(new Error('AI unavailable'));
    const owner = await createUser();
    const project = await createProject(owner);

    const res = await request(app)
      .post('/api/v1/ai/chat')
      .set('Cookie', authCookieFor(owner))
      .send({ projectId: project._id, message: 'This will fail' });

    expect(res.status).toBe(500);
    const updated = await User.findById(owner._id).lean();
    expect(updated.aiUsage?.credits || 0).toBe(0);
  });

  it('consumes credits for project analysis, task generation, and task instructions', async () => {
    const owner = await createUser();
    const project = await createProject(owner);
    const task = await createTask(project);

    const analysis = await request(app)
      .post(`/api/v1/projects/${project._id}/ai-analysis`)
      .set('Cookie', authCookieFor(owner));
    expect(analysis.status).toBe(200);

    const generation = await request(app)
      .post(`/api/v1/tasks/${project._id}/generate`)
      .set('Cookie', authCookieFor(owner));
    expect(generation.status).toBe(201);

    const instructions = await request(app)
      .post(`/api/v1/tasks/task/${task._id}/ai-instructions`)
      .set('Cookie', authCookieFor(owner));
    expect(instructions.status).toBe(200);

    const updated = await User.findById(owner._id).lean();
    expect(updated.aiUsage.credits).toBe(3);
  });
});
