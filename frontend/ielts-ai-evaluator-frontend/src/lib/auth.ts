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
import { auth, googleProvider } from "./firebase";

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

  await refreshToken();
  console.log("User registered with full name in Firebase!");
};

export const signInWithEmail = async (email: string, password: string) => {
  await signInWithEmailAndPassword(auth, email, password);
};

export const signInWithGooglePopup = async () => {
  await signInWithPopup(auth, googleProvider);
};

export const signOutUser = () => signOut(auth);

export const sendResetPassword = async (email: string) => {
  console.log("Sending password reset email to:", email);
  await sendPasswordResetEmail(auth, email);
};

export const sendVerificationEmail = (user: any) => sendEmailVerification(user);

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

export const refreshToken = async (): Promise<void> => {
  // Prevent concurrent refresh calls
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  if (!auth.currentUser) {
    throw new Error("No authenticated user");
  }

  isRefreshing = true;

  refreshPromise = (async () => {
    try {
      const idToken = await auth.currentUser!.getIdToken(false);

      const response = await fetch(
        import.meta.env.VITE_API_BASE_URL + "/api/GetUserProfile",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseJson = await response.json();

      // Only force token refresh if backend indicates claims were updated
      if (responseJson.data.claimsUpdated) {
        await auth.currentUser!.getIdTokenResult(true);
        console.log("Custom claims updated");
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
      throw error;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};
