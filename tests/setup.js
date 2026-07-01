const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.GMAIL_USER = 'test@example.com';
process.env.GMAIL_PASS = 'test-password';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_AI_KEY = 'test-google-ai-key';
process.env.GLOBAL_RATE_LIMIT_MAX = '10000';
process.env.LOGIN_MAX_ATTEMPTS = '10000';
process.env.SIGNUP_MAX_ATTEMPTS = '10000';
process.env.AUTH_TOKEN_MAX_ATTEMPTS = '10000';
process.env.RESET_MAX_ATTEMPTS = '10000';

jest.mock('../utils/email.service', () => ({
  sendMail: jest.fn().mockResolvedValue({ ok: true }),
  verificationEmail: jest.fn().mockResolvedValue({ ok: true }),
  passwordResetEmail: jest.fn().mockResolvedValue({ ok: true }),
  passwordChangedEmail: jest.fn().mockResolvedValue({ ok: true }),
}));

jest.mock('../services/ai.manager', () => ({
  generateProjectPlan: jest.fn().mockResolvedValue({
    phases: [{
      name: 'Phase 1',
      milestone: 'MVP',
      tasks: [{
        title: 'Build API',
        description: 'Implement the API',
        assignedRole: 'Developer',
        priority: 'High',
        storyPoints: 5,
        dependsOnIndex: [],
      }],
    }],
    summary: 'Mock plan',
  }),
  reviewWorkByAI: jest.fn().mockResolvedValue({ rating: 90, review: 'Good', feedback: 'Ship it', codeQualityScore: 9 }),
  generateTaskInstructions: jest.fn().mockResolvedValue('Mock task instructions'),
  analyzeTeamPerformance: jest.fn().mockResolvedValue({ healthScore: 90, bottlenecks: [], recommendations: ['Keep going'], topPerformers: [] }),
  chatWithCopilot: jest.fn().mockResolvedValue('Mock copilot reply'),
  generateProjectStatus: jest.fn().mockResolvedValue({ summary: 'Mock status', generatedAt: new Date() }),
}));

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
