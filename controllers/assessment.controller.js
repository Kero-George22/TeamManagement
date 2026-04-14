const Assessment = require('../models/assessment.model');
const User = require('../models/user.model');
const asyncWrapper = require('../utils/asyncWrapper');
const { success, error } = require('../utils/apiResponse');

// Assessment questions database
const assessmentQuestions = {
    Frontend: [
        {
            question: "What does the Virtual DOM in React do?",
            options: [
                "It stores HTML in memory for faster access",
                "It's a JavaScript representation of the real DOM used for optimization",
                "It's a separate browser feature for rendering",
                "It replaces the real DOM completely"
            ],
            correctAnswer: 1
        },
        {
            question: "What is the purpose of useState in React?",
            options: [
                "To manage component styling",
                "To manage component state and trigger re-renders",
                "To handle component mounting",
                "To manage component props"
            ],
            correctAnswer: 1
        },
        {
            question: "How do you pass data from parent to child component in React?",
            options: [
                "Through context API only",
                "Through props",
                "Through Redux only",
                "Through local storage"
            ],
            correctAnswer: 1
        },
        {
            question: "What is CSS flexbox used for?",
            options: [
                "Creating responsive layouts and aligning elements",
                "Adding animations to elements",
                "Managing JavaScript state",
                "Creating server-side templates"
            ],
            correctAnswer: 0
        },
        {
            question: "What is the difference between let and const in JavaScript?",
            options: [
                "No difference, they're the same",
                "let is function-scoped, const is block-scoped",
                "const is block-scoped and cannot be reassigned, let is block-scoped and can be reassigned",
                "const is faster than let"
            ],
            correctAnswer: 2
        }
    ],
    Backend: [
        {
            question: "What is REST API?",
            options: [
                "A database query language",
                "An architectural style for designing networked applications using HTTP methods",
                "A programming language",
                "A server-side framework"
            ],
            correctAnswer: 1
        },
        {
            question: "What does CRUD stand for?",
            options: [
                "Create, Read, Update, Delete",
                "Cache, Request, Update, Deploy",
                "Code, Respond, Use, Deploy",
                "Configure, Route, Update, Debug"
            ],
            correctAnswer: 0
        },
        {
            question: "What is middleware in Express.js?",
            options: [
                "A database layer",
                "Functions that have access to request, response, and next function in the application's request-response cycle",
                "A template engine",
                "A caching system"
            ],
            correctAnswer: 1
        },
        {
            question: "What is normalization in databases?",
            options: [
                "Storing data in multiple databases",
                "Organizing data to reduce redundancy and improve data integrity",
                "Converting data to JSON format",
                "Encrypting database records"
            ],
            correctAnswer: 1
        },
        {
            question: "What is the difference between SQL and NoSQL?",
            options: [
                "SQL is faster",
                "NoSQL is newer so it's better",
                "SQL uses tables and relational data, NoSQL uses flexible document structures",
                "They are the same technology"
            ],
            correctAnswer: 2
        }
    ],
    FullStack: [
        {
            question: "What is the purpose of package.json in Node.js projects?",
            options: [
                "It stores database credentials",
                "It defines project metadata, dependencies, and scripts",
                "It's only for frontend projects",
                "It configures the web server"
            ],
            correctAnswer: 1
        },
        {
            question: "What is JWT (JSON Web Token) used for?",
            options: [
                "Storing data in JSON format",
                "Authentication and authorization across stateless systems",
                "Replacing databases",
                "Client-side storage only"
            ],
            correctAnswer: 1
        },
        {
            question: "What is the difference between authentication and authorization?",
            options: [
                "They are the same thing",
                "Authentication verifies who you are, authorization determines what you can access",
                "Authorization happens first",
                "They only apply to backend systems"
            ],
            correctAnswer: 1
        },
        {
            question: "What is CORS and why is it important?",
            options: [
                "A server configuration issue",
                "A security feature that controls how resources are shared across different origins",
                "A database optimization technique",
                "Only relevant for mobile apps"
            ],
            correctAnswer: 1
        },
        {
            question: "What is the purpose of environment variables?",
            options: [
                "To store large amounts of data",
                "To configure applications for different environments without changing code",
                "To improve code performance",
                "To replace functions"
            ],
            correctAnswer: 1
        }
    ]
};

