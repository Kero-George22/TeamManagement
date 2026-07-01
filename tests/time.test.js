const request = require('supertest');
const app = require('../app');
const { authCookieFor, createUser } = require('./helpers/auth');
const { createProject, createTask } = require('./helpers/factories');

describe('time tracking', () => {
  it('lets users with task access start, pause, resume, and stop a timer', async () => {
    const owner = await createUser();
    const project = await createProject(owner);
    const task = await createTask(project);

    const startRes = await request(app)
      .post(`/api/v1/time/task/${task._id}/start`)
      .set('Cookie', authCookieFor(owner))
      .send({ description: 'Working' });
    expect(startRes.status).toBe(201);
    const entryId = startRes.body.data._id;

    const pauseRes = await request(app)
      .post(`/api/v1/time/${entryId}/pause`)
      .set('Cookie', authCookieFor(owner));
    expect(pauseRes.status).toBe(200);

    const resumeRes = await request(app)
      .post(`/api/v1/time/${entryId}/resume`)
      .set('Cookie', authCookieFor(owner));
    expect(resumeRes.status).toBe(200);

    const stopRes = await request(app)
      .post(`/api/v1/time/${entryId}/stop`)
      .set('Cookie', authCookieFor(owner));
    expect(stopRes.status).toBe(200);
    expect(stopRes.body.data.status).toBe('stopped');
  });

  it('blocks users without project access from guessing task IDs', async () => {
    const owner = await createUser();
    const outsider = await createUser();
    const project = await createProject(owner);
    const task = await createTask(project);

    const res = await request(app)
      .post(`/api/v1/time/task/${task._id}/start`)
      .set('Cookie', authCookieFor(outsider))
      .send({ description: 'No access' });

    expect(res.status).toBe(403);
  });

  it('requires task access for time entries and totals', async () => {
    const owner = await createUser();
    const outsider = await createUser();
    const project = await createProject(owner);
    const task = await createTask(project);

    const entriesRes = await request(app)
      .get(`/api/v1/time/task/${task._id}/entries`)
      .set('Cookie', authCookieFor(outsider));
    expect(entriesRes.status).toBe(403);

    const totalRes = await request(app)
      .get(`/api/v1/time/task/${task._id}/total`)
      .set('Cookie', authCookieFor(outsider));
    expect(totalRes.status).toBe(403);
  });
});
