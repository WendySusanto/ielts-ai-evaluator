// Matches backend UserProfileDto (Services/UserService.cs) — used by GET /api/me and
// GET /api/manage/users (admin, read-only list).
export interface User {
  userId: string;
  email: string;
  fullName: string;
  plan: string;
  ieltsTargetScore: number | null;
  targetTestDate: string | null;
  createdAt: string;
}

// Body for PUT /api/me
export interface UpdateProfileRequest {
  fullName: string;
  ieltsTargetScore: number;
  targetTestDate: string;
}
