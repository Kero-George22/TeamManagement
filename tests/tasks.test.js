const request = require('supertest');
const app = require('../app');
const { authCookieFor, createUser } = require('./helpers/auth');
const { createProject, createTask } = require('./helpers/factories');

describe('tasks', () => {
  it('lets project owners create and list tasks', async () => {
    const owner = await createUser();
    const project = await createProject(owner);

    const createRes = await request(app)
      .post(`/api/v1/tasks/${project._id}`)
      .set('Cookie', authCookieFor(owner))
      .send({ title: 'Owner Task', assignedRole: 'Developer', priority: 'High' });
    expect(createRes.status).toBe(201);

    const listRes = await request(app)
      .get(`/api/v1/tasks/${project._id}`)
      .set('Cookie', authCookieFor(owner));
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.some((task) => task.title === 'Owner Task')).toBe(true);
  });

  it('enforces project membership for task access', async () => {
    const owner = await createUser();
    const outsider = await createUser();
    const project = await createProject(owner);

    const res = await request(app)
      .get(`/api/v1/tasks/${project._id}`)
      .set('Cookie', authCookieFor(outsider));

    expect(res.status).toBe(403);
  });

  it('returns board data for members and blocks non-members', async () => {
    const owner = await createUser();
    const member = await createUser();
    const outsider = await createUser();
    const project = await createProject(owner, {
      members: [{ userId: member._id, roleName: 'Developer', joinedAt: new Date() }],
      rolesRequired: [{ roleName: 'Developer', totalSlots: 2, filledSlots: 1 }],
    });
    await createTask(project, { title: 'Board Todo', status: 'Todo', assignedTo: [member._id] });
    await createTask(project, { title: 'Board Done', status: 'Done' });

    const memberRes = await request(app)
      .get(`/api/v1/tasks/${project._id}/board`)
      .set('Cookie', authCookieFor(member));
    expect(memberRes.status).toBe(200);
    expect(memberRes.body.data.map((group) => group.status)).toEqual(expect.arrayContaining(['Todo', 'Done']));

    const outsiderRes = await request(app)
      .get(`/api/v1/tasks/${project._id}/board`)
      .set('Cookie', authCookieFor(outsider));
    expect(outsiderRes.status).toBe(403);
  });

  it('enforces status update permissions', async () => {
    const owner = await createUser();
    const member = await createUser();
    const outsider = await createUser();
    const project = await createProject(owner, {
      members: [{ userId: member._id, roleName: 'Developer', joinedAt: new Date() }],
      rolesRequired: [{ roleName: 'Developer', totalSlots: 2, filledSlots: 1 }],
    });
    const task = await createTask(project, { assignedTo: [member._id] });

    const memberRes = await request(app)
      .patch(`/api/v1/tasks/task/${task._id}/status`)
      .set('Cookie', authCookieFor(member))
      .send({ status: 'In-Progress' });
    expect(memberRes.status).toBe(200);

    const outsiderRes = await request(app)
      .patch(`/api/v1/tasks/task/${task._id}/status`)
      .set('Cookie', authCookieFor(outsider))
      .send({ status: 'Done' });
    expect(outsiderRes.status).toBe(403);

    const ownerRes = await request(app)
      .patch(`/api/v1/tasks/task/${task._id}/status`)
      .set('Cookie', authCookieFor(owner))
      .send({ status: 'Approved' });
    expect(ownerRes.status).toBe(200);
  });

  it('requires task access for comments', async () => {
    const owner = await createUser();
    const outsider = await createUser();
    const project = await createProject(owner);
    const task = await createTask(project);

    const ownerRes = await request(app)
      .post(`/api/v1/tasks/task/${task._id}/comments`)
      .set('Cookie', authCookieFor(owner))
      .send({ text: 'Looks good' });
    expect(ownerRes.status).toBe(201);

    const outsiderRes = await request(app)
      .post(`/api/v1/tasks/task/${task._id}/comments`)
      .set('Cookie', authCookieFor(outsider))
      .send({ text: 'I should not be here' });
    expect(outsiderRes.status).toBe(403);
  });
});
