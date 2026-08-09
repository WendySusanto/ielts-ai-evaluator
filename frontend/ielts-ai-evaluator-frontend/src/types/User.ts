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
  /** Azure Speech tokens handed to this user since UTC midnight. A session takes ~4 and the
   * backend caps it at 30/hour, so a number near 30 means someone is pulling tokens, not
   * practising. It counts requests, not spend — the TTS/STT calls bypass our backend. */
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
