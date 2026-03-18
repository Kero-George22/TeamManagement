/**
 * Level Calculation Utility
 * XP thresholds: Each level requires 1000 base XP with 10% increase per level
 * Level 1: 0-1000 XP
 * Level 2: 1001-2100 XP (1000 * 1.1)
 * Level 3: 2101-3310 XP (1100 * 1.1)
 * etc.
 */

const BADGES = {
  FIRST_TASK: {
    id: 'FIRST_TASK',
    name: 'First Task',
    description: 'Complete your first task',
    icon: '🎯'
  },
  FIVE_TASKS: {
    id: 'FIVE_TASKS',
    name: 'Task Enthusiast',
    description: 'Complete 5 tasks',
    icon: '⭐'
  },
  TEN_TASKS: {
    id: 'TEN_TASKS',
    name: 'Task Master',
    description: 'Complete 10 tasks',
    icon: '🏆'
  },
  TWENTY_TASKS: {
    id: 'TWENTY_TASKS',
    name: 'Legendary Developer',
    description: 'Complete 20 tasks',
    icon: '👑'
  },
  PERFECT_SCORE: {
    id: 'PERFECT_SCORE',
    name: 'Perfect Code',
    description: 'Achieve 100 score on AI review',
    icon: '💎'
  },
  SPEED_DEMON: {
    id: 'SPEED_DEMON',
    name: 'Speed Demon',
    description: 'Complete a task within 1 hour',
    icon: '⚡'
  },
  COLLABORATOR: {
    id: 'COLLABORATOR',
    name: 'Collaborator',
    description: 'Complete a task with 3+ collaborators',
    icon: '🤝'
  },
  LEVEL_5: {
    id: 'LEVEL_5',
    name: 'Level 5',
    description: 'Reach Level 5',
    icon: '📈'
  },
  LEVEL_10: {
    id: 'LEVEL_10',
    name: 'Decennial',
    description: 'Reach Level 10',
    icon: '🌟'
  }
};

// Calculate cumulative XP required for each level
function calculateXPRequirement(level) {
  if (level <= 1) return 0;
  let xp = 0;
  let baseXP = 1000;
  for (let i = 1; i < level; i++) {
    xp += baseXP;
    baseXP = Math.floor(baseXP * 1.1);
  }
  return xp;
}

// Get current level based on total XP
function getLevelFromXP(totalXP) {
  let level = 1;
  while (calculateXPRequirement(level + 1) <= totalXP) {
    level++;
  }
  return level;
}

// Get progress to next level
function getProgressToNextLevel(totalXP) {
  const currentLevel = getLevelFromXP(totalXP);
  const currentLevelXP = calculateXPRequirement(currentLevel);
  const nextLevelXP = calculateXPRequirement(currentLevel + 1);
  const progressXP = totalXP - currentLevelXP;
  const requiredXP = nextLevelXP - currentLevelXP;
  
  return {
    currentLevel,
    currentLevelXP,
    nextLevelXP,
    progressXP,
    requiredXP,
    percentProgress: Math.round((progressXP / requiredXP) * 100)
  };
}

// Determine earned badges based on user stats
function determineEarnedBadges(user) {
  const earned = [];

  if (user.completedTasks >= 1) {
    earned.push(BADGES.FIRST_TASK.id);
  }
  if (user.completedTasks >= 5) {
    earned.push(BADGES.FIVE_TASKS.id);
  }
  if (user.completedTasks >= 10) {
    earned.push(BADGES.TEN_TASKS.id);
  }
  if (user.completedTasks >= 20) {
    earned.push(BADGES.TWENTY_TASKS.id);
  }

  const currentLevel = getLevelFromXP(user.totalXP || 0);
  if (currentLevel >= 5) {
    earned.push(BADGES.LEVEL_5.id);
  }
  if (currentLevel >= 10) {
    earned.push(BADGES.LEVEL_10.id);
  }

  return earned;
}

module.exports = {
  BADGES,
  calculateXPRequirement,
  getLevelFromXP,
  getProgressToNextLevel,
  determineEarnedBadges
};
