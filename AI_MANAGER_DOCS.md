# AI Project Manager System

The AI manager acts as a real project manager who:

## Features

### 1. **AI Task Assignment** - The manager creates tasks for the project
```
POST /tasks/:projectId/ai-generate
```
- AI analyzes project needs
- Creates concrete, actionable tasks for each role
- Generates detailed instructions for each task
- Sets priorities and clear deliverables

### 2. **Task Claims** - Team members take responsibility
```
POST /tasks/:taskId/claim
```
- User claims a task to work on
- Task status changes to "In-Progress"
- Task assigned to the claiming user

### 3. **Work Submission** - Team members submit their work
```
POST /tasks/:taskId/submit
{
  "submittedWork": "Description of what was done..."
}
```
- User describes their work completion
- Task status changes to "Review"
- AI manager will review this

### 4. **AI Manager Review** - The manager reviews submitted work
```
POST /tasks/:taskId/request-review
```
- AI analyzes the submitted work against task requirements
- Provides a quality rating (0-100)
- Gives feedback and improvement suggestions
- If rating >= 70: Task marked "Done"
- If rating < 70: Task returns to "In-Progress" with feedback

### 5. **Team Performance Analysis** - Manager reviews overall performance
```
GET /tasks/:projectId/performance
```
- Shows task completion stats
- Average quality rating
- AI insights on team performance
- Recommendations for improvement

## How It Works

1. **Admin creates project** → Defines roles and slots needed
2. **AI generates tasks** → Creates specific tasks for each role
3. **Team members join project** → Assigned to roles
4. **Team claims tasks** → Each person takes a task
5. **Team submits work** → Describes what they completed
6. **AI reviews work** → Rates quality, gives feedback
7. **AI provides insights** → Analyzes team performance

## Example Flow

```
Admin creates project "Mobile App"
  ↓
AI generates 5 tasks (Frontend, Backend, Design, etc.)
  ↓
Team members join and claim tasks
  ↓
Each person works and submits their work
  ↓
AI reviews each submission (rates 0-100)
  ↓
Team sees feedback and can resubmit if needed
  ↓
Completed work gets recorded
  ↓
AI provides performance insights for the team
```

## Environment Setup

Add to `.env`:
```
GOOGLE_AI_KEY=your_gemini_api_key
```

## Database Fields

Tasks now track:
- `aiInstructions`: AI-generated task details
- `submittedWork`: User's work submission
- `aiReview`: AI's review feedback
- `aiRating`: Quality score (0-100)
- `feedback`: Specific improvement suggestions
- `status`: Todo → In-Progress → Review → Done
