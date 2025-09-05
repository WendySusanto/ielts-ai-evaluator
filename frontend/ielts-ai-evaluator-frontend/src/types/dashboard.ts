export interface DashboardEvaluationItem {
  essayEvaluationId: string;
  taskType: string;
  topic: string;
  overallBand: number;
  createdAt: string;
  evaluationType: string;
}

export interface DashboardUserStats {
  userId: string;
  fullName: string;
  email: string;
  plan: string;
  ieltsTargetScore: number;
  ieltsTargetType: string;
  targetTestDate?: string;
  memberSince: string;
}

export interface DashboardQuickStats {
  totalEvaluations: number;
  writingQuotaUsed: number;
  speakingQuotaUsed: number;
  averageBand: number;
  lastEvaluationDate?: string;
  progressToTarget: number;
  daysStreak: number;
}

export interface DashboardData {
  userStats: DashboardUserStats;
  recentEvaluations: DashboardEvaluationItem[];
  quickStats: DashboardQuickStats;
}
