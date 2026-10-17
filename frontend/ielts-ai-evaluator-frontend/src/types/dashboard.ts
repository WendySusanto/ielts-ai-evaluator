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
  focus: DashboardFocus;
  /** Unmastered notebook words whose review is due now. */
  wordsDue: number;
}

/** The criterion pulling one skill's band down most, over its last 10 evaluations. */
export interface FocusCriterion {
  /** TaskAchievementResponse | CoherenceCohesion | LexicalResource | GrammaticalRangeAccuracy |
   * FluencyCoherence | Pronunciation */
  name: string;
  band: number;
  /** The latest advice the examiner model wrote for it; null when none was written. */
  tip: string | null;
}

/** A mistake category seen at least twice, with its most recent example. */
export interface FocusMistake {
  category: string;
  count: number;
  original: string;
  corrected: string;
}

export interface DashboardFocus {
  writing: FocusCriterion | null;
  speaking: FocusCriterion | null;
  mistakes: FocusMistake[];
}
