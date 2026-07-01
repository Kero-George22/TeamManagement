const crypto = require('crypto');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/user.model');
const { createUser } = require('./helpers/auth');

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function cookiesNamed(res, name) {
  return (res.headers['set-cookie'] || []).filter((cookie) => cookie.startsWith(`${name}=`));
}

describe('auth', () => {
  it('signs up an unverified user without returning password or JWT body token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'new-user@example.com', password: 'Password123!' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ email: 'new-user@example.com' });
    expect(res.body.data.password).toBeUndefined();
    expect(res.body.data.token).toBeUndefined();

    const user = await User.findOne({ email: 'new-user@example.com' }).lean();
    expect(user).toBeTruthy();
    expect(user.isVerified).toBe(false);
  });

  it('verifies email with a valid verification token', async () => {
    const token = '123456';
    const user = await createUser({
      email: 'verify-me@example.com',
      isVerified: false,
    });
    user.verificationToken = hashToken(token);
    user.verificationTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const res = await request(app)
      .post('/api/v1/auth/verify')
      .send({ token });

    expect(res.status).toBe(200);
    const updated = await User.findById(user._id).lean();
    expect(updated.isVerified).toBe(true);
    expect(updated.verificationToken).toBeUndefined();
  });

  it('logs in verified users with httpOnly cookies and no JWT body token', async () => {
    await createUser({
      email: 'login@example.com',
      password: 'Password123!',
      isVerified: true,
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'login@example.com', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeUndefined();
    expect(cookiesNamed(res, 'accessToken')[0]).toContain('HttpOnly');
    expect(cookiesNamed(res, 'refreshToken')[0]).toContain('HttpOnly');
  });

  it('rejects invalid credentials and unverified users', async () => {
    await createUser({
      email: 'unverified@example.com',
      password: 'Password123!',
      isVerified: false,
    });

    const wrongPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'unverified@example.com', password: 'WrongPassword123!' });
    expect(wrongPassword.status).toBe(401);

    const unverified = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'unverified@example.com', password: 'Password123!' });
    expect(unverified.status).toBe(401);
  });

  it('refreshes access cookies without returning a raw JWT', async () => {
    const user = await createUser({ email: 'refresh@example.com' });
    const refreshToken = jwt.sign({ sub: String(user._id) }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    user.refreshTokens = [hashToken(refreshToken)];
    await user.save();

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [`refreshToken=${refreshToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeUndefined();
    expect(cookiesNamed(res, 'accessToken')[0]).toContain('HttpOnly');
  });

  it('clears auth cookies on logout', async () => {
    const res = await request(app).post('/api/v1/auth/logout');

    expect(res.status).toBe(200);
    expect(cookiesNamed(res, 'accessToken')[0]).toContain('accessToken=;');
    expect(cookiesNamed(res, 'refreshToken')[0]).toContain('refreshToken=;');
  });
});
