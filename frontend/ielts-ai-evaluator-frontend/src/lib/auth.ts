// src/lib/auth.ts
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  updateProfile,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth, googleProvider } from "./firebase";
import { api } from "./api";

// Firebase throws FirebaseError; anything else (network, bugs) has no code and
// falls through to the caller's generic message.
export const authErrorCode = (err: unknown): string =>
  err instanceof FirebaseError ? err.code : "";

export const signUpWithEmail = async (
  email: string,
  password: string,
  fullName: string
) => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  const user = userCredential.user;
  // 2. Update Firebase profile with displayName
  await updateProfile(user, {
    displayName: fullName,
  });

  await syncProfile();
};

export const signInWithEmail = async (email: string, password: string) => {
  await signInWithEmailAndPassword(auth, email, password);
};

export const signInWithGooglePopup = async () => {
  await signInWithPopup(auth, googleProvider);
};

export const signOutUser = () => signOut(auth);

export const sendResetPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

export const sendVerificationEmail = (user: any) => sendEmailVerification(user);

export interface AuthProfile {
  userId: string;
  email: string;
  fullName: string;
  plan: string;
  ieltsTargetScore: number | null;
  targetTestDate: string | null;
  claimsRefreshRequired: boolean;
}

let isRefreshing = false;
let refreshPromise: Promise<AuthProfile> | null = null;

export const syncProfile = async (): Promise<AuthProfile> => {
  // Prevent concurrent sync calls
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  if (!auth.currentUser) {
    throw new Error("No authenticated user");
  }

  isRefreshing = true;

  refreshPromise = (async () => {
    try {
      const profile = await api.post<AuthProfile>("/api/auth/sync");

      // Only force token refresh if backend just (re)set custom claims
      if (profile.claimsRefreshRequired) {
        await auth.currentUser!.getIdToken(true);
      }

      return profile;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};
