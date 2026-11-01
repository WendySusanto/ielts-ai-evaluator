// Matches backend UserProfileDto (Services/UserService.cs) — used by GET /api/me.
export interface User {
  userId: string;
  email: string;
  fullName: string;
  plan: string;
  ieltsTargetScore: number | null;
  targetTestDate: string | null;
  createdAt: string;
}

// Matches backend AdminUserDto — GET /api/manage/users (admin, read-only list).
export interface AdminUser extends User {
  /** Speech tokens issued since UTC midnight: ~4 per session, capped at 30/hour, so near 30 means
   * someone is pulling tokens. Counts requests, not spend. */
  speechTokensToday: number;
  /** Gemini prompt + completion tokens since UTC midnight, across writing evaluations, speaking
   * evaluations and live examiner turns. Unlike speechTokensToday this is real billed usage. */
  geminiTokensToday: number;
}

// Body for PUT /api/me
export interface UpdateProfileRequest {
  fullName: string;
  ieltsTargetScore: number;
  targetTestDate: string;
}
