const request = require('supertest');
const app = require('../app');
const Project = require('../models/project.model');
const { authCookieFor, createUser } = require('./helpers/auth');
const { createProject } = require('./helpers/factories');

function projectPayload(overrides = {}) {
  return {
    title: 'API Project',
    description: 'Created from tests',
    startDate: new Date().toISOString(),
    duration: 10,
    rolesRequired: [{ roleName: 'Developer', totalSlots: 2 }],
    category: 'Software Development',
    language: 'JavaScript',
    ...overrides,
  };
}

describe('projects and permissions', () => {
  it('requires auth for project routes', async () => {
    const res = await request(app).get('/api/v1/projects');
    expect(res.status).toBe(401);
  });

  it('lets an authenticated user create a project', async () => {
    const owner = await createUser();

    const res = await request(app)
      .post('/api/v1/projects')
      .set('Cookie', authCookieFor(owner))
      .send(projectPayload());

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('API Project');
    expect(res.body.data.rolesRequired[0].roleName).toBe('Developer');
  });

  it('allows owners to view, update, and delete their project', async () => {
    const owner = await createUser();
    const project = await createProject(owner);

    const getRes = await request(app)
      .get(`/api/v1/projects/${project._id}`)
      .set('Cookie', authCookieFor(owner));
    expect(getRes.status).toBe(200);

    const updateRes = await request(app)
      .put(`/api/v1/projects/${project._id}`)
      .set('Cookie', authCookieFor(owner))
      .send({ title: 'Updated Project' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.title).toBe('Updated Project');

    const deleteRes = await request(app)
      .delete(`/api/v1/projects/${project._id}`)
      .set('Cookie', authCookieFor(owner));
    expect(deleteRes.status).toBe(200);
    expect(await Project.findById(project._id)).toBeNull();
  });

  it('blocks non-owners from updating or deleting another user project', async () => {
    const owner = await createUser();
    const other = await createUser();
    const project = await createProject(owner);

    const updateRes = await request(app)
      .put(`/api/v1/projects/${project._id}`)
      .set('Cookie', authCookieFor(other))
      .send({ title: 'Nope' });
    expect(updateRes.status).toBe(403);

    const deleteRes = await request(app)
      .delete(`/api/v1/projects/${project._id}`)
      .set('Cookie', authCookieFor(other));
    expect(deleteRes.status).toBe(403);
  });

  it('blocks private projects from non-members', async () => {
    const owner = await createUser();
    const outsider = await createUser();
    const project = await createProject(owner, { isPrivate: true });

    const res = await request(app)
      .get(`/api/v1/projects/${project._id}`)
      .set('Cookie', authCookieFor(outsider));

    expect(res.status).toBe(403);
  });

  it('creates public join requests and lets owners accept them', async () => {
    const owner = await createUser();
    const requester = await createUser({ username: 'Requester' });
    const project = await createProject(owner);

    const joinRes = await request(app)
      .post(`/api/v1/projects/${project._id}/join`)
      .set('Cookie', authCookieFor(requester))
      .send({ roleName: 'Developer' });
    expect(joinRes.status).toBe(200);

    const withRequest = await Project.findById(project._id).lean();
    const requestId = withRequest.joinRequests[0]._id;

    const acceptRes = await request(app)
      .patch(`/api/v1/projects/${project._id}/join-requests/${requestId}`)
      .set('Cookie', authCookieFor(owner))
      .send({ action: 'accept' });
    expect(acceptRes.status).toBe(200);

    const updated = await Project.findById(project._id).lean();
    expect(updated.members.some((member) => String(member.userId) === String(requester._id))).toBe(true);
  });
});
