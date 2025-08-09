export default interface User {
  userId: string;
  email: string;
  authProvider: "Email" | "Google";
  plan: string;
  writingQuotaUsed: number;
  speakingQuotaUsed: number;
  ieltsTargetType: string;
  ieltsTargetScore: number;
  targetTestDate: string;
}
