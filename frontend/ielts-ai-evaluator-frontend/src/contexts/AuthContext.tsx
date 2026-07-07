import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { toast } from "sonner";
import { auth } from "../lib/firebase";
import * as authService from "../lib/auth";

interface UserWithCustomClaims extends FirebaseUser {
  role?: string;
  userId?: string;
}

type AuthContextType = {
  user: UserWithCustomClaims | null;
  loading: boolean;
  role: string;
  signUp: (email: string, password: string, fullName: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserWithCustomClaims | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          await authService.syncProfile();
        } catch {
          toast.error("Could not sync your account. Some features may not work.");
        }

        const tokenResult = await firebaseUser.getIdTokenResult();

        const userWithClaims: UserWithCustomClaims = {
          ...firebaseUser,
          role: (tokenResult.claims.role as string) || "",
          userId: (tokenResult.claims.userId as string) || "",
        };

        setUser(userWithClaims);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    role: user?.role || "Free",
    signUp: authService.signUpWithEmail,
    signIn: authService.signInWithEmail,
    signInWithGoogle: authService.signInWithGooglePopup,
    signOut: authService.signOutUser,
    sendPasswordReset: authService.sendResetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
