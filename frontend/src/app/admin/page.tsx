"use client";

import AuthPage from "@/components/AuthPage";
import AdminConsole from "@/components/AdminConsole";
import { useAuth } from "@/components/AuthProvider";
import { useResearch } from "@/hooks/useResearch";

export default function AdminPage() {
  const { user, loading, signOut } = useAuth();
  const { sessions } = useResearch(user);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage authIntent="admin" />;
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <AdminConsole
        userEmail={user.email}
        sessions={sessions}
        onSignOut={signOut}
      />
    </div>
  );
}
