export interface User {
  userId?: string;
  email: string;
  firebaseUid: string;
  authProvider: string;
  plan?: string;
  writingQuotaUsed?: number;
  speakingQuotaUsed?: number;
  ieltsTargetType?: string;
  ieltsTargetScore?: number;
  targetTestDate?: string;
  dateTimeOffset?: number;
}
