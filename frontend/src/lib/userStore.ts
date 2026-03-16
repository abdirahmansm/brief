import { type User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface UserProfileDoc {
  uid: string;
  plan: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  providerIds: string[];
  createdAt?: unknown;
  lastSeenAt: unknown;
}

export async function upsertUserProfile(user: User): Promise<void> {
  const ref = doc(db, "users", user.uid);
  const existing = await getDoc(ref);

  const profile: UserProfileDoc = {
    uid: user.uid,
    plan: "free",
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
    providerIds: user.providerData.map((provider) => provider.providerId),
    lastSeenAt: serverTimestamp(),
  };

  if (existing.exists()) {
    await setDoc(ref, profile, { merge: true });
    return;
  }

  await setDoc(
    ref,
    {
      ...profile,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}