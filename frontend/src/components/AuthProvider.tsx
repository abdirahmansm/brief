"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { upsertUserProfile } from "@/lib/userStore";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  pendingVerificationEmail: string | null;
  clearPendingVerification: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  pendingVerificationEmail: null,
  clearPendingVerification: () => {},
  signIn: async () => {},
  signUp: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const googleProvider = new GoogleAuthProvider();

function isVerifiedUser(user: User): boolean {
  const googleSignIn = user.providerData.some(
    (provider) => provider.providerId === "google.com"
  );
  return user.emailVerified || googleSignIn;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      if (!isVerifiedUser(firebaseUser)) {
        setPendingVerificationEmail(firebaseUser.email ?? null);
        setUser(null);
        setLoading(false);
        await firebaseSignOut(auth);
        return;
      }

      setPendingVerificationEmail(null);
      setUser(firebaseUser);
      setLoading(false);

      // Persist profile metadata for verified users only.
      try {
        await upsertUserProfile(firebaseUser);
      } catch (error) {
        console.error("Failed to upsert user profile", error);
      }
    });
    return unsubscribe;
  }, []);

  const clearPendingVerification = () => setPendingVerificationEmail(null);

  const signIn = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    if (!isVerifiedUser(cred.user)) {
      setPendingVerificationEmail(cred.user.email ?? email);
      await firebaseSignOut(auth);
      throw { code: "auth/email-not-verified" };
    }
  };

  const signUp = async (email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(cred.user);
    setPendingVerificationEmail(cred.user.email ?? email);
    await firebaseSignOut(auth);
  };

  const signInWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    if (!isVerifiedUser(cred.user)) {
      await firebaseSignOut(auth);
      throw { code: "auth/email-not-verified" };
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, pendingVerificationEmail, clearPendingVerification, signIn, signUp, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
