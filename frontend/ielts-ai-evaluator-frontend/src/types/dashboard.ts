// Types matching backend DashboardDto (Services/DashboardService.cs)
export interface DashboardRecentItem {
  id: string;
  type: "writing" | "speaking";
  topic: string;
  taskType: string; // Task1/Task2 for writing, Part1/Part2/Part3 for speaking
  overallBand: number;
  createdAt: string;
}

export interface DashboardBandPoint {
  createdAt: string;
  overallBand: number;
  type: "writing" | "speaking";
}

export interface DashboardData {
  writingCount: number;
  speakingCount: number;
  averageBand: number | null;
  bandTrend: DashboardBandPoint[];
  recentItems: DashboardRecentItem[];
}
