const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    skillArea: {
        type: String,
        enum: ['Frontend', 'Backend', 'FullStack', 'DevOps', 'DataScience'],
        required: true
    },
    questions: [{
        question: String,
        options: [String],
        correctAnswer: Number,
        userAnswer: Number,
        isCorrect: Boolean
    }],
    score: {
        type: Number,
        default: 0
    },
    maxScore: {
        type: Number,
        default: 100
    },
    percentage: {
        type: Number,
        default: 0
    },
    determinedLevel: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
        default: 'Beginner'
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed'],
        default: 'pending'
    },
    startedAt: Date,
    completedAt: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Assessment', assessmentSchema);