// Get assessment questions
const getAssessmentQuestions = asyncWrapper(async (req, res) => {
    const { skillArea } = req.params;
    
    if (!assessmentQuestions[skillArea]) {
        return error(res, 'Invalid skill area', 400);
    }

    // Return questions without answers
    const questionsWithoutAnswers = assessmentQuestions[skillArea].map(q => ({
        question: q.question,
        options: q.options
    }));

    return success(res, { questions: questionsWithoutAnswers }, 'Assessment questions retrieved');
});

// Start assessment
const startAssessment = asyncWrapper(async (req, res) => {
    const userId = req.user._id;
    const { skillArea } = req.body;

    if (!assessmentQuestions[skillArea]) {
        return error(res, 'Invalid skill area', 400);
    }

    const questions = assessmentQuestions[skillArea].map(q => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer
    }));

    const assessment = new Assessment({
        userId,
        skillArea,
        questions,
        status: 'in-progress',
        startedAt: new Date()
    });

    await assessment.save();

    return success(res, { assessmentId: assessment._id, skillArea }, 'Assessment started');
});

// Submit assessment answers
const submitAssessment = asyncWrapper(async (req, res) => {
    const userId = req.user._id;
    const { assessmentId, answers } = req.body;

    if (!assessmentId || !answers || !Array.isArray(answers)) {
        return error(res, 'Assessment ID and answers array required', 400);
    }

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
        return error(res, 'Assessment not found', 404);
    }

    if (assessment.userId.toString() !== userId.toString()) {
        return error(res, 'Unauthorized', 403);
    }

    // Calculate score
    let correctCount = 0;
    assessment.questions.forEach((q, index) => {
        if (answers[index] !== undefined) {
            q.userAnswer = answers[index];
            q.isCorrect = answers[index] === q.correctAnswer;
            if (q.isCorrect) correctCount++;
        }
    });

    const percentage = Math.round((correctCount / assessment.questions.length) * 100);
    const score = correctCount;

    // Determine level based on percentage
    let determinedLevel = 'Beginner';
    if (percentage >= 80) determinedLevel = 'Expert';
    else if (percentage >= 65) determinedLevel = 'Advanced';
    else if (percentage >= 50) determinedLevel = 'Intermediate';

    assessment.score = score;
    assessment.percentage = percentage;
    assessment.determinedLevel = determinedLevel;
    assessment.status = 'completed';
    assessment.completedAt = new Date();

    await assessment.save();

    // Update user's skill level if they passed (>=50%)
    if (percentage >= 50) {
        const skillKey = `skills.${assessment.skillArea}`;
        await User.findByIdAndUpdate(userId, {
            [skillKey]: {
                level: determinedLevel,
                lastAssessmentDate: new Date(),
                assessmentId: assessment._id,
                score: percentage
            }
        });
    }

    return success(res, {
        assessmentId: assessment._id,
        skillArea: assessment.skillArea,
        score,
        percentage,
        determinedLevel,
        passed: percentage >= 50
    }, 'Assessment submitted successfully');
});

// Get user's assessment history
const getUserAssessments = asyncWrapper(async (req, res) => {
    const userId = req.user._id;
    const { skillArea, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const query = { userId };
    if (skillArea) query.skillArea = skillArea;

    const [assessments, total] = await Promise.all([
      Assessment.find(query)
        .select('-questions')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Assessment.countDocuments(query),
    ]);

    return success(res, {
      assessments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    }, 'User assessments retrieved');
});

// Get specific assessment result
const getAssessmentResult = asyncWrapper(async (req, res) => {
    const userId = req.user._id;
    const { assessmentId } = req.params;

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
        return error(res, 'Assessment not found', 404);
    }

    if (assessment.userId.toString() !== userId.toString() && !req.user.isAdmin) {
        return error(res, 'Unauthorized', 403);
    }

    // Include correct answers and explanations
    const result = {
        _id: assessment._id,
        skillArea: assessment.skillArea,
        score: assessment.score,
        percentage: assessment.percentage,
        determinedLevel: assessment.determinedLevel,
        status: assessment.status,
        completedAt: assessment.completedAt,
        questions: assessment.questions.map(q => ({
            question: q.question,
            options: q.options,
            userAnswer: q.userAnswer,
            correctAnswer: q.correctAnswer,
            isCorrect: q.isCorrect
        }))
    };

    return success(res, result, 'Assessment result retrieved');
});

module.exports = {
    getAssessmentQuestions,
    startAssessment,
    submitAssessment,
    getUserAssessments,
    getAssessmentResult
};
