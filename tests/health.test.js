const request = require('supertest');
const app = require('../app');

describe('health and app wiring', () => {
  it('returns API health status', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.database).toBe('connected');
  });

  it('returns JSON 404 for unknown API routes', async () => {
    const res = await request(app).get('/api/v1/not-a-real-route');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      success: false,
      message: 'API Route Not Found',
    });
  });
});
